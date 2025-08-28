// /04-core-code/state-manager.js

/**
 * @fileoverview Manages the application's state and core logic orchestration.
 * This version simplifies logic by managing the state object directly.
 */

export class StateManager {
    constructor({ initialState, persistenceService, productFactory, configManager, eventAggregator }) {
        // --- 關鍵修改：直接接收並管理完整的狀態物件 ---
        this.state = initialState; 
        
        this.persistenceService = persistenceService;
        this.productFactory = productFactory;
        this.configManager = configManager;
        this.eventAggregator = eventAggregator;

        console.log("StateManager (Simplified) Initialized.");
        this.initialize();
    }

    initialize() {
        // 訂閱所有來自 InputHandler 的事件
        this.eventAggregator.subscribe('numericKeyPressed', (data) => this._handleNumericKeyPress(data.key));
        this.eventAggregator.subscribe('tableCellClicked', (data) => this._handleTableCellClick(data));
        this.eventAggregator.subscribe('sequenceCellClicked', (data) => this._handleSequenceCellClick(data));
        this.eventAggregator.subscribe('userRequestedInsertRow', () => this._handleInsertRow());
        this.eventAggregator.subscribe('userRequestedDeleteRow', () => this._handleDeleteRow());
        this.eventAggregator.subscribe('userRequestedPriceCalculation', () => this._handlePriceCalculationRequest());
        this.eventAggregator.subscribe('userRequestedSummation', () => this._handleSummationRequest());
        this.eventAggregator.subscribe('userRequestedSave', () => this._handleSave());
        this.eventAggregator.subscribe('userRequestedLoad', () => this._handleLoad());
    }

    /**
     * @command from main.js - Publishes the initial state for the first render.
     */
    publishInitialState() {
        this._publishStateChange();
    }

    /**
     * Central method to publish the stateChanged event with the current state.
     */
    _publishStateChange() {
        // --- [新增] 偵錯日誌 ---
        console.log("%cStateManager PUBLISHING state:", "color: blue; font-weight: bold;", JSON.parse(JSON.stringify(this.state)));
        this.eventAggregator.publish('stateChanged', this.state);
    }

    /**
     * Handles key presses from the numeric keyboard.
     */
    _handleNumericKeyPress(key) {
        if (!isNaN(parseInt(key))) {
            this.state.ui.inputValue += key;
        } else if (key === 'DEL') {
            this.state.ui.inputValue = this.state.ui.inputValue.slice(0, -1);
        } else if (key === 'W' || key === 'H') {
            this._changeInputMode(key === 'W' ? 'width' : 'height');
            return; 
        } else if (key === 'ENT') {
            this._commitValue();
            return;
        }
        this._publishStateChange();
    }

    /**
     * Commits the value from the input display to the corresponding table cell.
     */
    _commitValue() {
        const { inputValue, inputMode, activeCell, isEditing } = this.state.ui;
        const value = inputValue === '' ? null : parseInt(inputValue, 10);
        
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const validationRules = productStrategy.getValidationRules();
        const rule = validationRules[inputMode];

        if (value !== null && (isNaN(value) || value < rule.min || value > rule.max)) {
            this.eventAggregator.publish('showNotification', { message: `${rule.name} must be between ${rule.min} and ${rule.max}.` });
            this.state.ui.inputValue = '';
            this._publishStateChange();
            return;
        }

        const items = this.state.quoteData.rollerBlindItems;
        const targetItem = items[activeCell.rowIndex];
        if (targetItem) {
            targetItem[inputMode] = value;
            if ((inputMode === 'width' || inputMode === 'height') && value === null) {
                targetItem.linePrice = null;
            }
        }

        if (isEditing) {
            this.state.ui.isEditing = false;
        } else if (activeCell.rowIndex === items.length - 1 && (targetItem.width || targetItem.height)) {
            const newItem = productStrategy.getInitialItemData();
            items.push(newItem);
        }
        
        this.state.ui.inputValue = '';
        this._changeInputMode(inputMode);
    }
    
    /**
     * Changes the input mode and focuses on the next appropriate cell.
     * @param {string} mode - 'width' or 'height'.
     */
    _changeInputMode(mode) {
        this.state.ui.inputMode = mode;
        this.state.ui.isEditing = false;
        this.state.ui.selectedRowIndex = null;
        
        const items = this.state.quoteData.rollerBlindItems;
        const nextEmptyIndex = items.findIndex(item => item[mode] === null || item[mode] === '');
        
        if (nextEmptyIndex !== -1) {
            this.state.ui.activeCell = { rowIndex: nextEmptyIndex, column: mode };
        } else {
            this.state.ui.activeCell = { rowIndex: items.length - 1, column: mode };
        }
        this._publishStateChange();
    }

