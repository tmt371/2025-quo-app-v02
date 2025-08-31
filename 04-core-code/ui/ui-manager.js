// /04-core-code/ui/ui-manager.js

import { TableComponent } from './table-component.js';
// [新增] 引入新的 HeaderComponent 和 SummaryComponent
import { HeaderComponent } from './header-component.js';
import { SummaryComponent } from './summary-component.js';

export class UIManager {
    constructor(appElement, eventAggregator) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;

        // --- DOM 元素引用保持不變 ---
        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.functionPanel = document.getElementById('function-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        const clearButtonOnKeyboard = document.getElementById('key-clear');
        this.clearButton = clearButtonOnKeyboard;

        // --- [修改] 實例化所有子元件 ---
        const tbodyElement = document.querySelector('.results-table tbody');
        this.tableComponent = new TableComponent(tbodyElement);

        const inputElement = document.getElementById('input-display-cell');
        this.headerComponent = new HeaderComponent(inputElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        this.initialize();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
        this.eventAggregator.subscribe('userToggledFunctionKeyboard', () => this._toggleFunctionKeyboard());
        this.eventAggregator.subscribe('operationSuccessfulAutoHidePanel', () => this._retractFunctionKeyboard());
    }

    // [重構] render 方法現在變得極其簡潔，只負責分派任務
    render(state) {
        // 1. 將 state 片段傳遞給對應的子元件
        this.headerComponent.render(state.ui.inputValue);
        this.tableComponent.render(state.quoteData.rollerBlindItems, state.ui.activeCell, state.ui.selectedRowIndex);
        this.summaryComponent.render(state.quoteData.summary, state.ui.isSumOutdated);
        
        // 2. UIManager 自身只保留不適合拆分的邏輯
        this._updateButtonStates(state.ui.selectedRowIndex);
        this._scrollToActiveCell(state);
    }

    _updateButtonStates(selectedRowIndex) {
        const isRowSelected = selectedRowIndex !== null;
        if (this.insertButton) this.insertButton.disabled = !isRowSelected;
        if (this.deleteButton) this.deleteButton.disabled = !isRowSelected;
        if (this.clearButton) this.clearButton.disabled = !isRowSelected;
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
    
    // --- 以下方法負責管理面板，屬於 UIManager 的核心職責，予以保留 ---
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
    
    _retractFunctionKeyboard() {
        if (this.functionPanel) {
            this.functionPanel.classList.remove('is-expanded');
        }
    }
}