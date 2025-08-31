// /04-core-code/app-controller.js

// [修改] 移除 dataToCsv, csvToData 的引用，它們現在由 FileService 內部使用
import { initialState } from './config/initial-state.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    // [修改] 增加 fileService 依賴
    constructor({ initialState, productFactory, configManager, eventAggregator, quoteService, calculationService, focusService, fileService }) {
        this.uiState = JSON.parse(JSON.stringify(initialState.ui));
        this.productFactory = productFactory;
        this.configManager = configManager;
        this.eventAggregator = eventAggregator;
        this.quoteService = quoteService;
        this.calculationService = calculationService;
        this.focusService = focusService;
        this.fileService = fileService; // 儲存 FileService 的實例
        this.autoSaveTimerId = null;
        console.log("AppController (FileService Refactored) Initialized.");
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

    // --- [重構] 以下檔案操作方法現在都委派給 FileService ---

    _handleSaveToFile() {
        const quoteData = this.quoteService.getQuoteData();
        const result = this.fileService.saveToJson(quoteData);
        const notificationType = result.success ? 'info' : 'error';
        this.eventAggregator.publish('showNotification', { message: result.message, type: notificationType });
    }

    _handleExportCSV() {
        const quoteData = this.quoteService.getQuoteData();
        const result = this.fileService.exportToCsv(quoteData);
        const notificationType = result.success ? 'info' : 'error';
        this.eventAggregator.publish('showNotification', { message: result.message, type: notificationType });
    }

    _handleFileLoad({ fileName, content }) {
        const result = this.fileService.parseFileContent(fileName, content);

        if (result.success) {
            // 使用 Service 返回的資料更新 QuoteService
            this.quoteService.quoteData = result.data;
            
            // 重設 UI 狀態
            this.uiState = JSON.parse(JSON.stringify(initialState.ui));
            this.uiState.isSumOutdated = true; // 載入後標記為需要重新計算
            
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: result.message });
        } else {
            // 處理錯誤，包括「檔案格式不對」的警訊
            this.eventAggregator.publish('showNotification', { message: result.message, type: 'error' });
        }
    }

    // --- [移除] 以下輔助方法已被移入 FileService ---
    // _triggerDownload()
    // _generateFileName()

    // --- 以下方法大多維持不變 ---
    _commitValue() {
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
    
    _handleInsertRow() { /* ... */ }
    _handleDeleteRow() { /* ... */ }
    _handleClearRow() { /* ... */ }
    _handleReset() { /* ... */ }
    _handleCycleType() { /* ... */ }
    _handleNumericKeyPress() { /* ... */ }
    _handleTableCellClick() { /* ... */ }
    _handleSequenceCellClick() { /* ... */ }
    _handleMoveActiveCell() { /* ... */ }
    _startAutoSave() { /* ... */ }
    _handleAutoSave() { /* ... */ }
}