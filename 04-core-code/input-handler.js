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
        this._setupPhysicalKeyboard(); // --- [新增] 初始化實體鍵盤監聽 ---
    }
    
    // --- [新增] 實體鍵盤監聽的完整邏輯 ---
    _setupPhysicalKeyboard() {
        window.addEventListener('keydown', (event) => {
            // 如果焦點在任何 input 或 textarea 中，則不觸發快捷鍵，以備未來擴充
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            let keyToPublish = null;
            let eventToPublish = 'numericKeyPressed'; // 預設發布數字鍵盤事件

            // 處理數字鍵 0-9 (包括數字鍵盤和主鍵盤)
            if (event.key >= '0' && event.key <= '9') {
                keyToPublish = event.key;
            } 
            // 處理功能鍵
            else {
                switch (event.key.toLowerCase()) {
                    case 'w':
                        keyToPublish = 'W';
                        break;
                    case 'h':
                        keyToPublish = 'H';
                        break;
                    case 'enter':
                        keyToPublish = 'ENT';
                        event.preventDefault(); // 防止 Enter 鍵觸發瀏覽器預設行為 (如表單提交)
                        break;
                    case 'backspace':
                        keyToPublish = 'DEL';
                        event.preventDefault(); // 防止退位鍵觸發瀏覽器返回上一頁
                        break;
                    case 'delete':
                        // 對應到我們的「清空本列 (C)」功能
                        eventToPublish = 'userRequestedClearRow';
                        break;
                }
            }

            // 如果有需要發布的事件，就發布它
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
            clearButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedClearRow');
            });
        }
        const sumButton = document.getElementById('key-sum');
        if (sumButton) {
            sumButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedSummation');
            });
        }
        const insertButton = document.getElementById('key-insert');
        if (insertButton) {
            insertButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedInsertRow');
});
        }
        const deleteButton = document.getElementById('key-delete');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedDeleteRow');
            });
        }
        const saveButton = document.getElementById('key-save');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedSave');
            });
        }
        const loadButton = document.getElementById('key-load');
        const fileLoader = document.getElementById('file-loader');
        if (loadButton && fileLoader) {
            loadButton.addEventListener('click', () => {
                fileLoader.click();
            });
        }
        const exportCsvButton = document.getElementById('key-export-csv');
        if (exportCsvButton) {
            exportCsvButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedExportCSV');
            });
        }
        const resetButton = document.getElementById('key-reset');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedReset');
            });
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
                    if (column === 'Price') {
                        this.eventAggregator.publish('userRequestedPriceCalculation');
                    } else if (column !== 'sequence') {
                        this.eventAggregator.publish('tableHeaderClicked', { column });
                    }
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