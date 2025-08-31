// /04-core-code/app-controller.js

import { dataToCsv, csvToData } from './utils/csv-parser.js';
import { initialState } from './config/initial-state.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    // [修改] 增加 focusService 依賴
    constructor({ initialState, productFactory, configManager, eventAggregator, quoteService, calculationService, focusService }) {
        this.uiState = JSON.parse(JSON.stringify(initialState.ui));
        this.productFactory = productFactory;
        this.configManager = configManager;
        this.eventAggregator = eventAggregator;
        this.quoteService = quoteService;
        this.calculationService = calculationService;
        this.focusService = focusService; // 儲存 FocusService 的實例
        this.autoSaveTimerId = null;
        console.log("AppController (Focus Refactored) Initialized.");
        this.initialize();
    }

    initialize() {
        // ... (事件訂閱維持不變) ...
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
    _publishStateChange() { this.eventAggregator.publish('stateChanged', this._getFullState()); }

    _handleNumericKeyPress(key) {
        if (!isNaN(parseInt(key))) {
            this.uiState.inputValue += key;
            this._publishStateChange();
        } else if (key === 'DEL') {
            this.uiState.inputValue = this.uiState.inputValue.slice(0, -1);
            this._publishStateChange();
        } else if (key === 'W' || key === 'H') {
            // [修改] 委派任務給 FocusService
            const column = key === 'W' ? 'width' : 'height';
            this.uiState = this.focusService.focusFirstEmptyCell(this.uiState, this.quoteService.getQuoteData(), column);
            this._publishStateChange();
        } else if (key === 'ENT') {
            this._commitValue();
        }
    }

    _handleMoveActiveCell({ direction }) {
        // [修改] 委派任務給 FocusService
        this.uiState = this.focusService.moveActiveCell(this.uiState, this.quoteService.getQuoteData(), direction);
        this._publishStateChange();
    }
    
    _handleDeleteRow() {
        const { selectedRowIndex } = this.uiState;
        if (selectedRowIndex === null) { /* ... */ return; }
        this.quoteService.deleteRow(selectedRowIndex);
        
        // [修改] 委派任務給 FocusService
        this.uiState = this.focusService.focusAfterDelete(this.uiState, this.quoteService.getQuoteData());
        this.uiState.selectedRowIndex = null;
        this.uiState.isSumOutdated = true;
        
        this._publishStateChange();
        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    _handleClearRow() {
        const { selectedRowIndex } = this.uiState;
        if (selectedRowIndex === null) { /* ... */ return; }
        
        // [修改] 委派任務給 FocusService
        this.uiState = this.focusService.focusAfterClear(this.uiState);
        
        this.quoteService.clearRow(selectedRowIndex); // 仍然需要 quoteService 來清除資料
        
        this.uiState.selectedRowIndex = null;
        this.uiState.isSumOutdated = true;
        this._publishStateChange();
    }

    _commitValue() {
        const { inputValue, activeCell } = this.uiState;
        const value = inputValue === '' ? null : parseInt(inputValue, 10);
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const validationRules = productStrategy.getValidationRules();
        const rule = validationRules[activeCell.column];
        if (rule && value !== null && (isNaN(value) || value < rule.min || value > rule.max)) {
            /* ... */
            return;
        }
        const changed = this.quoteService.updateItemValue(activeCell.rowIndex, activeCell.column, value);
        if (changed) {
            this.uiState.isSumOutdated = true;
        }
        
        // [修改] 委派任務給 FocusService
        this.uiState = this.focusService.focusAfterCommit(this.uiState, this.quoteService.getQuoteData());
        this._publishStateChange();
    }
    
    _handleInsertRow() {
        const { selectedRowIndex } = this.uiState;
        if (selectedRowIndex === null) { /* ... */ return; }
        const newRowIndex = this.quoteService.insertRow(selectedRowIndex);
        
        // [修改] 焦點管理現在更簡單
        this.uiState.activeCell = { rowIndex: newRowIndex, column: 'width' };
        this.uiState.inputMode = 'width';
        this.uiState.selectedRowIndex = null;
        
        this._publishStateChange();
        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    // --- 以下方法大多維持不變 ---
    _handleCalculateAndSum() {
        const currentQuoteData = this.quoteService.getQuoteData();
        const { updatedQuoteData, firstError } = this.calculationService.calculateAndSum(currentQuoteData);
        this.quoteService.quoteData = updatedQuoteData;
        if (firstError) {
            this.uiState.isSumOutdated = true;
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: firstError.message, type: 'error' });
            this.uiState.activeCell = { rowIndex: firstError.rowIndex, column: firstError.column };
        } else {
            this.uiState.isSumOutdated = false;
        }
        this._publishStateChange();
    }
    
    _handleTableCellClick({ rowIndex, column }) {
        const item = this.quoteService.getQuoteData().rollerBlindItems[rowIndex];
        if (!item) return;
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
        this.uiState.selectedRowIndex = null;
        this._publishStateChange();
    }
    
    _handleReset() {
        if (window.confirm("This will clear all data. Are you sure?")) {
            this.quoteService.reset();
            this.uiState = JSON.parse(JSON.stringify(initialState.ui)); 
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: 'Quote has been reset.' });
        }
    }
    
    _handleCycleType() {
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

    _startAutoSave() { /* ... */ }
    _handleAutoSave() { /* ... */ }
    _triggerDownload() { /* ... */ }
    _generateFileName() { /* ... */ }
    _handleSaveToFile() { /* ... */ }
    _handleFileLoad() { /* ... */ }
    _handleExportCSV() { /* ... */ }
    _handleSequenceCellClick({ rowIndex }) {
        this.uiState.selectedRowIndex = (this.uiState.selectedRowIndex === rowIndex) ? null : rowIndex;
        this._publishStateChange();
    }
}