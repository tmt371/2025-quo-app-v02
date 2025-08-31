// /04-core-code/services/quote-service.js

/**
 * @fileoverview Service for managing quote data.
 * Acts as the single source of truth for the quoteData state object.
 * It contains all the business logic for mutating the quote data.
 */

export class QuoteService {
    constructor({ initialState, productFactory }) {
        // 使用深拷貝確保 QuoteService 擁有獨立的、純淨的資料狀態
        this.quoteData = JSON.parse(JSON.stringify(initialState.quoteData));
        this.productFactory = productFactory;
        console.log("QuoteService Initialized.");
    }

    getQuoteData() {
        return this.quoteData;
    }

    /**
     * Inserts a new row after the specified index.
     * @param {number} selectedIndex The index to insert after.
     * @returns {number} The index of the newly inserted row.
     */
    insertRow(selectedIndex) {
        const items = this.quoteData.rollerBlindItems;
        const newItem = this.productFactory.getProductStrategy('rollerBlind').getInitialItemData();
        const newRowIndex = selectedIndex + 1;
        items.splice(newRowIndex, 0, newItem);
        return newRowIndex;
    }

    /**
     * Deletes a row at the specified index.
     * @param {number} selectedIndex The index of the row to delete.
     */
    deleteRow(selectedIndex) {
        const items = this.quoteData.rollerBlindItems;
        if (items.length > 1) {
            items.splice(selectedIndex, 1);
        } else {
            // If it's the last row, just clear it instead of removing it.
            const initialItem = this.productFactory.getProductStrategy('rollerBlind').getInitialItemData();
            items[0] = initialItem;
        }
    }

    /**
     * Clears all data from a row at the specified index.
     * @param {number} selectedIndex The index of the row to clear.
     */
    clearRow(selectedIndex) {
        const itemToClear = this.quoteData.rollerBlindItems[selectedIndex];
        if (itemToClear) {
            itemToClear.width = null;
            itemToClear.height = null;
            itemToClear.fabricType = null;
            itemToClear.linePrice = null;
        }
    }

    /**
     * Updates a specific property of an item at a given index.
     * @param {number} rowIndex The index of the item.
     * @param {string} column The property to update ('width' or 'height').
     * @param {number|null} value The new value.
     * @returns {boolean} True if the value was changed, false otherwise.
     */
    updateItemValue(rowIndex, column, value) {
        const targetItem = this.quoteData.rollerBlindItems[rowIndex];
        if (!targetItem) return false;

        if (targetItem[column] !== value) {
            targetItem[column] = value;
            targetItem.linePrice = null; // Any change invalidates the price.
            
            // Auto-add a new row if the last row is being edited.
            if (rowIndex === this.quoteData.rollerBlindItems.length - 1 && (targetItem.width || targetItem.height)) {
                const newItem = this.productFactory.getProductStrategy('rollerBlind').getInitialItemData();
                this.quoteData.rollerBlindItems.push(newItem);
            }
            return true;
        }
        return false;
    }
    
    /**
     * Cycles the fabric type for an item at a given index.
     * @param {number} rowIndex The index of the item.
     * @returns {boolean} True if the type was changed, false otherwise.
     */
    cycleItemType(rowIndex) {
        const item = this.quoteData.rollerBlindItems[rowIndex];
        if (!item || (!item.width && !item.height)) return false;

        const TYPE_SEQUENCE = ['BO', 'BO1', 'SN'];
        const currentType = item.fabricType;
        const currentIndex = TYPE_SEQUENCE.indexOf(currentType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        
        if (item.fabricType !== nextType) {
            item.fabricType = nextType;
            item.linePrice = null;
            return true;
        }
        return false;
    }

    /**
     * Resets the entire quote data to its initial state.
     */
    reset() {
        const initialItem = this.productFactory.getProductStrategy('rollerBlind').getInitialItemData();
        this.quoteData = {
            rollerBlindItems: [initialItem],
            summary: { totalSum: null }
        };
    }
}