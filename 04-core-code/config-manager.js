// /04-core-code/config-manager.js

export class ConfigManager {
    constructor(eventAggregator) {
        this.eventAggregator = eventAggregator;
        this.priceMatrices = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // 我們依然使用之前確認過的、正確的檔案路徑
            const response = await fetch('./03-data-models/price-matrix-v1.0.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.priceMatrices = data.matrices;
            this.isInitialized = true;
            console.log("ConfigManager initialized and price matrices loaded successfully.");

        } catch (error) {
            console.error("Failed to load price matrices:", error);
            this.eventAggregator.publish('showNotification', { message: 'Error: Could not load the price list file!', type: 'error'});
        }
    }

    /**
     * [修改] 根據布料類型(BO, BO1, SN)直接獲取對應的價格矩陣
     * @param {string} fabricType - e.g., 'BO', 'BO1', 'SN'
     * @returns {object|null}
     */
    getPriceMatrix(fabricType) {
        if (!this.isInitialized || !this.priceMatrices) {
            console.error("ConfigManager not initialized or matrices not loaded.");
            return null;
        }
        
        // [修改] 移除中間的映射層，直接使用 fabricType 作為 Key 來查找
        // 程式碼從 `const matrixName = FABRIC_TYPE_TO_MATRIX_MAP[fabricType];`
        // 簡化為直接使用 `fabricType`
        return this.priceMatrices[fabricType] || null;
    }
}
