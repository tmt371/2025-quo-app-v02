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
                    case 't': this.eventAggregator.publish('userRequestedCycleType'); return;
                    case '$': this.eventAggregator.publish('userRequestedCalculateAndSum'); return;
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
        // [修改] 只保留數字鍵盤的 toggle 邏輯
        const numericToggle = document.getElementById('panel-toggle');
        if (numericToggle) {
            numericToggle.addEventListener('click', () => {
                this.eventAggregator.publish('userToggledNumericKeyboard');
            });
        }
        
        // --- [移除] ---
        // 關於 function-panel-toggle 的監聽已被移除，
        // 因為 PanelComponent 現在自己處理這個點擊事件。
    }

    _setupFunctionKeys() {
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
    }
    
    _setupNumericKeyboard() {
        const keyboard = document.getElementById('numeric-keyboard');
        if (!keyboard) return;

        const addButtonListener = (id, eventName, data = {}) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => {
                    this.eventAggregator.publish(eventName, data);
                });
            }
        };

        addButtonListener('key-7', 'numericKeyPressed', { key: '7' });
        addButtonListener('key-8', 'numericKeyPressed', { key: '8' });
        addButtonListener('key-9', 'numericKeyPressed', { key: '9' });
        addButtonListener('key-4', 'numericKeyPressed', { key: '4' });
        addButtonListener('key-5', 'numericKeyPressed', { key: '5' });
        addButtonListener('key-6', 'numericKeyPressed', { key: '6' });
        addButtonListener('key-1', 'numericKeyPressed', { key: '1' });
        addButtonListener('key-2', 'numericKeyPressed', { key: '2' });
        addButtonListener('key-3', 'numericKeyPressed', { key: '3' });
        addButtonListener('key-0', 'numericKeyPressed', { key: '0' });
        addButtonListener('key-del', 'numericKeyPressed', { key: 'DEL' });
        addButtonListener('key-enter', 'numericKeyPressed', { key: 'ENT' });

        addButtonListener('key-w', 'numericKeyPressed', { key: 'W' });
        addButtonListener('key-h', 'numericKeyPressed', { key: 'H' });
        
        addButtonListener('key-type', 'userRequestedCycleType');

        addButtonListener('key-clear', 'userRequestedClearRow');
        addButtonListener('key-price', 'userRequestedCalculateAndSum');
    }

    _setupTableInteraction() {
        const table = document.getElementById('results-table');
        if (table) {
            table.addEventListener('click', (event) => {
                const target = event.target;
                const isHeader = target.tagName === 'TH';
                const isCell = target.tagName === 'TD';
                
                if (target.id === 'input-display-cell') {
                    return;
                }

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