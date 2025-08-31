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
        console.log("InputHandler Initialized and all listeners are active.");
    }
    
    _setupPhysicalKeyboard() {
        window.addEventListener('keydown', (event) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            console.log(`Physical key pressed: ${event.key}`); // 偵錯日誌

            let keyToPublish = null;
            let eventToPublish = 'numericKeyPressed';
            const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (arrowKeys.includes(event.key)) {
                event.preventDefault();
                const direction = event.key.replace('Arrow', '').toLowerCase();
                console.log('InputHandler publishing:', 'userMovedActiveCell', { direction });
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
                    case 't': console.log('InputHandler publishing:', 'userRequestedCycleType'); this.eventAggregator.publish('userRequestedCycleType'); return;
                    case '$': console.log('InputHandler publishing:', 'userRequestedCalculateAndSum'); this.eventAggregator.publish('userRequestedCalculateAndSum'); return;
                    case 'enter': keyToPublish = 'ENT'; event.preventDefault(); break;
                    case 'backspace': keyToPublish = 'DEL'; event.preventDefault(); break;
                    case 'delete': eventToPublish = 'userRequestedClearRow'; break;
                }
            }
            if (keyToPublish !== null) {
                console.log('InputHandler publishing:', eventToPublish, { key: keyToPublish });
                this.eventAggregator.publish(eventToPublish, { key: keyToPublish });
            } else if (eventToPublish === 'userRequestedClearRow') {
                console.log('InputHandler publishing:', eventToPublish);
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
                    console.log('InputHandler publishing:', 'fileLoaded');
                    this.eventAggregator.publish('fileLoaded', { fileName: file.name, content: content });
                };
                reader.onerror = () => {
                    console.log('InputHandler publishing:', 'showNotification', 'Error reading file');
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
                console.log('InputHandler publishing:', 'userToggledNumericKeyboard');
                this.eventAggregator.publish('userToggledNumericKeyboard');
            });
        }
    }

    _setupFunctionKeys() {
        const setupButton = (id, eventName) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => {
                    console.log('InputHandler publishing:', eventName);
                    this.eventAggregator.publish(eventName);
                });
            }
        };

        setupButton('key-insert', 'userRequestedInsertRow');
        setupButton('key-delete', 'userRequestedDeleteRow');
        setupButton('key-save', 'userRequestedSave');
        setupButton('key-export', 'userRequestedExportCSV');
        setupButton('key-reset', 'userRequestedReset');

        const loadButton = document.getElementById('key-load');
        const fileLoader = document.getElementById('file-loader');
        if (loadButton && fileLoader) {
            loadButton.addEventListener('click', () => {
                console.log('Triggering file loader...');
                fileLoader.click();
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
                    console.log('InputHandler publishing:', eventName, data);
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
                
                if (target.id === 'input-display-cell') return;
                if (!isHeader && !isCell) return;

                const column = target.dataset.column;
                const rowIndex = target.parentElement.dataset.rowIndex;

                if (isCell) {
                    const eventData = { rowIndex: parseInt(rowIndex, 10), column };
                    if (column === 'sequence') {
                        console.log('InputHandler publishing:', 'sequenceCellClicked', eventData);
                        this.eventAggregator.publish('sequenceCellClicked', eventData);
                    } else {
                        console.log('InputHandler publishing:', 'tableCellClicked', eventData);
                        this.eventAggregator.publish('tableCellClicked', eventData);
                    }
                }
            });
        }
    }
}