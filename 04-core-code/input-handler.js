// /04-core-code/input-handler.js

export class InputHandler {
    constructor(eventAggregator) {
        this.eventAggregator = eventAggregator;
    }

    initialize() {
        this._setupNumericKeyboard();
        this._setupTableInteraction();
        this._setupFunctionKeys();
        this._setupPanelToggles();
        this._setupFileLoader();
        this._setupPhysicalKeyboard();
    }
    
    _setupPhysicalKeyboard() {
        window.addEventListener('keydown', (event) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            let keyToPublish = null;
            let eventToPublish = 'numericKeyPressed';
            const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (arrowKeys.includes(event.key)) {
                event.preventDefault();
                const direction = event.key.replace('Arrow', '').toLowerCase();
                this.eventAggregator.publish('userMovedActiveCell', { direction });
                return;
            }
            if (event.key >= '0' && event.key <= '9') {
                keyToPublish = event.key;
            } 
            else {
                switch (event.key.toLowerCase()) {
                    case 'w': keyToPublish = 'W'; break;
                    case 'h': keyToPublish = 'H'; break;
                    case 'enter': keyToPublish = 'ENT'; event.preventDefault(); break;
                    case 'backspace': keyToPublish = 'DEL'; event.preventDefault(); break;
                    case 'delete': eventToPublish = 'userRequestedClearRow'; break;
                }
            }
            if (keyToPublish !== null) {
                this.eventAggregator.publish(eventToPublish, { key: keyToPublish });
            } else if (eventToPublish === 'userRequestedClearRow') {
                this.eventAggregator.publish(eventToPublish);
            }
        });
    }

    _setupFileLoader() {
        const fileLoader = document.getElementById('file-loader');
        if (fileLoader) {
            fileLoader.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) { return; }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    this.eventAggregator.publish('fileLoaded', { fileName: file.name, content: content });
                };
                reader.onerror = () => {
                    this.eventAggregator.publish('showNotification', { message: `Error reading file: ${reader.error}`, type: 'error' });
                };
                reader.readAsText(file);
                event.target.value = '';
            });
        }
    }
    
    _setupPanelToggles() {
        const numericToggle = document.getElementById('panel-toggle');
        if (numericToggle) {
            numericToggle.addEventListener('click', () => {
                this.eventAggregator.publish('userToggledNumericKeyboard');
            });
        }
        const functionToggle = document.getElementById('function-panel-toggle');
        if (functionToggle) {
            functionToggle.addEventListener('click', () => {
                this.eventAggregator.publish('userToggledFunctionKeyboard');
            });
        }
    }

    _setupFunctionKeys() {
        const clearButton = document.getElementById('key-clear');
        if (clearButton) {
            clearButton.addEventListener('click', () => { this.eventAggregator.publish('userRequestedClearRow'); });
        }
        const sumButton = document.getElementById('key-sum');
        if (sumButton) {
            sumButton.addEventListener('click', () => { this.eventAggregator.publish('userRequestedSummation'); });
        }
        const insertButton = document.getElementById('key-insert');
        if (insertButton) {
            insertButton.addEventListener('click', () => { this.eventAggregator.publish('userRequestedInsertRow'); });
        }
        const deleteButton = document.getElementById('key-delete');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => { this.eventAggregator.publish('userRequestedDeleteRow'); });
        }
        const saveButton = document.getElementById('key-save');
        if (saveButton) {
            saveButton.addEventListener('click', () => { this.eventAggregator.publish('userRequestedSave'); });
        }
        const loadButton = document.getElementById('key-load');
        const fileLoader = document.getElementById('file-loader');
        if (loadButton && fileLoader) {
            loadButton.addEventListener('click', () => { fileLoader.click(); });
        }
        
        // --- [修改] 更新 Export 按鈕的 ID，並移除 Email 按鈕的監聽 ---
        const exportButton = document.getElementById('key-export');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedExportCSV');
            });
        }

        const resetButton = document.getElementById('key-reset');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedReset');
            });
        }

        // 批次設定布料款式
        const batchBoButton = document.getElementById('key-batch-bo');
        if (batchBoButton) {
            batchBoButton.addEventListener('click', () => { this.eventAggregator.publish('userBatchSetType', { fabricType: 'BO' }); });
        }
        const batchBo1Button = document.getElementById('key-batch-bo1');
        if (batchBo1Button) {
            batchBo1Button.addEventListener('click', () => { this.eventAggregator.publish('userBatchSetType', { fabricType: 'BO1' }); });
        }
        const batchSnButton = document.getElementById('key-batch-sn');
        if (batchSnButton) {
            batchSnButton.addEventListener('click', () => { this.eventAggregator.publish('userBatchSetType', { fabricType: 'SN' }); });
        }
        
        // 批次計算價格
        const batchPriceButton = document.getElementById('key-batch-price');
        if (batchPriceButton) {
            batchPriceButton.addEventListener('click', () => { this.eventAggregator.publish('userRequestedPriceCalculation'); });
        }
    }

    _setupNumericKeyboard() {
        const numericKeyboard = document.getElementById('numeric-keyboard');
        if (numericKeyboard) {
            numericKeyboard.addEventListener('click', (event) => {
                const button = event.target.closest('button');
                if (!button) return;
                const key = button.dataset.key;
                if (key) {
                    this.eventAggregator.publish('numericKeyPressed', { key });
                }
            });
        }
    }

    _setupTableInteraction() {
        const table = document.getElementById('results-table');
        if (table) {
            table.addEventListener('click', (event) => {
                const target = event.target;
                const isHeader = target.tagName === 'TH';
                const isCell = target.tagName === 'TD';
                if (!isHeader && !isCell) return;
                const column = target.dataset.column;
                if (isHeader) {
                    // 表頭點擊功能已全部轉移到鍵盤區
                } else {
                    const rowIndex = target.parentElement.dataset.rowIndex;
                    if (column === 'sequence') {
                        this.eventAggregator.publish('sequenceCellClicked', { 
                            rowIndex: parseInt(rowIndex, 10)
                        });
                    } else {
                        this.eventAggregator.publish('tableCellClicked', { 
                            rowIndex: parseInt(rowIndex, 10), 
                            column 
                        });
                    }
                }
            });
        }
    }
}