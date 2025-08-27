// /04-core-code/main.js

import { EventAggregator } from "./event-aggregator.js"
import { ConfigManager } from "./config-manager.js"
import { InputHandler } from "./input-handler.js"
import { UIManager } from "./ui-manager.js"
import { StateManager } from "./state-manager.js"

// 匯入所有新的模組
import { initialState } from "./config/initial-state.js"
import { QuoteModel } from "./models/quote-model.js"
import { PersistenceService } from "./services/persistence-service.js"
import { ProductFactory } from "./strategies/product-factory.js"

class App {
  constructor() {
    // --- [修改] 調整實例化順序並修正依賴注入 ---

    // 1. 建立核心通訊中樞
    this.eventAggregator = new EventAggregator()

    // 2. 建立無依賴或僅依賴 eventAggregator 的基礎模組
    this.configManager = new ConfigManager(this.eventAggregator)
    this.inputHandler = new InputHandler(this.eventAggregator)

    // 3. 建立新的、專門化的模組
    this.quoteModel = new QuoteModel(initialState.quoteData)
    this.persistenceService = new PersistenceService()
    this.productFactory = new ProductFactory()

    // 4. [順序調整] 先建立 StateManager，因為 UIManager 需要它
    this.stateManager = new StateManager({
      quoteModel: this.quoteModel,
      persistenceService: this.persistenceService,
      productFactory: this.productFactory,
      configManager: this.configManager,
      eventAggregator: this.eventAggregator,
    })

    // 5. [修正注入] 最後建立 UIManager，並將 stateManager 傳遞給它
    this.uiManager = new UIManager(
      document.getElementById("app"),
      this.eventAggregator,
      this.stateManager, // <--- 修正了這個關鍵的依賴注入
    )
  }

  async run() {
    console.log("Application starting with new architecture...")

    await this.configManager.initialize()

    // 訂閱核心事件
    this.eventAggregator.subscribe("stateChanged", (state) => {
      this.uiManager.render(state)
    })
    this.eventAggregator.subscribe("showNotification", (data) => {
      alert(data.message)
    })

    this.uiManager.initialize()

    // 觸發首次渲染
    this.stateManager._publishStateChange()

    // 初始化使用者輸入監聽
    this.inputHandler.initialize()

    console.log("Application running and interactive.")
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App()
  await app.run()
})
