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
import { FileService } from './services/file-service.js';
import { UIService } from './services/ui-service.js';


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
        this.inputHandler = new InputHandler(this.eventAggregator);
        
        const productFactory = new ProductFactory();

        // 1. 實例化所有獨立的 Service
        const quoteService = new QuoteService({
            initialState: startingState,
            productFactory: productFactory
        });
        
        const calculationService = new CalculationService({
            productFactory: productFactory,
            configManager: this.configManager
        });

        const fileService = new FileService();

        const uiService = new UIService(startingState.ui);

        // --- [重構] 將 uiService 和 quoteService 注入到 FocusService ---
        const focusService = new FocusService({
            uiService: uiService,
            quoteService: quoteService
        });

        // 2. 實例化 AppController，並注入所有它需要的 Service
        this.appController = new AppController({
            productFactory: productFactory,
            configManager: this.configManager,
            eventAggregator: this.eventAggregator,
            quoteService: quoteService,
            calculationService: calculationService,
            focusService: focusService,
            fileService: fileService,
            uiService: uiService
        });
        
        // 3. 實例化 UIManager
        this.uiManager = new UIManager(
            document.getElementById('app'), 
            this.eventAggregator
        );
    }

    async run() {
        console.log("Application starting with UI Service architecture...");
        
        await this.configManager.initialize();

        this.eventAggregator.subscribe('stateChanged', (state) => {
            this.uiManager.render(state);
        });
        
        this.appController.publishInitialState(); 
        this.inputHandler.initialize(); 
        console.log("Application running and interactive.");
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.run();
});