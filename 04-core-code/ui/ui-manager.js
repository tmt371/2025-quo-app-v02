// /04-core-code/ui/ui-manager.js

import { TableComponent } from './table-component.js';
import { HeaderComponent } from './header-component.js';
import { SummaryComponent } from './summary-component.js';
import { PanelComponent } from './panel-component.js';
import { NotificationComponent } from './notification-component.js';

export class UIManager {
    constructor(appElement, eventAggregator) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;

        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        const clearButtonOnKeyboard = document.getElementById('key-clear');
        this.clearButton = clearButtonOnKeyboard;
        
        const tbodyElement = document.querySelector('.results-table tbody');
        this.tableComponent = new TableComponent(tbodyElement);

        const inputElement = document.getElementById('input-display-cell');
        this.headerComponent = new HeaderComponent(inputElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        // [修改] 更新 PanelComponent 的實例化方式，移除 toggleEventName
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

        this.initialize();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
    }

    render(state) {
        this.headerComponent.render(state.ui.inputValue);
        this.tableComponent.render(state.quoteData.rollerBlindItems, state.ui.activeCell, state.ui.selectedRowIndex);
        this.summaryComponent.render(state.quoteData.summary, state.ui.isSumOutdated);
        
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
    
    _toggleNumericKeyboard() {
        if (this.numericKeyboardPanel) {
            this.numericKeyboardPanel.classList.toggle('is-collapsed');
        }
    }
}