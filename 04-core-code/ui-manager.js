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
        
        // --- [修改] 將呼叫移到 _renderQuickQuoteView 內部，確保在 innerHTML 更新後執行 ---
    }
    
    _scrollToActiveCell() {
        // --- [修改] 使用 setTimeout 延遲執行，確保 DOM 已更新 ---
        setTimeout(() => {
            const activeCellElement = document.querySelector('.active-input-cell');
            if (activeCellElement) {
                activeCellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 0); // 延遲 0 毫秒，足以將其推到下一個事件循環
    }

    _renderQuickQuoteView(state) {
        if (this.insertButton && this.deleteButton) {
            const isRowSelected = state.ui.selectedRowIndex !== null;
            const items = state.quoteData.rollerBlindItems;
            const hasOperableItems = items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
            
            this.insertButton.disabled = !isRowSelected;
            this.deleteButton.disabled = !isRowSelected || !hasOperableItems;
        }

        if (this.inputDisplay) {
            this.inputDisplay.textContent = state.ui.inputValue || '';
        }

        if (this.resultsTableBody) {
            const { rollerBlindItems } = state.quoteData;
            const { activeCell, selectedRowIndex } = state.ui; 
            if (rollerBlindItems.length === 0 || (rollerBlindItems.length === 1 && !rollerBlindItems[0].width && !rollerBlindItems[0].height)) {
                this.resultsTableBody.innerHTML = `<tr><td colspan="5" style="color: #888;">Please enter dimensions to begin...</td></tr>`;
            } else {
                this.resultsTableBody.innerHTML = rollerBlindItems.map((item, index) => {
                    const isWHighlighted = index === activeCell.rowIndex && activeCell.column === 'width';
                    const isHHighlighted = index === activeCell.rowIndex && activeCell.column === 'height';
                    
                    const isSequenceSelected = index === selectedRowIndex;
                    const sequenceCellClass = isSequenceSelected ? 'selected-row-highlight' : '';
                    let typeClass = '';
                    if (item.fabricType === 'BO1') {
                        typeClass = 'type-bo1';
                    } else if (item.fabricType === 'SN') {
                        typeClass = 'type-sn';
                    }
                    return `
                        <tr data-row-index="${index}">
                            <td data-column="sequence" class="${sequenceCellClass}">${index + 1}</td>
                            <td data-column="width" class="${isWHighlighted ? 'active-input-cell' : ''}">${item.width || ''}</td>
                            <td data-column="height" class="${isHHighlighted ? 'active-input-cell' : ''}">${item.height || ''}</td>
                            <td data-column="TYPE" class="${typeClass}">${(item.width || item.height) ? (item.fabricType || '') : ''}</td>
                            <td data-column="Price" class="text-right">${item.linePrice ? '$' + item.linePrice.toFixed(2) : ''}</td>
                        </tr>
                    `;
                }).join('');
            }
            // --- [修改] 在 innerHTML 被賦值後，才呼叫捲動方法 ---
            this._scrollToActiveCell();
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
    
    // ... 其他方法維持不變 ...
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