// /04-core-code/state-manager.js

/**
 * @fileoverview The application's central orchestrator (controller).
 * It listens for user-intent events and delegates tasks to specialized
 * models, services, and strategies. It does not contain business logic itself.
 */

export class StateManager {
    constructor({ quoteModel, persistenceService, productFactory, configManager, eventAggregator }) {
        this.quoteModel = quoteModel;
        this.persistenceService = persistenceService;
        this.productFactory = productFactory;
        this.configManager = configManager; // 需要 ConfigManager 來獲取價格表
        this.eventAggregator = eventAggregator;
        
        // UI 狀態現在獨立管理，不與 quoteData 混淆
        this.uiState = {
            inputValue: '',
            inputMode: 'width',
            isEditing: false,
            activeCell: { rowIndex: 0, column: 'width' },
            selectedRowIndex: null,
        };

        console.log("StateManager (Orchestrator) Initialized.");
        this.initialize();
    }

    initialize() {
        // 訂閱所有來自 InputHandler 的事件
        this.eventAggregator.subscribe('numericKeyPressed', (data) => this._handleNumericKeyPress(data.key));
        this.eventAggregator.subscribe('tableCellClicked', (data) => this._handleTableCellClick(data));
        this.eventAggregator.subscribe('tableHeaderClicked', (data) => this._handleTableHeaderClick(data));
        this.eventAggregator.subscribe('sequenceCellClicked', (data) => this._handleSequenceCellClick(data));
        this.eventAggregator.subscribe('userRequestedInsertRow', () => this._handleInsertRow());
        this.eventAggregator.subscribe('userRequestedDeleteRow', () => this._handleDeleteRow());
        this.eventAggregator.subscribe('userRequestedPriceCalculation', () => this._handlePriceCalculationRequest());
        this.eventAggregator.subscribe('userRequestedSummation', () => this._handleSummationRequest());
        this.eventAggregator.subscribe('userRequestedSave', () => this._handleSave());
        this.eventAggregator.subscribe('userRequestedLoad', () => this._handleLoad());
    }

    /**
     * 發布一個包含最新資料和 UI 狀態的 stateChanged 事件
     */
    _publishStateChange() {
        const fullState = {
            ui: this.uiState,
            quoteData: this.quoteModel.getQuoteData(),
        };
        this.eventAggregator.publish('stateChanged', fullState);
    }
    
    // --- 所有處理方法都被簡化為協調邏輯 ---

    _handleTableCellClick({ rowIndex, column }) {
        this.uiState.selectedRowIndex = null;
        const item = this.quoteModel.getItem(rowIndex);
        if (!item) return;

        if (column === 'width' || column === 'height') {
            this.uiState.inputMode = column;
            this.uiState.activeCell = { rowIndex, column };
            this.uiState.isEditing = true;
            this.uiState.inputValue = String(item[column] || '');
        }
        if (column === 'TYPE') {
            if (!item.width && !item.height) return;
            const TYPE_SEQUENCE = ['BO', 'BO1', 'SN']; // 暫時保留
            const currentIndex = TYPE_SEQUENCE.indexOf(item.fabricType);
            const nextIndex = (currentIndex + 1) % TYPE_SEQUENCE.length;
            this.quoteModel.updateItemValue(rowIndex, 'fabricType', TYPE_SEQUENCE[nextIndex]);
        }
        this._publishStateChange();
    }

    _handleSequenceCellClick({ rowIndex }) {
        this.uiState.selectedRowIndex = (this.uiState.selectedRowIndex === rowIndex) ? null : rowIndex;
        this._publishStateChange();
    }

    _handleInsertRow() {
        const { selectedRowIndex } = this.uiState;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row by clicking its number before inserting.' });
            return;
        }

        const items = this.quoteModel.getAllItems();
        const selectedItem = items[selectedRowIndex];
        if (selectedRowIndex === items.length - 1 && !selectedItem.width && !selectedItem.height) {
            this.eventAggregator.publish('showNotification', { message: 'Cannot insert after the final empty row.' });
            return;
        }

        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const newItem = productStrategy.getInitialItemData();
        this.quoteModel.insertItem(selectedRowIndex + 1, newItem);
        
        this.uiState.selectedRowIndex = null;
        this._publishStateChange();
    }

    _handleDeleteRow() {
        const { selectedRowIndex } = this.uiState;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row by clicking its number before deleting.' });
            return;
        }

        const items = this.quoteModel.getAllItems();
        const selectedItem = items[selectedRowIndex];
        if (items.length > 1 && selectedRowIndex === items.length - 1 && !selectedItem.width && !selectedItem.height) {
            this.eventAggregator.publish('showNotification', { message: 'Cannot delete the final empty row.' });
            return;
        }

        this.quoteModel.deleteItem(selectedRowIndex);
        this.uiState.selectedRowIndex = null;
        this._publishStateChange();
    }

    _handlePriceCalculationRequest() {
        const items = this.quoteModel.getAllItems();
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');

        items.forEach((item, index) => {
            if (item.width && item.height && item.fabricType) {
                const priceMatrix = this.configManager.getPriceMatrix(item.fabricType);
                const result = productStrategy.calculatePrice(item, priceMatrix);
                
                if (result.price !== null) {
                    this.quoteModel.updateItemValue(index, 'linePrice', result.price);
                } else if (result.error) {
                    this.eventAggregator.publish('showNotification', { message: result.error });
                }
            }
        });
        this._publishStateChange();
    }

    _handleSummationRequest() {
        // 驗證邏輯可以移交給 QuoteModel 或 Strategy
        this.quoteModel.calculateTotalSum();
        this._publishStateChange();
    }

    _handleSave() {
        const quoteData = this.quoteModel.getQuoteData();
        const result = this.persistenceService.save(quoteData);
        if (result.success) {
            this.eventAggregator.publish('showNotification', { message: 'Quote saved successfully!' });
        } else {
            this.eventAggregator.publish('showNotification', { message: 'Error: Could not save quote.', type: 'error' });
        }
    }

    _handleLoad() {
        const result = this.persistenceService.load();
        if (result.success && result.data) {
            // 用載入的資料重設整個 Model
            this.quoteModel.data = result.data;
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: 'Quote loaded successfully!' });
        } else if (!result.data) {
            this.eventAggregator.publish('showNotification', { message: 'No saved quote found.' });
        } else {
            this.eventAggregator.publish('showNotification', { message: 'Error: Could not load quote.', type: 'error' });
        }
    }

    // 其他處理 UI 輸入的方法 (_handleNumericKeyPress, _commitValue 等) 在此省略以求簡潔
    // 在一個更完整的重構中，它們可能會被移到一個專門的 UI 狀態管理器中
}