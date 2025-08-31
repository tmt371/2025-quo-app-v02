// /04-core-code/main.js

import { EventAggregator } from './event-aggregator.js';
import { ConfigManager } from './config-manager.js';
import { InputHandler } from './input-handler.js';
import { UIManager } from './ui/ui-manager.js';
import { AppController } from './app-controller.js';

import { initialState } from './config/initial-state.js';
import { ProductFactory } from './strategies/product-factory.js';

import { QuoteService } from './services/quote-service.js';
import { CalculationService } from './services/calculation-service.js';
import { FocusService } from './services/focus-service.js';


const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';

class App {
    constructor() {
        let startingState = JSON.parse(JSON.stringify(initialState));
        try {
            const autoSavedDataJSON = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
            if (autoSavedDataJSON) {
                const message = "It looks like you have unsaved work from a previous session.\n\n- 'OK' to restore the unsaved work.\n- 'Cancel' to start a new, blank quote.";
                if (window.confirm(message)) {
                    const autoSavedData = JSON.parse(autoSavedDataJSON);
                    startingState.quoteData = autoSavedData;
                    console.log("Restored data from auto-save.");
                } else {
                    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
                    console.log("Auto-saved data discarded by user.");
                }
            }
        } catch (error) {
            console.error("Failed to process auto-saved data:", error);
            localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
        }
        
        this.eventAggregator = new EventAggregator();
        this.configManager = new ConfigManager(this.eventAggregator);
        // [修改] InputHandler 現在也移入 handlers/ 目錄 (雖然我們還沒建立，但先更新路徑)
        // 為了保持步驟清晰，我們這次只改 main.js 的邏輯，下次再移動檔案
        this.inputHandler = new InputHandler(this.eventAggregator);
        
        const productFactory = new ProductFactory();

        const quoteService = new QuoteService({
            initialState: startingState,
            productFactory: productFactory
        });
        
        const calculationService = new CalculationService({
            productFactory: productFactory,
            configManager: this.configManager
        });

        const focusService = new FocusService();

        this.appController = new AppController({
            initialState: startingState,
            productFactory: productFactory,
            configManager: this.configManager,
            eventAggregator: this.eventAggregator,
            quoteService: quoteService,
            calculationService: calculationService,
            focusService: focusService
        });
        
        this.uiManager = new UIManager(
            document.getElementById('app'), 
            this.eventAggregator
        );
    }

    async run() {
        console.log("Application starting with fully refactored architecture...");
        
        await this.configManager.initialize();

        // [修改] 只保留最核心的 stateChanged 事件訂閱
        this.eventAggregator.subscribe('stateChanged', (state) => {
            this.uiManager.render(state);
        });

        // --- [移除] ---
        // 關於 'showNotification' 的事件訂閱和 DOM 操作邏輯已被完全移除，
        // 因為它現在由 UIManager 內部的 NotificationComponent 全權負責。
        
        this.appController.publishInitialState(); 
        this.inputHandler.initialize(); 
        console.log("Application running and interactive.");
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.run();
});