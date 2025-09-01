// /04-core-code/ui/ui-manager.js

import { TableComponent } from './table-component.js';
import { HeaderComponent } from './header-component.js';
import { SummaryComponent } from './summary-component.js';
import { PanelComponent } from './panel-component.js';
import { NotificationComponent } from './notification-component.js';
import { DialogComponent } from './dialog-component.js';

export class UIManager {
    constructor(appElement, eventAggregator) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;

        // --- DOM 元素引用 ---
        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        this.mDelButton = document.getElementById('key-f5'); // [新增] M-Del 按鈕的引用
        const clearButtonOnKeyboard = document.getElementById('key-clear');
        this.clearButton = clearButtonOnKeyboard;
        
        // --- 實例化所有子元件 ---
        const tbodyElement = document.querySelector('.results-table tbody');
        this.tableComponent = new TableComponent(tbodyElement);

        const inputElement = document.getElementById('input-display-cell');
        this.headerComponent = new HeaderComponent(inputElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        this.functionPanel = new PanelComponent({
            panelElement: document.getElementById('function-panel'),
            toggleElement: document.getElementById('function-panel-toggle'),
            eventAggregator: this.eventAggregator,
            retractEventName: 'operationSuccessfulAutoHidePanel'
        });

        this.notificationComponent = new NotificationComponent({
            containerElement: document.getElementById('toast-container'),
            eventAggregator: this.eventAggregator
        });

        this.dialogComponent = new DialogComponent({
            overlayElement: document.getElementById('confirmation-dialog-overlay'),
            eventAggregator: this.eventAggregator
        });

        this.initialize();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
    }

    render(state) {
        this.headerComponent.render(state.ui.inputValue);
        // [修改] 將多選狀態傳遞給 TableComponent
        this.tableComponent.render(
            state.quoteData.rollerBlindItems, 
            state.ui.activeCell, 
            state.ui.selectedRowIndex,
            state.ui.isMultiDeleteMode,
            state.ui.multiDeleteSelectedIndexes
        );
        this.summaryComponent.render(state.quoteData.summary, state.ui.isSumOutdated);
        
        // [修改] 將渲染按鈕狀態所需的所有 state 傳遞下去
        this._updateButtonStates(state);
        this._scrollToActiveCell(state);
    }

    // [重構] 擴展此方法以處理所有複雜的按鈕禁用/啟用邏輯
    _updateButtonStates(state) {
        const { selectedRowIndex, isMultiDeleteMode, multiDeleteSelectedIndexes } = state.ui;
        const items = state.quoteData.rollerBlindItems;
        
        const isSingleRowSelected = selectedRowIndex !== null;
        
        // --- Insert Button Logic ---
        let insertDisabled = true;
        if (isSingleRowSelected) {
            const isLastRow = selectedRowIndex === items.length - 1;
            if (!isLastRow) {
                const nextItem = items[selectedRowIndex + 1];
                const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
                if (!isNextRowEmpty) {
                    insertDisabled = false;
                }
            }
        }
        if (this.insertButton) this.insertButton.disabled = insertDisabled;

        // --- Delete Button Logic ---
        let deleteDisabled = true;
        if (isMultiDeleteMode) {
            if (multiDeleteSelectedIndexes.size > 0) {
                deleteDisabled = false;
            }
        } else if (isSingleRowSelected) {
            const item = items[selectedRowIndex];
            const isLastRow = selectedRowIndex === items.length - 1;
            const isRowEmpty = !item.width && !item.height && !item.fabricType;
            if (!(isLastRow && isRowEmpty)) { // 如果不是「最後的空行」，則可刪除
                deleteDisabled = false;
            }
        }
        if (this.deleteButton) this.deleteButton.disabled = deleteDisabled;
        
        // --- M-Del Button Logic ---
        // 只有在單選模式下選中一個項目時才能啟用
        let mDelDisabled = !isSingleRowSelected;
        if (this.mDelButton) {
            this.mDelButton.disabled = mDelDisabled;
            // 進入多選模式後，按鈕變色以提示當前模式
            this.mDelButton.style.backgroundColor = isMultiDeleteMode ? '#f5c6cb' : ''; // 淡紅色
        }

        // --- Clear Button Logic ---
        // 只有在單選模式下選中一個項目時才能啟用
        if (this.clearButton) this.clearButton.disabled = !isSingleRowSelected;
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
    
    _toggleNumericKeyboard() {
        if (this.numericKeyboardPanel) {
            this.numericKeyboardPanel.classList.toggle('is-collapsed');
        }
    }
}