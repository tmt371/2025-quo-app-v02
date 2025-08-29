// /04-core-code/ui-manager.js

const COMPANY_EMAIL = "service@example.com";
const CUSTOMER_EMAIL = "";

export class UIManager {
    constructor(appElement, eventAggregator, stateManager) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;
        this.stateManager = stateManager;

        this.inputDisplay = document.getElementById('input-display');
        this.resultsTableBody = document.querySelector('.results-table tbody');
        this.totalSumValueElement = document.getElementById('total-sum-value');
        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.functionPanel = document.getElementById('function-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        this.clearButton = document.getElementById('key-clear'); // 新增 Clear 按鈕的引用

        this.initialize();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
        this.eventAggregator.subscribe('userToggledFunctionKeyboard', () => this._toggleFunctionKeyboard());
    }

    render(state) {
        if (state.ui.currentView === 'QUICK_QUOTE') {
            this._renderQuickQuoteView(state);
        }
        
        // --- [修改] 在每次渲染完成後，執行自動捲動 ---
        this._scrollToActiveCell(state);
    }
    
    // --- [新增] 自動捲動到可視區的核心方法 ---
    _scrollToActiveCell(state) {
        setTimeout(() => {
            const { rowIndex, column } = state.ui.activeCell;
            // 使用精確的選擇器找到目標儲存格
            const activeCellElement = document.querySelector(`tr[data-row-index="${rowIndex}"] td[data-column="${column}"]`);
            
            if (activeCellElement) {
                activeCellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 0);
    }

    _renderQuickQuoteView(state) {
        const { selectedRowIndex } = state.ui;
        // --- [修改] 將按鈕禁用邏輯移到此處統一管理 ---
        const isRowSelected = selectedRowIndex !== null;
        if (this.insertButton) this.insertButton.disabled = !isRowSelected;
        if (this.deleteButton) this.deleteButton.disabled = !isRowSelected;
        if (this.clearButton) this.clearButton.disabled = !isRowSelected;

        if (this.inputDisplay) {
            this.inputDisplay.textContent = state.ui.inputValue || '';
        }

        if (this.resultsTableBody) {
            const { rollerBlindItems } = state.quoteData;
            const { activeCell } = state.ui; 
            if (rollerBlindItems.length === 0 || (rollerBlindItems.length === 1 && !rollerBlindItems[0].width && !rollerBlindItems[0].height)) {
                this.resultsTableBody.innerHTML = `<tr><td colspan="5" style="color: #888;">Please enter dimensions to begin...</td></tr>`;
            } else {
                this.resultsTableBody.innerHTML = rollerBlindItems.map((item, index) => {
                    // --- [修改] 區分輸入焦點和選擇焦點 ---
                    const isInputCell = index === activeCell.rowIndex && (activeCell.column === 'width' || activeCell.column === 'height');
                    const isSelectCell = index === activeCell.rowIndex && activeCell.column === 'TYPE';

                    const isWHighlighted = isInputCell && activeCell.column === 'width';
                    const isHHighlighted = isInputCell && activeCell.column === 'height';
                    
                    const isSequenceSelected = index === selectedRowIndex;
                    const sequenceCellClass = isSequenceSelected ? 'selected-row-highlight' : '';

                    // 當儲存格是 TYPE 且被方向鍵選中時，也給予高亮
                    const typeCellClass = isSelectCell ? 'active-input-cell' : '';

                    let fabricTypeClass = '';
                    if (item.fabricType === 'BO1') {
                        fabricTypeClass = 'type-bo1';
                    } else if (item.fabricType === 'SN') {
                        fabricTypeClass = 'type-sn';
                    }
                    return `
                        <tr data-row-index="${index}">
                            <td data-column="sequence" class="${sequenceCellClass}">${index + 1}</td>
                            <td data-column="width" class="${isWHighlighted ? 'active-input-cell' : ''}">${item.width || ''}</td>
                            <td data-column="height" class="${isHHighlighted ? 'active-input-cell' : ''}">${item.height || ''}</td>
                            <td data-column="TYPE" class="${fabricTypeClass} ${typeCellClass}">${(item.width || item.height) ? (item.fabricType || '') : ''}</td>
                            <td data-column="Price" class="text-right">${item.linePrice ? '$' + item.linePrice.toFixed(2) : ''}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
        if (this.totalSumValueElement) {
            const totalSum = state.quoteData.summary ? state.quoteData.summary.totalSum : null;
            if (typeof totalSum === 'number') {
                this.totalSumValueElement.textContent = `$${totalSum.toFixed(2)}`;
            } else {
                this.totalSumValueElement.textContent = '';
            }
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

    _handleEmailRequest() {
        const state = this.stateManager.getState();
        const quoteData = state.quoteData;
        if (!quoteData || !quoteData.rollerBlindItems || quoteData.rollerBlindItems.length === 0) {
            this.eventAggregator.publish('showNotification', { message: 'There is no quote data to email.' });
            return;
        }
        const subject = "Ez Blinds Quotation";
        const body = this._formatQuoteForEmail(quoteData);
        const encodedBody = encodeURIComponent(body);
        const mailtoLink = `mailto:${CUSTOMER_EMAIL}?cc=${COMPANY_EMAIL}&subject=${subject}&body=${encodedBody}`;
        window.location.href = mailtoLink;
    }
    _formatQuoteForEmail(quoteData) {
        let content = "Hello,\n\nHere is your quotation from Ez Blinds:\n\n";
        content += "====================================\n";
        quoteData.rollerBlindItems.forEach((item, index) => {
            if (item.width && item.height) {
                const price = item.linePrice ? `$${item.linePrice.toFixed(2)}` : 'N/A';
                content += `#${index + 1}:\n`;
                content += `  - Width: ${item.width} mm\n`;
                content += `  - Height: ${item.height} mm\n`;
                content += `  - Fabric Type: ${item.fabricType || 'N/A'}\n`;
                content += `  - Price: ${price}\n\n`;
            }
        });
        content += "====================================\n";
        const totalSum = quoteData.summary ? quoteData.summary.totalSum : null;
        if (typeof totalSum === 'number') {
            content += `Total Sum: $${totalSum.toFixed(2)}\n\n`;
        }
        content += "Thank you for your business.\n\n";
        content += "Best regards,\nEz Blinds Team";
        return content;
    }
}