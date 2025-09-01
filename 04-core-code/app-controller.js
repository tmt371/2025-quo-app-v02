// /04-core-code/app-controller.js

import { initialState } from './config/initial-state.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    constructor({ initialState, productFactory, configManager, eventAggregator, quoteService, calculationService, focusService, fileService }) {
        this.uiState = JSON.parse(JSON.stringify(initialState.ui));
        this.uiState.isMultiDeleteMode = false;
        this.uiState.multiDeleteSelectedIndexes = new Set();
        
        this.currentProduct = 'rollerBlind'; 

        this.productFactory = productFactory;
        this.configManager = configManager;
        this.eventAggregator = eventAggregator;
        this.quoteService = quoteService;
        this.calculationService = calculationService;
        this.focusService = focusService;
        this.fileService = fileService;
        this.autoSaveTimerId = null;
        console.log("AppController (Complete & Fixed rev.24) Initialized.");
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
        this.eventAggregator.subscribe('userRequestedLoad', () => this._handleUserRequestedLoad());
        this.eventAggregator.subscribe('userChoseSaveThenLoad', () => this._handleSaveThenLoad());
        this.eventAggregator.subscribe('userChoseLoadDirectly', () => this._handleLoadDirectly());
        this.eventAggregator.subscribe('userRequestedMultiDeleteMode', () => this._handleToggleMultiDeleteMode());
        
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
        this.eventAggregator.publish('stateChanged', this._getFullState());
    }

    _handleToggleMultiDeleteMode() {
        const isEnteringMode = !this.uiState.isMultiDeleteMode;

        if (isEnteringMode) {
            this.uiState.isMultiDeleteMode = true;
            this.uiState.multiDeleteSelectedIndexes.clear();
            if (this.uiState.selectedRowIndex !== null) {
                this.uiState.multiDeleteSelectedIndexes.add(this.uiState.selectedRowIndex);
            }
            this.uiState.selectedRowIndex = null;
        } else {
            this.uiState.isMultiDeleteMode = false;
            this.uiState.multiDeleteSelectedIndexes.clear();
            this.uiState.selectedRowIndex = null;
            this.uiState = this.focusService.focusFirstEmptyCell(this.uiState, this.quoteService.getQuoteData(), 'width');
        }
        this._publishStateChange();
    }

    _handleSequenceCellClick({ rowIndex }) {
        if (this.uiState.isMultiDeleteMode) {
            // --- [重構] 使用新的通用方法 getItems() ---
            const items = this.quoteService.getItems();
            const isLastRow = rowIndex === items.length - 1;
            const item = items[rowIndex];
            const isRowEmpty = !item.width && !item.height && !item.fabricType;

            if (isLastRow && isRowEmpty) {
                this.eventAggregator.publish('showNotification', { message: "Cannot select the final empty row.", type: 'error' });
                return;
            }

            if (this.uiState.multiDeleteSelectedIndexes.has(rowIndex)) {
                this.uiState.multiDeleteSelectedIndexes.delete(rowIndex);
            } else {
                this.uiState.multiDeleteSelectedIndexes.add(rowIndex);
            }
        } else {
            this.uiState.selectedRowIndex = (this.uiState.selectedRowIndex === rowIndex) ? null : rowIndex;
        }
        this._publishStateChange();
    }
    
    _handleDeleteRow() {
        if (this.uiState.isMultiDeleteMode) {
            const indexes = this.uiState.multiDeleteSelectedIndexes;
            if (indexes.size === 0) {
                this.eventAggregator.publish('showNotification', { message: 'Please select rows to delete.' });
                return;
            }
            this.quoteService.deleteMultipleRows(indexes);
            this._handleToggleMultiDeleteMode(); 

        } else {
            const { selectedRowIndex } = this.uiState;
            if (selectedRowIndex === null) { return; }
            this.quoteService.deleteRow(selectedRowIndex);

            // --- [重構] 使用新的通用方法 getItems() ---
            const items = this.quoteService.getItems();
            this.uiState.selectedRowIndex = null;
            this.uiState.isSumOutdated = true;
            this.uiState.activeCell = { rowIndex: items.length - 1, column: 'width' };
            this._publishStateChange();
            this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
        }
    }
    
    _handleInsertRow() {
        const { selectedRowIndex } = this.uiState;
        if (selectedRowIndex === null) { return; }
        
        // --- [重構] 使用新的通用方法 getItems() ---
        const items = this.quoteService.getItems();
        const isLastRow = selectedRowIndex === items.length - 1;
        if (isLastRow) {
             this.eventAggregator.publish('showNotification', { message: "Cannot insert after the last row.", type: 'error' });
             return;
        }
        const nextItem = items[selectedRowIndex + 1];
        const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
        if (isNextRowEmpty) {
            this.eventAggregator.publish('showNotification', { message: "Cannot insert before an empty row.", type: 'error' });
            return;
        }

        const newRowIndex = this.quoteService.insertRow(selectedRowIndex);
        this.uiState.activeCell = { rowIndex: newRowIndex, column: 'width' };
        this.uiState.inputMode = 'width';
        this.uiState.selectedRowIndex = null;
        this._publishStateChange();
        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    _handleNumericKeyPress(key) {
        if (!isNaN(parseInt(key))) {
            this.uiState.inputValue += key;
        } else if (key === 'DEL') {
            this.uiState.inputValue = this.uiState.inputValue.slice(0, -1);
        } else if (key === 'W' || key === 'H') {
            this.uiState = this.focusService.focusFirstEmptyCell(this.uiState, this.quoteService.getQuoteData(), key === 'W' ? 'width' : 'height');
        } else if (key === 'ENT') {
            this._commitValue();
            return;
        }
        this._publishStateChange();
    }

    _commitValue() {
        const { inputValue, inputMode, activeCell } = this.uiState;
        const value = inputValue === '' ? null : parseInt(inputValue, 10);
        
        const productStrategy = this.productFactory.getProductStrategy(this.currentProduct);
        
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
    
    _handleUserRequestedLoad() {
        if (this.quoteService.hasData()) {
            this.eventAggregator.publish('showLoadConfirmationDialog');
        } else {
            this.eventAggregator.publish('triggerFileLoad');
        }
    }

    _handleLoadDirectly() {
        this.eventAggregator.publish('triggerFileLoad');
    }

    _handleSaveThenLoad() {
        this._handleSaveToFile();
        this.eventAggregator.publish('triggerFileLoad');
    }

    _handleSaveToFile() {
        const quoteData = this.quoteService.getQuoteData();
        const result = this.fileService.saveToJson(quoteData);
        const notificationType = result.success ? 'info' : 'error';
        this.eventAggregator.publish('showNotification', { message: result.message, type: notificationType });
    }

    _handleFileLoad({ fileName, content }) {
        const result = this.fileService.parseFileContent(fileName, content);
        if (result.success) {
            this.quoteService.quoteData = result.data;
            this.uiState = JSON.parse(JSON.stringify(initialState.ui));
            this.uiState.isSumOutdated = true;
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: result.message });
        } else {
            this.eventAggregator.publish('showNotification', { message: result.message, type: 'error' });
        }
    }

    _handleExportCSV() {
        const quoteData = this.quoteService.getQuoteData();
        const result = this.fileService.exportToCsv(quoteData);
        const notificationType = result.success ? 'info' : 'error';
        this.eventAggregator.publish('showNotification', { message: result.message, type: notificationType });
    }
    
    _handleReset() {
        if (window.confirm("This will clear all data. Are you sure?")) {
            this.quoteService.reset();
            this.uiState = JSON.parse(JSON.stringify(initialState.ui)); 
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: 'Quote has been reset.' });
        }
    }
    
    _handleClearRow() {
        const { selectedRowIndex } = this.uiState;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row to clear.', type: 'error' });
            return;
        }
        this.uiState = this.focusService.focusAfterClear(this.uiState);
        this.quoteService.clearRow(selectedRowIndex);
        this.uiState.selectedRowIndex = null;
        this.uiState.isSumOutdated = true;
        this._publishStateChange();
    }
    
    _handleMoveActiveCell({ direction }) {
        this.uiState = this.focusService.moveActiveCell(this.uiState, this.quoteService.getQuoteData(), direction);
        this._publishStateChange();
    }
    
    _handleTableCellClick({ rowIndex, column }) {
        // --- [重構] 使用新的通用方法 getItems() ---
        const item = this.quoteService.getItems()[rowIndex];
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
    
    _handleCycleType() {
        // --- [重構] 使用新的通用方法 getItems() ---
        const items = this.quoteService.getItems();
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

    _handleCalculateAndSum() {
        const currentQuoteData = this.quoteService.getQuoteData();
        
        const productStrategy = this.productFactory.getProductStrategy(this.currentProduct);
        const { updatedQuoteData, firstError } = this.calculationService.calculateAndSum(currentQuoteData, productStrategy);

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

    _startAutoSave() {
        if (this.autoSaveTimerId) { clearInterval(this.autoSaveTimerId); }
        this.autoSaveTimerId = setInterval(() => { this._handleAutoSave(); }, AUTOSAVE_INTERVAL_MS);
    }

    _handleAutoSave() {
        try {
            // --- [重構] 使用新的通用方法 getItems() ---
            const items = this.quoteService.getItems();
            const hasContent = items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
            if (hasContent) {
                const dataToSave = JSON.stringify(this.quoteService.getQuoteData());
                localStorage.setItem(AUTOSAVE_STORAGE_KEY, dataToSave);
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}