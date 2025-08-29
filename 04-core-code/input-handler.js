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

            // --- [修改] 增加對方向鍵的處理 ---
            const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (arrowKeys.includes(event.key)) {
                event.preventDefault();
                const direction = event.key.replace('Arrow', '').toLowerCase();
                this.eventAggregator.publish('userMovedActiveCell', { direction });
                return; // 處理完方向鍵後結束
            }

            if (event.key >= '0' && event.key <= '9') {
                keyToPublish = event.key;
            } 
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
                        event.preventDefault();
                        break;
                    case 'backspace':
                        keyToPublish = 'DEL';
                        event.preventDefault();
                        break;
                    case 'delete':
                        eventToPublish = 'userRequestedClearRow';
                        break;
                }
            }

            if (keyToPublish !== null) {
                this.eventAggregator.publish(eventToPublish, { key: keyToPublish });
            } else if (eventToPublish === 'userRequestedClearRow') {
                this.eventAggregator.publish(eventToPublish);
            }
        });
    }

    _setupFunctionKeys() {
        // --- [修改] 移除 F1, F2，新增 BO, BO1, SN, $ 的事件監聽 ---
        
        // 批次設定布料款式
        const batchBoButton = document.getElementById('key-batch-bo');
        if (batchBoButton) {
            batchBoButton.addEventListener('click', () => {
                this.eventAggregator.publish('userBatchSetType', { fabricType: 'BO' });
            });
        }
        const batchBo1Button = document.getElementById('key-batch-bo1');
        if (batchBo1Button) {
            batchBo1Button.addEventListener('click', () => {
                this.eventAggregator.publish('userBatchSetType', { fabricType: 'BO1' });
            });
        }
        const batchSnButton = document.getElementById('key-batch-sn');
        if (batchSnButton) {
            batchSnButton.addEventListener('click', () => {
                this.eventAggregator.publish('userBatchSetType', { fabricType: 'SN' });
            });
        }
        
        // 批次計算價格
        const batchPriceButton = document.getElementById('key-batch-price');
        if (batchPriceButton) {
            batchPriceButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedPriceCalculation');
            });
        }

        // --- 以下為既有功能按鈕，維持不變 ---
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

    // ... 其他方法維持不變 ...
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
                        // 舊的 Price 表頭功能已由鍵盤上的 $ 按鈕取代
                        // this.eventAggregator.publish('userRequestedPriceCalculation');
                    } else if (column !== 'sequence' && column !== 'TYPE') {
                        // 舊的 TYPE 表頭功能也已由鍵盤按鈕取代
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