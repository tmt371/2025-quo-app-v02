// /04-core-code/state-manager.js

/**
 * @fileoverview Manages the application's state and core logic orchestration.
 */

import { dataToCsv, csvToData } from './utils/csv-parser.js';
// --- [修改] 不再從外部匯入 initialState 來進行重設 ---
// import { initialState } from './config/initial-state.js';


export class StateManager {
    constructor({ initialState, productFactory, configManager, eventAggregator }) {
        // 使用深拷貝確保初始狀態的獨立性
        this.state = JSON.parse(JSON.stringify(initialState)); 
        this.productFactory = productFactory;
        this.configManager = configManager;
        this.eventAggregator = eventAggregator;
        console.log("StateManager (File Access Ready) Initialized.");
        this.initialize();
    }

    initialize() {
        // ... 所有訂閱維持不變 ...
        this.eventAggregator.subscribe('numericKeyPressed', (data) => this._handleNumericKeyPress(data.key));
        this.eventAggregator.subscribe('tableCellClicked', (data) => this._handleTableCellClick(data));
        this.eventAggregator.subscribe('tableHeaderClicked', (data) => this._handleTableHeaderClick(data));
        this.eventAggregator.subscribe('sequenceCellClicked', (data) => this._handleSequenceCellClick(data));
        this.eventAggregator.subscribe('userRequestedInsertRow', () => this._handleInsertRow());
        this.eventAggregator.subscribe('userRequestedDeleteRow', () => this._handleDeleteRow());
        this.eventAggregator.subscribe('userRequestedPriceCalculation', () => this._handlePriceCalculationRequest());
        this.eventAggregator.subscribe('userRequestedSummation', () => this._handleSummationRequest());
        this.eventAggregator.subscribe('userRequestedSave', () => this._handleSaveToFile());
        this.eventAggregator.subscribe('fileLoaded', (data) => this._handleFileLoad(data));
        this.eventAggregator.subscribe('userRequestedExportCSV', () => this._handleExportCSV());
        this.eventAggregator.subscribe('userRequestedReset', () => this._handleReset());
    }

    // --- [新增] 內部方法，用於生成一份全新的初始狀態 ---
    _getInitialState() {
        return {
            ui: {
                currentView: 'QUICK_QUOTE',
                inputValue: '',
                inputMode: 'width',
                isEditing: false,
                activeCell: { rowIndex: 0, column: 'width' },
                selectedRowIndex: null,
            },
            quoteData: {
                rollerBlindItems: [
                    { 
                        itemId: `item-${Date.now()}`, 
                        width: null, 
                        height: null, 
                        fabricType: null, 
                        linePrice: null 
                    }
                ],
                quoteId: null,
                issueDate: null,
                dueDate: null,
                status: "Configuring",
                customer: { name: "", address: "", phone: "", email: "" },
                summary: { totalSum: null }
            }
        };
    }

    publishInitialState() {
        this._publishStateChange();
    }

    _publishStateChange() {
        this.eventAggregator.publish('stateChanged', this.state);
    }
    
