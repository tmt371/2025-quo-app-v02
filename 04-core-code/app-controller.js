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
        console.log("AppController (Dialog Integrated) Initialized.");
        this.initialize();
    }

    initialize() {
        // ... (其他事件訂閱維持不變) ...
        this.eventAggregator.subscribe('userRequestedLoad', () => this._handleUserRequestedLoad());
        
        // [新增] 訂閱來自 DialogComponent 的使用者選擇事件
        this.eventAggregator.subscribe('userChoseSaveThenLoad', () => this._handleSaveThenLoad());
        this.eventAggregator.subscribe('userChoseLoadDirectly', () => this._handleLoadDirectly());

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
        this.eventAggregator.publish('stateChanged', this._getFullState());
    }

    // [修改] 更新載入請求的處理邏輯
    _handleUserRequestedLoad() {
        if (this.quoteService.hasData()) {
            // 如果有資料，發布事件以顯示自訂對話方塊
            this.eventAggregator.publish('showLoadConfirmationDialog');
        } else {
            // 如果沒有資料，直接觸發檔案選擇
            this.eventAggregator.publish('triggerFileLoad');
        }
    }

    // [新增] 處理「直接載入」的選擇
    _handleLoadDirectly() {
        this.eventAggregator.publish('triggerFileLoad');
    }

    // [新增] 處理「儲存後再載入」的選擇
    _handleSaveThenLoad() {
        // 先執行儲存邏輯
        this._handleSaveToFile();
        // 然後立即觸發檔案選擇
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

    // --- 以下方法大多維持不變 ---
    _commitValue() { /* ... */ }
    _handleReset() { /* ... */ }
    _handleNumericKeyPress(key) { /* ... */ }
    _handleMoveActiveCell({ direction }) { /* ... */ }
    _handleTableCellClick({ rowIndex, column }) { /* ... */ }
    _handleSequenceCellClick({ rowIndex }) { /* ... */ }
    _handleCycleType() { /* ... */ }
    _handleCalculateAndSum() { /* ... */ }
    _handleExportCSV() { /* ... */ }
    _handleInsertRow() { /* ... */ }
    _handleDeleteRow() { /* ... */ }
    _handleClearRow() { /* ... */ }
    _startAutoSave() { /* ... */ }
    _handleAutoSave() { /* ... */ }
}