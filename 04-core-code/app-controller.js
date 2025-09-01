// /04-core-code/app-controller.js

import { initialState } from './config/initial-state.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    constructor({ initialState, productFactory, configManager, eventAggregator, quoteService, calculationService, focusService, fileService }) {
        this.uiState = JSON.parse(JSON.stringify(initialState.ui));
        // [新增] 初始化多重刪除相關狀態
        this.uiState.isMultiDeleteMode = false;
        this.uiState.multiDeleteSelectedIndexes = new Set();
        
        this.productFactory = productFactory;
        this.configManager = configManager;
        this.eventAggregator = eventAggregator;
        this.quoteService = quoteService;
        this.calculationService = calculationService;
        this.focusService = focusService;
        this.fileService = fileService;
        this.autoSaveTimerId = null;
        console.log("AppController (M-Del Logic) Initialized.");
        this.initialize();
    }

    initialize() {
        // ... (其他事件訂閱維持不變) ...
        this.eventAggregator.subscribe('userRequestedMultiDeleteMode', () => this._handleToggleMultiDeleteMode());
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

    // [新增] 處理 M-Del 按鈕點擊，切換多重刪除模式
    _handleToggleMultiDeleteMode() {
        this.uiState.isMultiDeleteMode = !this.uiState.isMultiDeleteMode;

        // 進入多選模式時，將當前單選的項目作為多選的第一個項目
        if (this.uiState.isMultiDeleteMode && this.uiState.selectedRowIndex !== null) {
            this.uiState.multiDeleteSelectedIndexes.clear();
            this.uiState.multiDeleteSelectedIndexes.add(this.uiState.selectedRowIndex);
        } else {
            // 退出多選模式時，清空選項
            this.uiState.multiDeleteSelectedIndexes.clear();
        }
        
        // 進入多選模式後，單選狀態應被清除
        this.uiState.selectedRowIndex = null;

        this._publishStateChange();
    }

    // [重構] 處理項次點擊，需區分單選和多選模式
    _handleSequenceCellClick({ rowIndex }) {
        if (this.uiState.isMultiDeleteMode) {
            // 多選模式下：新增或移除選項
            if (this.uiState.multiDeleteSelectedIndexes.has(rowIndex)) {
                this.uiState.multiDeleteSelectedIndexes.delete(rowIndex);
            } else {
                this.uiState.multiDeleteSelectedIndexes.add(rowIndex);
            }
        } else {
            // 單選模式下：切換單一選項
            this.uiState.selectedRowIndex = (this.uiState.selectedRowIndex === rowIndex) ? null : rowIndex;
        }
        this._publishStateChange();
    }

    // [重構] 處理刪除請求，需區分單選和多選模式
    _handleDeleteRow() {
        if (this.uiState.isMultiDeleteMode) {
            // --- 多選模式 ---
            const indexes = this.uiState.multiDeleteSelectedIndexes;
            if (indexes.size === 0) {
                this.eventAggregator.publish('showNotification', { message: 'Please select rows to delete.' });
                return;
            }
            this.quoteService.deleteMultipleRows(indexes);

            // 結束多選模式
            this.uiState.isMultiDeleteMode = false;
            this.uiState.multiDeleteSelectedIndexes.clear();

        } else {
            // --- 單選模式 ---
            const { selectedRowIndex } = this.uiState;
            if (selectedRowIndex === null) { return; } // 理論上按鈕會被禁用，此為保護
            this.quoteService.deleteRow(selectedRowIndex);
        }

        const items = this.quoteService.getQuoteData().rollerBlindItems;
        this.uiState.selectedRowIndex = null;
        this.uiState.isSumOutdated = true;
        this.uiState.activeCell = { rowIndex: items.length - 1, column: 'width' };
        
        this._publishStateChange();
        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }
    
    // [重構] 為 Insert 增加前置條件檢查
    _handleInsertRow() {
        const { selectedRowIndex } = this.uiState;
        if (selectedRowIndex === null) { return; } // 按鈕應禁用
        
        // 規則檢查
        const items = this.quoteService.getQuoteData().rollerBlindItems;
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

    // --- 以下方法大多維持不變 ---
    _handleUserRequestedLoad() { /* ... */ }
    _handleLoadDirectly() { /* ... */ }
    _handleSaveThenLoad() { /* ... */ }
    _handleSaveToFile() { /* ... */ }
    _handleFileLoad({ fileName, content }) { /* ... */ }
    _handleExportCSV() { /* ... */ }
    _handleReset() { /* ... */ }
    _handleClearRow() { /* ... */ }
    _commitValue() { /* ... */ }
    _handleNumericKeyPress(key) { /* ... */ }
    _handleMoveActiveCell({ direction }) { /* ... */ }
    _handleTableCellClick({ rowIndex, column }) { /* ... */ }

    _handleCycleType() { /* ... */ }
    _handleCalculateAndSum() { /* ... */ }
    _startAutoSave() { /* ... */ }
    _handleAutoSave() { /* ... */ }
}