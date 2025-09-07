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
        this.mDelButton = document.getElementById('key-f5');
        const clearButtonOnKeyboard = document.getElementById('key-clear');
        this.clearButton = clearButtonOnKeyboard;
        
        // --- 實例化所有子元件 ---
        const tbodyElement = document.querySelector('.results-table tbody');
        this.tableComponent = new TableComponent(tbodyElement);

        const inputElement = document.getElementById('input-display-cell');
        this.headerComponent = new HeaderComponent(inputElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        // [舊] 右側功能面板 (PanelComponent)
        this.functionPanel = new PanelComponent({
            panelElement: document.getElementById('function-panel'),
            toggleElement: document.getElementById('function-panel-toggle'),
            eventAggregator: this.eventAggregator,
            expandedClass: 'is-expanded',
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
        // --- [新增] 初始化左盤的專屬邏輯 ---
        this._initializeLeftPanel();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
    }

    render(state) {
        this.headerComponent.render(state.ui.inputValue);
        this.tableComponent.render(state);
        this.summaryComponent.render(state.quoteData.summary, state.ui.isSumOutdated);
        this._updateButtonStates(state);
        this._scrollToActiveCell(state);
    }

    // --- [新增] 初始化左盤的所有互動與佈局邏輯 ---
    _initializeLeftPanel() {
        const appContainer = document.querySelector('.app-container');
        const leftPanel = document.getElementById('left-panel');
        const leftPanelToggle = document.getElementById('left-panel-toggle');
        const numericKeyboard = document.getElementById('numeric-keyboard-panel');
        const key7 = document.getElementById('key-7'); // 用於垂直對齊的參考點

        if (!leftPanel || !leftPanelToggle) return;

        // 負責動態計算佈局的函數
        const adjustLayout = () => {
            if (!appContainer || !numericKeyboard || !key7 || !leftPanel) return;

            const containerRect = appContainer.getBoundingClientRect();
            const key7Rect = key7.getBoundingClientRect();
            const rightPageMargin = 40;

            leftPanel.style.left = containerRect.left + 'px';
            const newWidth = containerRect.width - rightPageMargin;
            leftPanel.style.width = newWidth + 'px';
            leftPanel.style.top = key7Rect.top + 'px';
            
            // 精確計算鍵盤按鍵區的高度
            const keyHeight = key7Rect.height;
            const gap = 5; // 根據 CSS gap: 5px;
            const totalKeysHeight = (keyHeight * 4) + (gap * 3);
            leftPanel.style.height = totalKeysHeight + 'px';
        };

        // 綁定滑出/收回事件
        leftPanelToggle.addEventListener('click', () => {
            leftPanel.classList.toggle('is-expanded');
        });
        
        // 綁定分頁切換事件
        const tabs = leftPanel.querySelectorAll('.tab-button');
        const tabContents = leftPanel.querySelectorAll('.tab-content');
        const panelBgColors = {
            '#k1-content': 'var(--k1-bg-color)', '#k2-content': 'var(--k2-bg-color)',
            '#k3-content': 'var(--k3-bg-color)', '#k4-content': 'var(--k4-bg-color)',
            '#k5-content': 'var(--k5-bg-color)',
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetContent = document.querySelector(tab.dataset.tabTarget);
                if(targetContent) {
                    targetContent.classList.add('active');
                    leftPanel.style.backgroundColor = panelBgColors[tab.dataset.tabTarget];
                }
            });
        });

        // 初始載入和視窗大小改變時，都重新計算佈局
        adjustLayout();
        window.addEventListener('resize', adjustLayout);
    }

    _updateButtonStates(state) {
        const { selectedRowIndex, isMultiDeleteMode, multiDeleteSelectedIndexes } = state.ui;
        const items = state.quoteData.rollerBlindItems;
        const isSingleRowSelected = selectedRowIndex !== null;
        
        let insertDisabled = true;
        if (isSingleRowSelected) {
            const isLastRow = selectedRowIndex === items.length - 1;
            if (!isLastRow) {
                const nextItem = items[selectedRowIndex + 1];
                const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
                if (!isNextRowEmpty) { insertDisabled = false; }
            }
        }
        if (this.insertButton) this.insertButton.disabled = insertDisabled;

        let deleteDisabled = true;
        if (isMultiDeleteMode) {
            if (multiDeleteSelectedIndexes.size > 0) { deleteDisabled = false; }
        } else if (isSingleRowSelected) {
            const item = items[selectedRowIndex];
            const isLastRow = selectedRowIndex === items.length - 1;
            const isRowEmpty = !item.width && !item.height && !item.fabricType;
            if (!(isLastRow && isRowEmpty)) { deleteDisabled = false; }
        }
        if (this.deleteButton) this.deleteButton.disabled = deleteDisabled;
        
        const mDelDisabled = !isSingleRowSelected && !isMultiDeleteMode;
        if (this.mDelButton) {
            this.mDelButton.disabled = mDelDisabled;
            this.mDelButton.style.backgroundColor = isMultiDeleteMode ? '#f5c6cb' : '';
        }

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