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
        this._setupFileLoader(); // --- [新增] 初始化檔案載入器的監聽 ---
    }
    
    // --- [新增開始] ---
    /**
     * 設定隱藏的檔案輸入框的事件監聽
     */
    _setupFileLoader() {
        const fileLoader = document.getElementById('file-loader');
        if (fileLoader) {
            fileLoader.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) {
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    // 發布帶有檔案名稱和內容的事件
                    this.eventAggregator.publish('fileLoaded', {
                        fileName: file.name,
                        content: content
                    });
                };
                reader.onerror = () => {
                    this.eventAggregator.publish('showNotification', { message: `Error reading file: ${reader.error}`, type: 'error' });
                };
                reader.readAsText(file);

                // 清空 input 的 value，確保下次選擇同一個檔案也能觸發 change 事件
                event.target.value = '';
            });
        }
    }
    // --- [新增結束] ---

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

        // --- [修改] Load 按鈕現在觸發檔案選擇器 ---
        const loadButton = document.getElementById('key-load');
        const fileLoader = document.getElementById('file-loader');
        if (loadButton && fileLoader) {
            loadButton.addEventListener('click', () => {
                fileLoader.click(); // 模擬點擊隱藏的 input[type=file]
            });
        }

        // --- [新增] Export CSV 按鈕的事件監聽 ---
        const exportCsvButton = document.getElementById('key-export-csv');
        if (exportCsvButton) {
            exportCsvButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedExportCSV');
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