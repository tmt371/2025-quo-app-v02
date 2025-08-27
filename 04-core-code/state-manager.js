// /04-core-code/state-manager.js

/**
 * @fileoverview The application's central orchestrator (controller).
 */

export class StateManager {
  constructor({ quoteModel, persistenceService, productFactory, configManager, eventAggregator }) {
    this.quoteModel = quoteModel
    this.persistenceService = persistenceService
    this.productFactory = productFactory
    this.configManager = configManager
    this.eventAggregator = eventAggregator

    this.uiState = {
      inputValue: "",
      inputMode: "width",
      isEditing: false,
      activeCell: { rowIndex: 0, column: "width" },
      selectedRowIndex: null,
    }

    console.log("StateManager (Orchestrator) Initialized.")
    this.initialize()
  }

  initialize() {
    this.eventAggregator.subscribe("numericKeyPressed", (data) => this._handleNumericKeyPress(data.key))
    this.eventAggregator.subscribe("tableCellClicked", (data) => this._handleTableCellClick(data))
    this.eventAggregator.subscribe("tableHeaderClicked", (data) => this._handleTableHeaderClick(data))
    this.eventAggregator.subscribe("sequenceCellClicked", (data) => this._handleSequenceCellClick(data))
    this.eventAggregator.subscribe("userRequestedInsertRow", () => this._handleInsertRow())
    this.eventAggregator.subscribe("userRequestedDeleteRow", () => this._handleDeleteRow())
    this.eventAggregator.subscribe("userRequestedPriceCalculation", () => this._handlePriceCalculationRequest())
    this.eventAggregator.subscribe("userRequestedSummation", () => this._handleSummationRequest())
    this.eventAggregator.subscribe("userRequestedSave", () => this._handleSave())
    this.eventAggregator.subscribe("userRequestedLoad", () => this._handleLoad())
  }

  _publishStateChange() {
    const fullState = {
      ui: this.uiState,
      quoteData: this.quoteModel.getQuoteData(),
    }

    // --- [修改] 移除偵錯日誌 ---
    // console.log("%cStateManager PUBLISHING state:", "color: blue; font-weight: bold;", fullState);

    this.eventAggregator.publish("stateChanged", fullState)
  }

  _handleNumericKeyPress(key) {
    if (!isNaN(Number.parseInt(key))) {
      this.uiState.inputValue += key
    } else if (key === "DEL") {
      this.uiState.inputValue = this.uiState.inputValue.slice(0, -1)
    } else if (key === "W" || key === "H") {
      this._changeInputMode(key === "W" ? "width" : "height")
      return // _changeInputMode 內部會 publish
    } else if (key === "ENT") {
      this._commitValue()
      return // _commitValue 內部會 publish
    }
    this._publishStateChange()
  }

