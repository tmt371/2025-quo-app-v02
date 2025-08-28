// /04-core-code/main.js

import { EventAggregator } from './event-aggregator.js';
import { ConfigManager } from './config-manager.js';
import { InputHandler } from './input-handler.js';
import { UIManager } from './ui-manager.js';
import { StateManager } from './state-manager.js';

// 匯入所有新的模組
import { initialState } from './config/initial-state.js';
// import { QuoteModel } from './models/quote-model.js'; // 註：暫時不使用 QuoteModel，將邏輯簡化回 StateManager
import { PersistenceService } from './services/persistence-service.js';
import { ProductFactory } from './strategies/product-factory.js';


class App {
    constructor() {
        // --- 修正後的模組實例化與依賴注入 ---

        // 1. 建立核心通訊中樞
        this.eventAggregator = new EventAggregator();
        
        // 2. 建立無依賴或僅依賴 eventAggregator 的基礎模組
        this.configManager = new ConfigManager(this.eventAggregator);
        this.inputHandler = new InputHandler(this.eventAggregator);
        
        // 3. 建立新的、專門化的服務和工廠
        const persistenceService = new PersistenceService();
        const productFactory = new ProductFactory();

        // 4. 建立 StateManager，並將完整的初始狀態和所有依賴傳遞給它
        this.stateManager = new StateManager({
            initialState: initialState, // <--- 關鍵修改：傳入完整的初始狀態
            persistenceService: persistenceService,
            productFactory: productFactory,
            configManager: this.configManager,
            eventAggregator: this.eventAggregator
        });
        
        // 5. 建立 UIManager
        this.uiManager = new UIManager(
            document.getElementById('app'), 
            this.eventAggregator,
            this.stateManager // 維持注入，以便 Email 功能使用
        );
    }

    async run() {
        console.log("Application starting with corrected architecture...");
        
        await this.configManager.initialize();

        // 訂閱核心事件
        this.eventAggregator.subscribe('stateChanged', (state) => {
            this.uiManager.render(state);
        });
        this.eventAggregator.subscribe('showNotification', (data) => {
            alert(data.message);
        });

        // [修改] 透過 StateManager 自身的方法來發布初始狀態，確保一致性
        this.stateManager.publishInitialState(); 

        // 初始化使用者輸入監聽
        this.inputHandler.initialize(); 

        console.log("Application running and interactive.");
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.run();
});