    // ... 其他方法 ...
    _triggerDownload(content, fileName, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    _generateFileName(extension) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `quote-${yyyy}${mm}${dd}${hh}${min}.${extension}`;
    }
    _handleSaveToFile() {
        try {
            const jsonString = JSON.stringify(this.state.quoteData, null, 2);
            const fileName = this._generateFileName('json');
            this._triggerDownload(jsonString, fileName, 'application/json');
            this.eventAggregator.publish('showNotification', { message: 'Quote file is being downloaded...' });
        } catch (error) {
            console.error("Failed to save JSON file:", error);
            this.eventAggregator.publish('showNotification', { message: 'Error creating quote file.', type: 'error' });
        }
    }
    _handleFileLoad({ fileName, content }) {
        let loadedData = null;
        try {
            if (fileName.toLowerCase().endsWith('.json')) {
                loadedData = JSON.parse(content);
            } else if (fileName.toLowerCase().endsWith('.csv')) {
                loadedData = csvToData(content);
            } else {
                this.eventAggregator.publish('showNotification', { message: `Unsupported file type: ${fileName}`, type: 'error' });
                return;
            }
            if (loadedData && loadedData.rollerBlindItems) {
                // 載入資料時，UI 狀態也應該被重設
                const freshUIState = this._getInitialState().ui;
                this.state.quoteData = loadedData;
                this.state.ui = freshUIState;
                this._publishStateChange();
                this.eventAggregator.publish('showNotification', { message: `Successfully loaded data from ${fileName}` });
            } else {
                throw new Error("Parsed data is not in a valid format.");
            }
        } catch (error) {
            console.error("Failed to load file:", error);
            this.eventAggregator.publish('showNotification', { message: `Error loading file: ${error.message}`, type: 'error' });
        }
    }
    _handleExportCSV() {
        try {
            const csvString = dataToCsv(this.state.quoteData);
            const fileName = this._generateFileName('csv');
            this._triggerDownload(csvString, fileName, 'text/csv;charset=utf-8;');
            this.eventAggregator.publish('showNotification', { message: 'CSV file is being downloaded...' });
        } catch (error) {
            console.error("Failed to export CSV file:", error);
            this.eventAggregator.publish('showNotification', { message: 'Error creating CSV file.', type: 'error' });
        }
    }
    _handleNumericKeyPress(key) {
        if (!isNaN(parseInt(key))) { this.state.ui.inputValue += key; } 
        else if (key === 'DEL') { this.state.ui.inputValue = this.state.ui.inputValue.slice(0, -1); } 
        else if (key === 'W' || key === 'H') { this._changeInputMode(key === 'W' ? 'width' : 'height'); return; } 
        else if (key === 'ENT') { this._commitValue(); return; }
        this._publishStateChange();
    }
    _commitValue() {
        const { inputValue, inputMode, activeCell, isEditing } = this.state.ui;
        const value = inputValue === '' ? null : parseInt(inputValue, 10);
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const validationRules = productStrategy.getValidationRules();
        const rule = validationRules[inputMode];
        if (value !== null && (isNaN(value) || value < rule.min || value > rule.max)) {
            this.eventAggregator.publish('showNotification', { message: `${rule.name} must be between ${rule.min} and ${rule.max}.` });
            this.state.ui.inputValue = ''; this._publishStateChange(); return;
        }
        const items = this.state.quoteData.rollerBlindItems;
        const targetItem = items[activeCell.rowIndex];
        if (targetItem) {
            if (targetItem[inputMode] !== value) {
                targetItem.linePrice = null;
            }
            targetItem[inputMode] = value;
        }
        if (isEditing) { this.state.ui.isEditing = false; } 
        else if (activeCell.rowIndex === items.length - 1 && (targetItem.width || targetItem.height)) {
            const newItem = productStrategy.getInitialItemData();
            items.push(newItem);
        }
        this.state.ui.inputValue = '';
        this._changeInputMode(inputMode);
    }
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
            const currentType = item.fabricType;
            const currentIndex = TYPE_SEQUENCE.indexOf(currentType);
            const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
            if (currentType !== nextType) {
                item.linePrice = null;
            }
            item.fabricType = nextType;
        }
        this._publishStateChange();
    }
    _handleSequenceCellClick({ rowIndex }) {
        this.state.ui.selectedRowIndex = (this.state.ui.selectedRowIndex === rowIndex) ? null : rowIndex;
        this._publishStateChange();
    }
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
        const newRowIndex = selectedRowIndex + 1;
        items.splice(newRowIndex, 0, newItem);
        this.state.ui.activeCell = { rowIndex: newRowIndex, column: 'width' };
        this.state.ui.inputMode = 'width';
        this.state.ui.selectedRowIndex = null;
        this._publishStateChange();
    }
    _handleDeleteRow() {
        const { selectedRowIndex } = this.state.ui;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row by clicking its number before deleting.' });
            return;
        }
        const items = this.state.quoteData.rollerBlindItems;
        const selectedItem = items[selectedRowIndex];
        const isLastItem = selectedRowIndex === items.length - 1;
        if (isLastItem && (selectedItem.width || selectedItem.height)) {
            selectedItem.width = null;
            selectedItem.height = null;
            selectedItem.fabricType = null;
            selectedItem.linePrice = null;
        } else if (isLastItem && !selectedItem.width && !selectedItem.height) {
            this.eventAggregator.publish('showNotification', { message: 'Cannot delete the final empty row.' });
            return;
        } else {
            items.splice(selectedRowIndex, 1);
        }
        this.state.ui.selectedRowIndex = null;
        this._publishStateChange();
    }
    _handleTableHeaderClick({ column }) {
        if (column !== 'TYPE') return;
        const items = this.state.quoteData.rollerBlindItems;
        if (items.length === 0) return;
        const firstPopulatedItem = items.find(item => item.width || item.height);
        const currentType = firstPopulatedItem ? firstPopulatedItem.fabricType : null;
        const TYPE_SEQUENCE = ['BO', 'BO1', 'SN'];
        const currentIndex = TYPE_SEQUENCE.indexOf(currentType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        items.forEach(item => {
            if (item.width || item.height) {
                if (item.fabricType !== nextType) {
                    item.linePrice = null;
                }
                item.fabricType = nextType;
            }
        });
        this._publishStateChange();
    }
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
        if (needsUpdate) { this._publishStateChange(); }
    }
    _handleSummationRequest() {
        const items = this.state.quoteData.rollerBlindItems;
        for (const item of items) {
            if (!item.width && !item.height) continue;
            if (!item.width || !item.height || !item.fabricType) {
                this.eventAggregator.publish('showNotification', { message: `Cannot calculate sum. All rows must have Width, Height, and Type.` });
                this.state.quoteData.summary.totalSum = null;
                this._publishStateChange();
                return;
            }
        }
        const total = items.reduce((sum, item) => sum + (item.linePrice || 0), 0);
        this.state.quoteData.summary.totalSum = total;
        this._publishStateChange();
    }

    /**
     * @fileoverview [修改] 修正 RESET 功能
     */
    _handleReset() {
        const message = "This will clear all data in the current quote. Please make sure you have saved your work.\n\n- 'OK' to reset.\n- 'Cancel' to abort.";
        if (window.confirm(message)) {
            // --- [修改] 不再參考外部，而是呼叫內部方法來生成一個全新的物件 ---
            this.state = this._getInitialState();
            console.log("State has been reset.");
            
            this._publishStateChange(); // 發布通知以更新 UI
            this.eventAggregator.publish('showNotification', { message: 'Quote has been reset.' });
        } else {
            console.log("Reset aborted by user.");
        }
    }
}