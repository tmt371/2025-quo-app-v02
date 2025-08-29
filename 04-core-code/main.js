// /04-core-code/main.js

import { EventAggregator } from './event-aggregator.js';
import { ConfigManager } from './config-manager.js';
import { InputHandler } from './input-handler.js';
import { UIManager } from './ui-manager.js';
import { StateManager } from './state-manager.js';

import { initialState } from './config/initial-state.js';
import { PersistenceService } from './services/persistence-service.js';
import { ProductFactory } from './strategies/product-factory.js';


class App {
    constructor() {
        this.eventAggregator = new EventAggregator();
        this.configManager = new ConfigManager(this.eventAggregator);
        this.inputHandler = new InputHandler(this.eventAggregator);
        
        const persistenceService = new PersistenceService();
        const productFactory = new ProductFactory();

        this.stateManager = new StateManager({
            initialState: initialState,
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

        // 訂閱核心事件
        this.eventAggregator.subscribe('stateChanged', (state) => {
            this.uiManager.render(state);
        });

        // --- [修改] 將 alert 替換為 Toast 通知系統 ---
        this.eventAggregator.subscribe('showNotification', (data) => {
            const toastContainer = document.getElementById('toast-container');
            if (!toastContainer) return;

            const toast = document.createElement('div');
            toast.className = 'toast-message';
            toast.textContent = data.message;

            // 如果通知帶有 'error' 類型，則添加錯誤樣式
            if (data.type === 'error') {
                toast.classList.add('error');
            }

            toastContainer.appendChild(toast);

            // 動畫結束後（4秒），將元素從 DOM 中移除，保持頁面乾淨
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