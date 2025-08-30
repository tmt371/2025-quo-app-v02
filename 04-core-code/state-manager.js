// /04-core-code/state-manager.js

import { dataToCsv, csvToData } from './utils/csv-parser.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class StateManager {
    constructor({ initialState, productFactory, configManager, eventAggregator }) {
        this.state = JSON.parse(JSON.stringify(initialState));
        this.productFactory = productFactory;
        this.configManager = configManager;
        this.eventAggregator = eventAggregator;
        this.autoSaveTimerId = null;
        console.log("StateManager (Bugfix rev.5) Initialized.");
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

    _getInitialState() {
        return {
            ui: {
                currentView: 'QUICK_QUOTE',
                inputValue: '',
                inputMode: 'width',
                isEditing: false,
                activeCell: { rowIndex: 0, column: 'width' },
                selectedRowIndex: null,
                isSumOutdated: false
            },
            quoteData: {
                rollerBlindItems: [
                    { itemId: `item-${Date.now()}`, width: null, height: null, fabricType: null, linePrice: null }
                ],
                summary: { totalSum: null }
            }
        };
    }

    publishInitialState() { this._publishStateChange(); }
    _publishStateChange() { this.eventAggregator.publish('stateChanged', this.state); }
    _startAutoSave() { if (this.autoSaveTimerId) { clearInterval(this.autoSaveTimerId); } this.autoSaveTimerId = setInterval(() => { this._handleAutoSave(); }, AUTOSAVE_INTERVAL_MS); console.log(`Auto-save started. Interval: ${AUTOSAVE_INTERVAL_MS / 1000} seconds.`); }
    _handleAutoSave() { try { const items = this.state.quoteData.rollerBlindItems; const hasContent = items.length > 1 || (items.length === 1 && (items[0].width || items[0].height)); if (hasContent) { const dataToSave = JSON.stringify(this.state.quoteData); localStorage.setItem(AUTOSAVE_STORAGE_KEY, dataToSave); console.log('Auto-save successful.'); } } catch (error) { console.error('Auto-save failed:', error); } }
    _triggerDownload(content, fileName, contentType) { const blob = new Blob([content], { type: contentType }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    _generateFileName(extension) { const now = new Date(); const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0'); const hh = String(now.getHours()).padStart(2, '0'); const min = String(now.getMinutes()).padStart(2, '0'); return `quote-${yyyy}${mm}${dd}${hh}${min}.${extension}`; }
    _handleSaveToFile() { try { const jsonString = JSON.stringify(this.state.quoteData, null, 2); const fileName = this._generateFileName('json'); this._triggerDownload(jsonString, fileName, 'application/json'); this.eventAggregator.publish('showNotification', { message: 'Quote file is being downloaded...' }); } catch (error) { console.error("Failed to save JSON file:", error); this.eventAggregator.publish('showNotification', { message: 'Error creating quote file.', type: 'error' }); } }
    _handleFileLoad({ fileName, content }) { let loadedData = null; try { if (fileName.toLowerCase().endsWith('.json')) { loadedData = JSON.parse(content); } else if (fileName.toLowerCase().endsWith('.csv')) { loadedData = csvToData(content); } else { this.eventAggregator.publish('showNotification', { message: `Unsupported file type: ${fileName}`, type: 'error' }); return; } if (loadedData && loadedData.rollerBlindItems) { const freshUIState = this._getInitialState().ui; this.state.quoteData = loadedData; this.state.ui = freshUIState; this.state.ui.isSumOutdated = true; this._publishStateChange(); this.eventAggregator.publish('showNotification', { message: `Successfully loaded data from ${fileName}` }); } else { throw new Error("Parsed data is not in a valid format."); } } catch (error) { console.error("Failed to load file:", error); this.eventAggregator.publish('showNotification', { message: `Error loading file: ${error.message}`, type: 'error' }); } }
    _handleExportCSV() { try { const csvString = dataToCsv(this.state.quoteData); const fileName = this._generateFileName('csv'); this._triggerDownload(csvString, fileName, 'text/csv;charset=utf-8;'); this.eventAggregator.publish('showNotification', { message: 'CSV file is being downloaded...' }); } catch (error) { console.error("Failed to export CSV file:", error); this.eventAggregator.publish('showNotification', { message: 'Error creating CSV file.', type: 'error' }); } }

    _focusFirstEmptyCell(column) {
        const items = this.state.quoteData.rollerBlindItems;
        const firstEmptyIndex = items.findIndex(item => !item[column]);
        const targetIndex = (firstEmptyIndex !== -1) ? firstEmptyIndex : items.length - 1;
        this.state.ui.activeCell = { rowIndex: targetIndex, column: column };
        this.state.ui.inputMode = column;
        this.state.ui.inputValue = '';
        this._publishStateChange();
    }

    _handleNumericKeyPress(key) {
        if (!isNaN(parseInt(key))) {
            this.state.ui.inputValue += key;
            this._publishStateChange();
        } else if (key === 'DEL') {
            this.state.ui.inputValue = this.state.ui.inputValue.slice(0, -1);
            this._publishStateChange();
        } else if (key === 'W') {
            this._focusFirstEmptyCell('width');
        } else if (key === 'H') {
            this._focusFirstEmptyCell('height');
        } else if (key === 'ENT') {
            this._commitValue();
        }
    }

    _commitValue() {
        const { inputValue, activeCell } = this.state.ui;
        const value = inputValue === '' ? null : parseInt(inputValue, 10);
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const validationRules = productStrategy.getValidationRules();
        const rule = validationRules[activeCell.column];

        if (rule && value !== null && (isNaN(value) || value < rule.min || value > rule.max)) {
            this.eventAggregator.publish('showNotification', { message: `${rule.name} must be between ${rule.min} and ${rule.max}.`, type: 'error' });
            this.state.ui.inputValue = '';
            this._publishStateChange();
            return;
        }

        const items = this.state.quoteData.rollerBlindItems;
        const targetItem = items[activeCell.rowIndex];

        if (targetItem) {
            if (targetItem[activeCell.column] !== value) {
                targetItem[activeCell.column] = value;
                targetItem.linePrice = null;
                this.state.ui.isSumOutdated = true;
            }
        }

        if (activeCell.rowIndex === items.length - 1 && (targetItem.width || targetItem.height)) {
            const newItem = productStrategy.getInitialItemData();
            items.push(newItem);
        }

        this.state.ui.inputValue = '';
        this._handleMoveActiveCell({ direction: 'down' });
    }

    _handleTableCellClick({ rowIndex, column }) {
        this.state.ui.selectedRowIndex = null;
        const item = this.state.quoteData.rollerBlindItems[rowIndex];
        if (!item) return;

        if (column === 'width' || column === 'height') {
            this.state.ui.activeCell = { rowIndex, column };
            this.state.ui.inputMode = column;
            this.state.ui.inputValue = String(item[column] || '');
            this._publishStateChange();
        } else if (column === 'TYPE') {
            this.state.ui.activeCell = { rowIndex, column };
            const TYPE_SEQUENCE = ['BO', 'BO1', 'SN'];
            const currentType = item.fabricType;
            const currentIndex = TYPE_SEQUENCE.indexOf(currentType);
            const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
            if (item.fabricType !== nextType) {
                item.fabricType = nextType;
                item.linePrice = null;
                this.state.ui.isSumOutdated = true;
            }
            this._publishStateChange();
        }
    }

    _handleSequenceCellClick({ rowIndex }) { this.state.ui.selectedRowIndex = (this.state.ui.selectedRowIndex === rowIndex) ? null : rowIndex; this._publishStateChange(); }

    _handleInsertRow() {
        const { selectedRowIndex } = this.state.ui;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row by clicking its number before inserting.' });
            return;
        }
        const items = this.state.quoteData.rollerBlindItems;
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const newItem = productStrategy.getInitialItemData();
        const newRowIndex = selectedRowIndex + 1;
        items.splice(newRowIndex, 0, newItem);

        this.state.ui.activeCell = { rowIndex: newRowIndex, column: 'width' };
        this.state.ui.inputMode = 'width';
        this.state.ui.selectedRowIndex = null;

        this._publishStateChange();

        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    _handleDeleteRow() {
        const { selectedRowIndex } = this.state.ui;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row by clicking its number before deleting.' });
            return;
        }
        const items = this.state.quoteData.rollerBlindItems;
        if (items.length > 1) {
            items.splice(selectedRowIndex, 1);
        } else {
            const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
            items[0] = productStrategy.getInitialItemData();
        }
        this.state.ui.selectedRowIndex = null;
        this.state.ui.isSumOutdated = true;

        this.state.ui.activeCell = { rowIndex: items.length - 1, column: 'width' };

        this._publishStateChange();

        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    _handleReset() { const message = "This will clear all data. Are you sure?"; if (window.confirm(message)) { this.state = this._getInitialState(); this._publishStateChange(); this.eventAggregator.publish('showNotification', { message: 'Quote has been reset.' }); } }

    _handleClearRow() {
        const { selectedRowIndex } = this.state.ui;
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row to clear.', type: 'error' });
            return;
        }
        const itemToClear = this.state.quoteData.rollerBlindItems[selectedRowIndex];
        if (itemToClear) {
            itemToClear.width = null; itemToClear.height = null; itemToClear.fabricType = null; itemToClear.linePrice = null;
            
            // [新增] 清空後，自動瞄準該橫行的寬度格
            this.state.ui.activeCell = { rowIndex: selectedRowIndex, column: 'width' };
            this.state.ui.selectedRowIndex = null;
            this.state.ui.isSumOutdated = true;
            this._publishStateChange();
        }
    }

    _handleMoveActiveCell({ direction }) {
        let { rowIndex, column } = this.state.ui.activeCell;
        const items = this.state.quoteData.rollerBlindItems;
        const navigableColumns = ['width', 'height', 'TYPE'];
        let columnIndex = navigableColumns.indexOf(column);

        switch (direction) {
            case 'up': rowIndex = Math.max(0, rowIndex - 1); break;
            case 'down': rowIndex = Math.min(items.length - 1, rowIndex + 1); break;
            case 'left': columnIndex = Math.max(0, columnIndex - 1); break;
            case 'right': columnIndex = Math.min(navigableColumns.length - 1, columnIndex + 1); break;
        }

        column = navigableColumns[columnIndex];
        this.state.ui.activeCell = { rowIndex, column };
        this.state.ui.inputMode = (column === 'width' || column === 'height') ? column : this.state.ui.inputMode;
        this.state.ui.selectedRowIndex = null;

        const currentItem = items[rowIndex];
        if (currentItem && (column === 'width' || column === 'height')) {
            this.state.ui.inputValue = String(currentItem[column] || '');
        } else {
            this.state.ui.inputValue = '';
        }

        this._publishStateChange();
    }

    _handleCycleType() {
        const items = this.state.quoteData.rollerBlindItems;
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
            this.state.ui.isSumOutdated = true;
            this._publishStateChange();
        }
    }

    _handleCalculateAndSum() {
        const items = this.state.quoteData.rollerBlindItems;
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        let firstError = null;

        items.forEach((item, index) => {
            item.linePrice = null;

            if (item.width && item.height && item.fabricType) {
                const priceMatrix = this.configManager.getPriceMatrix(item.fabricType);
                const result = productStrategy.calculatePrice(item, priceMatrix);
                if (result.price !== null) {
                    item.linePrice = result.price;
                } else if (result.error && !firstError) {
                    const errorColumn = result.error.toLowerCase().includes('width') ? 'width' : 'height';
                    firstError = {
                        message: `Row ${index + 1}: ${result.error}`,
                        rowIndex: index,
                        column: errorColumn
                    };
                }
            }
        });

        const totalSum = items.reduce((sum, item) => sum + (item.linePrice || 0), 0);
        this.state.quoteData.summary.totalSum = totalSum;

        if (firstError) {
            this.state.ui.isSumOutdated = true;
            this._publishStateChange();

            this.eventAggregator.publish('showNotification', { message: firstError.message, type: 'error' });
            this.state.ui.activeCell = { rowIndex: firstError.rowIndex, column: firstError.column };
        } else {
            this.state.ui.isSumOutdated = false;
        }

        this._publishStateChange();
    }
}