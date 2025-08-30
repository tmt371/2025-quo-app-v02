// /04-core-code/ui-manager.js

export class UIManager {
    constructor(appElement, eventAggregator, stateManager) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;
        this.stateManager = stateManager;

        this.inputDisplayCell = document.getElementById('input-display-cell');
        this.resultsTableBody = document.querySelector('.results-table tbody');
        this.totalSumValueElement = document.getElementById('total-sum-value');
        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.functionPanel = document.getElementById('function-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        
        const clearButtonOnKeyboard = document.getElementById('key-clear');
        const clearButtonOnSidePanel = document.querySelector('.function-grid #key-clear');
        this.clearButton = clearButtonOnKeyboard || clearButtonOnSidePanel;

        this.initialize();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
        this.eventAggregator.subscribe('userToggledFunctionKeyboard', () => this._toggleFunctionKeyboard());
        
        // [新增] 訂閱來自 StateManager 的操作成功事件，以自動收回面板
        this.eventAggregator.subscribe('operationSuccessfulAutoHidePanel', () => this._retractFunctionKeyboard());
    }

    render(state) {
        if (state.ui.currentView === 'QUICK_QUOTE') {
            this._renderQuickQuoteView(state);
        }
        this._scrollToActiveCell(state);
    }
    
    _scrollToActiveCell(state) {
        setTimeout(() => {
            const { rowIndex, column } = state.ui.activeCell;
            const activeCellElement = document.querySelector(`tr[data-row-index="${rowIndex}"] td[data-column="${column}"]`);
            if (activeCellElement) {
                activeCellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 0);
    }
    
    _renderQuickQuoteView(state) {
        const { selectedRowIndex, activeCell, inputValue, isSumOutdated } = state.ui;
        const { rollerBlindItems, summary } = state.quoteData;

        const isRowSelected = selectedRowIndex !== null;
        if (this.insertButton) this.insertButton.disabled = !isRowSelected;
        if (this.deleteButton) this.deleteButton.disabled = !isRowSelected;
        if (this.clearButton) this.clearButton.disabled = !isRowSelected;

        if (this.inputDisplayCell) {
            this.inputDisplayCell.value = inputValue || '';
        }

        if (this.resultsTableBody) {
            if (rollerBlindItems.length === 0 || (rollerBlindItems.length === 1 && !rollerBlindItems[0].width && !rollerBlindItems[0].height)) {
                this.resultsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: left; color: #888;">Enter dimensions to begin...</td></tr>`;
            } else {
                this.resultsTableBody.innerHTML = rollerBlindItems.map((item, index) => {
                    const isRowActive = index === activeCell.rowIndex;
                    const isSequenceSelected = index === selectedRowIndex;
                    
                    const sequenceCellClass = isSequenceSelected ? 'selected-row-highlight' : '';
                    const wCellClass = (isRowActive && activeCell.column === 'width') ? 'active-input-cell' : '';
                    const hCellClass = (isRowActive && activeCell.column === 'height') ? 'active-input-cell' : '';
                    const typeCellClass = (isRowActive && activeCell.column === 'TYPE') ? 'active-input-cell' : '';

                    let fabricTypeClass = '';
                    if (item.fabricType === 'BO1') fabricTypeClass = 'type-bo1';
                    else if (item.fabricType === 'SN') fabricTypeClass = 'type-sn';
                    
                    return `
                        <tr data-row-index="${index}">
                            <td data-column="sequence" class="col-sequence ${sequenceCellClass}">${index + 1}</td>
                            <td data-column="width" class="col-w ${wCellClass}">${item.width || ''}</td>
                            <td data-column="height" class="col-h ${hCellClass}">${item.height || ''}</td>
                            <td data-column="TYPE" class="col-type ${fabricTypeClass} ${typeCellClass}">${(item.width || item.height) ? (item.fabricType || '') : ''}</td>
                            <td data-column="Price" class="col-price price-cell">${item.linePrice ? item.linePrice.toFixed(2) : ''}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        if (this.totalSumValueElement) {
            const totalSum = summary ? summary.totalSum : null;
            if (typeof totalSum === 'number') {
                this.totalSumValueElement.textContent = totalSum.toFixed(2);
            } else {
                this.totalSumValueElement.textContent = '';
            }
            this.totalSumValueElement.classList.toggle('is-outdated', isSumOutdated);
            this.totalSumValueElement.classList.toggle('is-current', !isSumOutdated);
        }
    }
    
    _toggleNumericKeyboard() {
        if (this.numericKeyboardPanel) {
            this.numericKeyboardPanel.classList.toggle('is-collapsed');
        }
    }

    _toggleFunctionKeyboard() {
        if (this.functionPanel) {
            this.functionPanel.classList.toggle('is-expanded');
        }
    }
    
    // [新增] 只負責收回功能鍵盤的方法
    _retractFunctionKeyboard() {
        if (this.functionPanel) {
            this.functionPanel.classList.remove('is-expanded');
        }
    }
}