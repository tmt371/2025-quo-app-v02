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

        this.initialize();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
        this.eventAggregator.subscribe('userToggledFunctionKeyboard', () => this._toggleFunctionKeyboard());
        this.eventAggregator.subscribe('userRequestedEmailQuote', () => this._handleEmailRequest());
    }

    render(state) {
        // --- [修改] 移除偵錯日誌 ---
        // console.log("%cUIManager RECEIVED state for rendering:", "color: green; font-weight: bold;", state);

        if (state.ui.currentView === 'QUICK_QUOTE') {
            this._renderQuickQuoteView(state);
        }
    }

    _renderQuickQuoteView(state) {
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
                    // --- [修改] 修正致命的拼寫錯誤 active-cell -> activeCell ---
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
                            <td data-column="width" class="${isWHighlighted ? 'highlighted-cell' : ''}">${item.width || ''}</td>
                            <td data-column="height" class="${isHHighlighted ? 'highlighted-cell' : ''}">${item.height || ''}</td>
                            <td data-column="TYPE" class="${typeClass}">${(item.width || item.height) ? (item.fabricType || '') : ''}</td>
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