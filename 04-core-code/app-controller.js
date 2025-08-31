// /04-core-code/app-controller.js

import { initialState } from './config/initial-state.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    constructor({ initialState, productFactory, configManager, eventAggregator, quoteService, calculationService, focusService, fileService }) {
        this.uiState = JSON.parse(JSON.stringify(initialState.ui));
        this.productFactory = productFactory;
        this.configManager = configManager;
        this.eventAggregator = eventAggregator;
        this.quoteService = quoteService;
        this.calculationService = calculationService;
        this.focusService = focusService;
        this.fileService = fileService;
        this.autoSaveTimerId = null;
        console.log("AppController (Stabilization rev.19) Initialized.");
        this.initialize();
    }

    initialize() {
        this.eventAggregator.subscribe('numericKeyPressed', (data) => this._handleNumericKeyPress(data.key));
        this.eventAggregator.subscribe('tableCellClicked', (data) => this._handleTableCellClick(data));
        this.eventAggregator.subscribe('sequenceCellClicked', (data) => this._handleSequenceCellClick(data));
        this.eventAggregator.subscribe('userRequestedInsertRow', () => this._handleInsertRow());
        this.eventAggregator.subscribe('userRequestedDeleteRow', () => this._handleDeleteRow());
        this.eventAggregator.subscribe('userRequestedSave', () => this._handleSaveToFile());
        this.eventAggregator.subscribe('fileLoaded', (data) => this._handleFileLoad(data));
        this.eventAggregator.subscribe('userRequestedExportCSV', () => this._handleExportCSV());
        this.eventAggregator.subscribe('userRequestedReset', () => this._handleReset());
        this.eventAggregator.subscribe('userRequestedClearRow', () => this._handleClearRow());
        this.eventAggregator.subscribe('userMovedActiveCell', (data) => this._handleMoveActiveCell(data));
        this.eventAggregator.subscribe('userRequestedCycleType', () => this._handleCycleType());
        this.eventAggregator.subscribe('userRequestedCalculateAndSum', () => this._handleCalculateAndSum());
        this._startAutoSave();
    }
    
    _getFullState() {
        return {
            ui: this.uiState,
            quoteData: this.quoteService.getQuoteData()
        };
    }
    
    publishInitialState() { this._publishStateChange(); }
    _publishStateChange() {
        console.log("Publishing stateChanged with new state:", this._getFullState());
        this.eventAggregator.publish('stateChanged', this._getFullState());
    }

    // --- 以下為添加了偵錯日誌的事件處理函式 ---

    _handleReset() {
        console.log("AppController handling: userRequestedReset");
        if (window.confirm("This will clear all data. Are you sure?")) {
            this.quoteService.reset();
            this.uiState = JSON.parse(JSON.stringify(initialState.ui)); 
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: 'Quote has been reset.' });
        }
    }

    _handleNumericKeyPress(key) {
        console.log("AppController handling: numericKeyPressed with key:", key);
        if (!isNaN(parseInt(key))) {
            this.uiState.inputValue += key;
            this._publishStateChange();
        } else if (key === 'DEL') {
            this.uiState.inputValue = this.uiState.inputValue.slice(0, -1);
            this._publishStateChange();
        } else if (key === 'W' || key === 'H') {
            const column = key === 'W' ? 'width' : 'height';
            this.uiState = this.focusService.focusFirstEmptyCell(this.uiState, this.quoteService.getQuoteData(), column);
            this._publishStateChange();
        } else if (key === 'ENT') {
            this._commitValue();
        }
    }

    _handleMoveActiveCell({ direction }) {
        console.log("AppController handling: userMovedActiveCell with direction:", direction);
        this.uiState = this.focusService.moveActiveCell(this.uiState, this.quoteService.getQuoteData(), direction);
        this._publishStateChange();
    }
    
    _handleTableCellClick({ rowIndex, column }) {
        console.log("AppController handling: tableCellClicked at:", { rowIndex, column });
        const item = this.quoteService.getQuoteData().rollerBlindItems[rowIndex];
        if (!item) return;

        this.uiState.selectedRowIndex = null;
        if (column === 'width' || column === 'height') {
            this.uiState.activeCell = { rowIndex, column };
            this.uiState.inputMode = column;
            this.uiState.inputValue = String(item[column] || '');
        } else if (column === 'TYPE') {
            this.uiState.activeCell = { rowIndex, column };
            const changed = this.quoteService.cycleItemType(rowIndex);
            if(changed) {
                this.uiState.isSumOutdated = true;
            }
        }
        this._publishStateChange();
    }
    
    _handleSequenceCellClick({ rowIndex }) {
        console.log("AppController handling: sequenceCellClicked at row:", rowIndex);
        this.uiState.selectedRowIndex = (this.uiState.selectedRowIndex === rowIndex) ? null : rowIndex;
        this._publishStateChange();
    }

    _handleCycleType() {
        console.log("AppController handling: userRequestedCycleType");
        const items = this.quoteService.getQuoteData().rollerBlindItems;
        const eligibleItems = items.filter(item => item.width && item.height);
        if (eligibleItems.length === 0) return;
        const TYPE_SEQUENCE = ['BO', 'BO1', 'SN'];
        const firstType = eligibleItems[0].fabricType;
        const currentIndex = TYPE_SEQUENCE.indexOf(firstType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        let changed = false;
        items.forEach(item => {
            if (item.width && item.height) {
                if (item.fabricType !== nextType) {
                   item.fabricType = nextType;
                   item.linePrice = null;
                   changed = true;
                }
            }
        });
        if (changed) {
            this.uiState.isSumOutdated = true;
            this._publishStateChange();
        }
    }

    _commitValue() {
        console.log("AppController executing: _commitValue");
        const { inputValue, inputMode, activeCell } = this.uiState;
        const value = inputValue === '' ? null : parseInt(inputValue, 10);
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const validationRules = productStrategy.getValidationRules();
        const rule = validationRules[inputMode];
        if (rule && value !== null && (isNaN(value) || value < rule.min || value > rule.max)) {
            this.eventAggregator.publish('showNotification', { message: `${rule.name} must be between ${rule.min} and ${rule.max}.`, type: 'error' });
            this.uiState.inputValue = '';
            this._publishStateChange();
            return;
        }
        const changed = this.quoteService.updateItemValue(activeCell.rowIndex, activeCell.column, value);
        if (changed) {
            this.uiState.isSumOutdated = true;
        }
        this.uiState = this.focusService.focusAfterCommit(this.uiState, this.quoteService.getQuoteData());
        this._publishStateChange();
    }
    
    // --- 以下為功能正常的函式，保持原樣 ---
    _handleCalculateAndSum() { /* ... */ }
    _handleSaveToFile() { /* ... */ }
    _handleExportCSV() { /* ... */ }
    _handleFileLoad() { /* ... */ }
    _handleInsertRow() { /* ... */ }
    _handleDeleteRow() { /* ... */ }
    _handleClearRow() { /* ... */ }
    _startAutoSave() { /* ... */ }
    _handleAutoSave() { /* ... */ }
}