  _commitValue() {
    const { inputValue, inputMode, activeCell, isEditing } = this.uiState
    const value = inputValue === "" ? null : Number.parseInt(inputValue, 10)
    const productStrategy = this.productFactory.getProductStrategy("rollerBlind")
    const validationRules = productStrategy.getValidationRules()
    const rule = validationRules[inputMode]
    if (value !== null && (isNaN(value) || value < rule.min || value > rule.max)) {
      this.eventAggregator.publish("showNotification", {
        message: `${rule.name} must be between ${rule.min} and ${rule.max}.`,
      })
      this.uiState.inputValue = ""
      this._publishStateChange()
      return
    }
    this.quoteModel.updateItemValue(activeCell.rowIndex, inputMode, value)
    if ((inputMode === "width" || inputMode === "height") && value === null) {
      this.quoteModel.updateItemValue(activeCell.rowIndex, "linePrice", null)
    }
    const items = this.quoteModel.getAllItems()
    const targetItem = items[activeCell.rowIndex]
    if (isEditing) {
      this.uiState.isEditing = false
    } else if (activeCell.rowIndex === items.length - 1 && (targetItem.width || targetItem.height)) {
      const newItem = productStrategy.getInitialItemData()
      this.quoteModel.insertItem(items.length, newItem)
    }
    this.uiState.inputValue = ""
    this._changeInputMode(inputMode)
  }
  _changeInputMode(mode) {
    this.uiState.inputMode = mode
    this.uiState.isEditing = false
    this.uiState.selectedRowIndex = null
    const items = this.quoteModel.getAllItems()
    const nextEmptyIndex = items.findIndex((item) => item[mode] === null || item[mode] === "")
    if (nextEmptyIndex !== -1) {
      this.uiState.activeCell = { rowIndex: nextEmptyIndex, column: mode }
    } else {
      this.uiState.activeCell = { rowIndex: items.length - 1, column: mode }
    }
    this._publishStateChange()
  }
  _handleTableCellClick({ rowIndex, column }) {
    this.uiState.selectedRowIndex = null
    const item = this.quoteModel.getItem(rowIndex)
    if (!item) return
    if (column === "width" || column === "height") {
      this.uiState.inputMode = column
      this.uiState.activeCell = { rowIndex, column }
      this.uiState.isEditing = true
      this.uiState.inputValue = String(item[column] || "")
    }
    if (column === "TYPE") {
      if (!item.width || !item.height) return
      const TYPE_SEQUENCE = ["BO", "BO1", "SN"]
      const currentIndex = TYPE_SEQUENCE.indexOf(item.fabricType)
      const nextIndex = (currentIndex + 1) % TYPE_SEQUENCE.length
      this.quoteModel.updateItemValue(rowIndex, "fabricType", TYPE_SEQUENCE[nextIndex])
    }
    this._publishStateChange()
  }
  _handleSequenceCellClick({ rowIndex }) {
    this.uiState.selectedRowIndex = this.uiState.selectedRowIndex === rowIndex ? null : rowIndex
    this._publishStateChange()
  }
  _handleInsertRow() {
    const { selectedRowIndex } = this.uiState
    if (selectedRowIndex === null) {
      this.eventAggregator.publish("showNotification", {
        message: "Please select a row by clicking its number before inserting.",
      })
      return
    }
    const items = this.quoteModel.getAllItems()
    const selectedItem = items[selectedRowIndex]
    if (selectedRowIndex === items.length - 1 && !selectedItem.width && !selectedItem.height) {
      this.eventAggregator.publish("showNotification", { message: "Cannot insert after the final empty row." })
      return
    }
    const productStrategy = this.productFactory.getProductStrategy("rollerBlind")
    const newItem = productStrategy.getInitialItemData()
    this.quoteModel.insertItem(selectedRowIndex + 1, newItem)
    this.uiState.selectedRowIndex = null
    this._publishStateChange()
  }
  _handleDeleteRow() {
    const { selectedRowIndex } = this.uiState
    if (selectedRowIndex === null) {
      this.eventAggregator.publish("showNotification", {
        message: "Please select a row by clicking its number before deleting.",
      })
      return
    }
    const items = this.quoteModel.getAllItems()
    const selectedItem = items[selectedRowIndex]
    if (items.length > 1 && selectedRowIndex === items.length - 1 && !selectedItem.width && !selectedItem.height) {
      this.eventAggregator.publish("showNotification", { message: "Cannot delete the final empty row." })
      return
    }
    this.quoteModel.deleteItem(selectedRowIndex)
    this.uiState.selectedRowIndex = null
    this._publishStateChange()
  }
  _handlePriceCalculationRequest() {
    const items = this.quoteModel.getAllItems()
    const productStrategy = this.productFactory.getProductStrategy("rollerBlind")
    let needsUpdate = false
    items.forEach((item, index) => {
      if (item.width && item.height && item.fabricType) {
        const priceMatrix = this.configManager.getPriceMatrix(item.fabricType)
        const result = productStrategy.calculatePrice(item, priceMatrix)
        if (result.price !== null) {
          this.quoteModel.updateItemValue(index, "linePrice", result.price)
          needsUpdate = true
        } else if (result.error) {
          this.eventAggregator.publish("showNotification", { message: result.error })
        }
      }
    })
    if (needsUpdate) {
      this._publishStateChange()
    }
  }
  _handleSummationRequest() {
    this.quoteModel.calculateTotalSum()
    this._publishStateChange()
  }
  _handleSave() {
    const quoteData = this.quoteModel.getQuoteData()
    const result = this.persistenceService.save(quoteData)
    if (result.success) {
      this.eventAggregator.publish("showNotification", { message: "Quote saved successfully!" })
    } else {
      this.eventAggregator.publish("showNotification", { message: "Error: Could not save quote.", type: "error" })
    }
  }
  _handleLoad() {
    const result = this.persistenceService.load()
    if (result.success && result.data) {
      this.quoteModel.data = result.data
      this._publishStateChange()
      this.eventAggregator.publish("showNotification", { message: "Quote loaded successfully!" })
    } else if (result.success && !result.data) {
      this.eventAggregator.publish("showNotification", { message: "No saved quote found." })
    } else {
      this.eventAggregator.publish("showNotification", { message: "Error: Could not load quote.", type: "error" })
    }
  }
  _handleTableHeaderClick() {}

  getState() {
    return {
      ui: this.uiState,
      quoteData: this.quoteModel.getQuoteData(),
    }
  }
}