    /**
     * Handles clicks on table cells (W, H, Type).
     */
    _handleTableCellClick({ rowIndex, column }) {
        this.state.ui.selectedRowIndex = null;
        const item = this.state.quoteData.rollerBlindItems[rowIndex];
        if (!item) return;

        if (column === 'width' || column === 'height') {
            this.state.ui.inputMode = column;
            this.state.ui.activeCell = { rowIndex, column };
            this.state.ui.isEditing = true;
            this.state.ui.inputValue = String(item[column] || '');
        }
        if (column === 'TYPE') {
            if (!item.width || !item.height) return;
            const TYPE_SEQUENCE = ['BO', 'BO1', 'SN'];
            const currentIndex = TYPE_SEQUENCE.indexOf(item.fabricType);
            const nextIndex = (currentIndex + 1) % TYPE_SEQUENCE.length;
            item.fabricType = TYPE_SEQUENCE[nextIndex];
        }
        this._publishStateChange();
    }

    /**
     * Handles clicks on the sequence number cell to select a row.
     */
    _handleSequenceCellClick({ rowIndex }) {
        this.state.ui.selectedRowIndex = (this.state.ui.selectedRowIndex === rowIndex) ? null : rowIndex;
        this._publishStateChange();
    }

    /**
     * Handles the 'Insert Row' command.
     */
    _handleInsertRow() {
        const { selectedRowIndex } = this.state.ui;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row by clicking its number before inserting.' });
            return;
        }

        const items = this.state.quoteData.rollerBlindItems;
        const selectedItem = items[selectedRowIndex];
        if (selectedRowIndex === items.length - 1 && !selectedItem.width && !selectedItem.height) {
            this.eventAggregator.publish('showNotification', { message: 'Cannot insert after the final empty row.' });
            return;
        }

        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const newItem = productStrategy.getInitialItemData();
        items.splice(selectedRowIndex + 1, 0, newItem);
        
        this.state.ui.selectedRowIndex = null;
        this._publishStateChange();
    }

    /**
     * Handles the 'Delete Row' command.
     */
    _handleDeleteRow() {
        const { selectedRowIndex } = this.state.ui;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row by clicking its number before deleting.' });
            return;
        }
        
        const items = this.state.quoteData.rollerBlindItems;
        const selectedItem = items[selectedRowIndex];
        if (items.length > 1 && selectedRowIndex === items.length - 1 && !selectedItem.width && !selectedItem.height) {
            this.eventAggregator.publish('showNotification', { message: 'Cannot delete the final empty row.' });
            return;
        }
        
        items.splice(selectedRowIndex, 1);

        if (items.length === 0) {
            const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
            items.push(productStrategy.getInitialItemData());
        }
        
        this.state.ui.selectedRowIndex = null;
        this._publishStateChange();
    }

    /**
     * Handles the 'Calculate All Prices' command.
     */
    _handlePriceCalculationRequest() {
        const items = this.state.quoteData.rollerBlindItems;
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        let needsUpdate = false;
        items.forEach((item) => {
            if (item.width && item.height && item.fabricType) {
                const priceMatrix = this.configManager.getPriceMatrix(item.fabricType);
                const result = productStrategy.calculatePrice(item, priceMatrix);
                
                if (result.price !== null && item.linePrice !== result.price) {
                    item.linePrice = result.price;
                    needsUpdate = true;
                } else if (result.error) {
                    this.eventAggregator.publish('showNotification', { message: result.error });
                }
            }
        });
        if (needsUpdate) {
            this._publishStateChange();
        }
    }
    
    // ... Save, Load, Summation and other methods remain the same ...
    _handleSummationRequest() {
        const items = this.state.quoteData.rollerBlindItems;
        // Validation
        for (const item of items) {
            if (!item.width && !item.height) continue;
            if (!item.width || !item.height || !item.fabricType) {
                this.eventAggregator.publish('showNotification', { message: `Cannot calculate sum. All rows must have Width, Height, and Type.` });
                this.state.quoteData.summary.totalSum = null;
                this._publishStateChange();
                return;
            }
        }
        // Calculation
        const total = items.reduce((sum, item) => sum + (item.linePrice || 0), 0);
        this.state.quoteData.summary.totalSum = total;
        this._publishStateChange();
    }
    _handleSave() {
        const result = this.persistenceService.save(this.state.quoteData);
        if (result.success) {
            this.eventAggregator.publish('showNotification', { message: 'Quote saved successfully!' });
        } else {
            this.eventAggregator.publish('showNotification', { message: 'Error: Could not save quote.', type: 'error' });
        }
    }
    _handleLoad() {
        const result = this.persistenceService.load();
        if (result.success && result.data) {
            this.state.quoteData = result.data;
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: 'Quote loaded successfully!' });
        } else if (result.success && !result.data) {
            this.eventAggregator.publish('showNotification', { message: 'No saved quote found.' });
        } else {
            this.eventAggregator.publish('showNotification', { message: 'Error: Could not load quote.', type: 'error' });
        }
    }
}