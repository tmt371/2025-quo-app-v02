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

        const currentProduct = 'rollerBlind'; // 未來此值可由外部傳入
        this.productStrategy = this.productFactory.getProductStrategy(currentProduct);
        this.itemListName = `${currentProduct}Items`; // e.g., 'rollerBlindItems'

        console.log("QuoteService Initialized.");
    }

    getQuoteData() {
        return this.quoteData;
    }

    /**
     * [新增] 提供一個通用的、公開的方法來取得當前產品的項目列表
     * @returns {Array} 當前產品的項目列表
     */
    getItems() {
        return this.quoteData[this.itemListName];
    }
    
    // --- 內部輔助方法，用於動態取得當前產品的項目列表 ---
    _getItems() {
        return this.quoteData[this.itemListName];
    }

    /**
     * Inserts a new row after the specified index.
     * @param {number} selectedIndex The index to insert after.
     * @returns {number} The index of the newly inserted row.
     */
    insertRow(selectedIndex) {
        const items = this._getItems();
        const newItem = this.productStrategy.getInitialItemData();
        const newRowIndex = selectedIndex + 1;
        items.splice(newRowIndex, 0, newItem);
        return newRowIndex;
    }

    /**
     * Deletes a row at the specified index.
     * @param {number} selectedIndex The index of the row to delete.
     */
    deleteRow(selectedIndex) {
        const items = this._getItems();
        const isLastRow = selectedIndex === items.length - 1;
        const item = items[selectedIndex];
        const isRowEmpty = !item.width && !item.height && !item.fabricType;

        if (isLastRow && !isRowEmpty) {
            this.clearRow(selectedIndex);
            return;
        }

        if (items.length === 1) {
            this.clearRow(selectedIndex);
            return;
        }

        items.splice(selectedIndex, 1);
    }

    /**
     * Clears all data from a row at the specified index.
     * @param {number} selectedIndex The index of the row to clear.
     */
    clearRow(selectedIndex) {
        const itemToClear = this._getItems()[selectedIndex];
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
        const targetItem = this._getItems()[rowIndex];
        if (!targetItem) return false;

        if (targetItem[column] !== value) {
            targetItem[column] = value;
            targetItem.linePrice = null;
            
            this.consolidateEmptyRows();
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
        const item = this._getItems()[rowIndex];
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
        const initialItem = this.productStrategy.getInitialItemData();
        this.quoteData = {
            [this.itemListName]: [initialItem],
            summary: { totalSum: null }
        };
    }

    /**
     * Checks if the current quote has any meaningful data.
     * @returns {boolean} True if there is data, false otherwise.
     */
    hasData() {
        const items = this._getItems();
        if (!items) return false;
        return items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
    }

    /**
     * Deletes multiple rows based on an array of indexes.
     * @param {Set<number>} indexesToDelete A Set of row indexes to delete.
     */
    deleteMultipleRows(indexesToDelete) {
        const sortedIndexes = [...indexesToDelete].sort((a, b) => b - a);

        sortedIndexes.forEach(index => {
            this.deleteRow(index);
        });

        this.consolidateEmptyRows();
    }

    /**
     * Ensures there is exactly one empty row at the end of the table.
     */
    consolidateEmptyRows() {
        const items = this._getItems();
        
        while (items.length > 1) {
            const lastItem = items[items.length - 1];
            const secondLastItem = items[items.length - 2];
            const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
            const isSecondLastItemEmpty = !secondLastItem.width && !secondLastItem.height && !secondLastItem.fabricType;

            if (isLastItemEmpty && isSecondLastItemEmpty) {
                items.pop();
            } else {
                break;
            }
        }

        const lastItem = items[items.length - 1];
        if (!lastItem) return;
        const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
        if (!isLastItemEmpty) {
            const newItem = this.productStrategy.getInitialItemData();
            items.push(newItem);
        }
    }
}