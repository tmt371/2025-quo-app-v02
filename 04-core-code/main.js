// /04-core-code/main.js

import { EventAggregator } from './event-aggregator.js';
import { ConfigManager } from './config-manager.js';
import { InputHandler } from './input-handler.js';
import { UIManager } from './ui-manager.js';
import { StateManager } from './state-manager.js';

import { initialState } from './config/initial-state.js';
import { PersistenceService } from './services/persistence-service.js';
import { ProductFactory } from './strategies/product-factory.js';

// --- [新增] 將自動儲存的金鑰也定義在此，確保與 StateManager 一致 ---
const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';

class App {
    constructor() {
        // --- [修改] 增加啟動時檢查自動儲存的邏輯 ---
        let startingState = JSON.parse(JSON.stringify(initialState)); // 使用深拷貝確保初始狀態純淨
        try {
            const autoSavedDataJSON = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
            if (autoSavedDataJSON) {
                const message = "It looks like you have unsaved work from a previous session.\n\n- 'OK' to restore the unsaved work.\n- 'Cancel' to start a new, blank quote.";
                if (window.confirm(message)) {
                    const autoSavedData = JSON.parse(autoSavedDataJSON);
                    startingState.quoteData = autoSavedData;
                    console.log("Restored data from auto-save.");
                } else {
                    // 如果使用者選擇不恢復，可以選擇性地清除草稿
                    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
                    console.log("Auto-saved data discarded by user.");
                }
            }
        } catch (error) {
            console.error("Failed to process auto-saved data:", error);
            localStorage.removeItem(AUTOSAVE_STORAGE_KEY); // 如果解析失敗，清除損壞的資料
        }
        // --- [修改結束] ---
        
        this.eventAggregator = new EventAggregator();
        this.configManager = new ConfigManager(this.eventAggregator);
        this.inputHandler = new InputHandler(this.eventAggregator);
        
        const persistenceService = new PersistenceService();
        const productFactory = new ProductFactory();

        // 使用我們剛剛決定好的 startingState 來初始化 StateManager
        this.stateManager = new StateManager({
            initialState: startingState,
            persistenceService: persistenceService,
            productFactory: productFactory,
            configManager: this.configManager,
            eventAggregator: this.eventAggregator
        });
        
        this.uiManager = new UIManager(
            document.getElementById('app'), 
            this.eventAggregator,
            this.stateManager
        );
    }

    async run() {
        console.log("Application starting with corrected architecture...");
        
        await this.configManager.initialize();

        this.eventAggregator.subscribe('stateChanged', (state) => {
            this.uiManager.render(state);
        });
        this.eventAggregator.subscribe('showNotification', (data) => {
            const toastContainer = document.getElementById('toast-container');
            if (!toastContainer) return;
            const toast = document.createElement('div');
            toast.className = 'toast-message';
            toast.textContent = data.message;
            if (data.type === 'error') {
                toast.classList.add('error');
            }
            toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.remove();
            }, 4000);
        });

        this.stateManager.publishInitialState(); 
        this.inputHandler.initialize(); 
        console.log("Application running and interactive.");
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.run();
});