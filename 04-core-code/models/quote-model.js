// /04-core-code/models/quote-model.js

/**
 * @fileoverview Manages the state and manipulation of the quote data.
 * Acts as the single source of truth for the application's data layer.
 */

export class QuoteModel {
    /**
     * @param {object} initialQuoteData - The initial data for the quote.
     */
    constructor(initialQuoteData) {
        this.data = initialQuoteData;
        console.log("QuoteModel Initialized.");
    }

    /**
     * Returns the entire quote data object.
     * @returns {object}
     */
    getQuoteData() {
        return this.data;
    }

    /**
     * Returns just the array of quote items.
     * @returns {Array<object>}
     */
    getAllItems() {
        return this.data.rollerBlindItems;
    }

    /**
     * Returns a specific item by its index.
     * @param {number} index
     * @returns {object|undefined}
     */
    getItem(index) {
        return this.data.rollerBlindItems[index];
    }

    /**
     * Inserts a new item at a specific index.
     * @param {number} index - The index at which to insert the new item.
     * @param {object} newItem - The new item object to insert.
     */
    insertItem(index, newItem) {
        this.data.rollerBlindItems.splice(index, 0, newItem);
    }

    /**
     * Deletes an item at a specific index.
     * If the list becomes empty, it adds a new blank item.
     * @param {number} index - The index of the item to delete.
     */
    deleteItem(index) {
        if (this.data.rollerBlindItems[index]) {
            this.data.rollerBlindItems.splice(index, 1);
        }
        // Ensure there's always at least one blank row to add to
        if (this.data.rollerBlindItems.length === 0) {
            this.data.rollerBlindItems.push({
                itemId: `item-${Date.now()}`,
                width: null, height: null, fabricType: null, linePrice: null
            });
        }
    }

    /**
     * Updates a specific property of an item at a given index.
     * @param {number} index - The index of the item to update.
     * @param {string} field - The name of the property to update (e.g., 'width', 'linePrice').
     * @param {any} value - The new value for the property.
     */
    updateItemValue(index, field, value) {
        const item = this.getItem(index);
        if (item) {
            item[field] = value;
        }
    }
    
    /**
     * Calculates the total sum of all line prices and updates the summary.
     */
    calculateTotalSum() {
        const total = this.data.rollerBlindItems.reduce((sum, item) => {
            return sum + (item.linePrice || 0);
        }, 0);
        
        this.data.summary = this.data.summary || {};
        this.data.summary.totalSum = total;
    }

    /**
     * Clears the total sum in the summary.
     */
    clearTotalSum() {
        if (this.data.summary) {
            this.data.summary.totalSum = null;
        }
    }
}