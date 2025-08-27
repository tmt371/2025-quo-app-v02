// /04-core-code/services/persistence-service.js

/**
 * @fileoverview A service module for handling data persistence.
 * It abstracts the logic of saving to and loading from web storage (localStorage).
 */

// 定義一個固定的金鑰，用於在 localStorage 中存取估價單資料
const LOCAL_STORAGE_KEY = 'rollerBlindQuoteData_v2';

export class PersistenceService {
    constructor() {
        console.log("PersistenceService Initialized.");
    }

    /**
     * Saves the provided quote data to localStorage.
     * @param {object} quoteData The quote data object to save.
     * @returns {{success: boolean, error?: any}} An object indicating the result.
     */
    save(quoteData) {
        try {
            const dataToSave = JSON.stringify(quoteData);
            localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
            console.log('Quote data saved to localStorage.');
            return { success: true };
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return { success: false, error: error };
        }
    }

    /**
     * Loads the quote data from localStorage.
     * @returns {{success: boolean, data?: object, error?: any}} An object with the result and data.
     */
    load() {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                const loadedQuoteData = JSON.parse(savedData);
                console.log('Quote data loaded from localStorage.');
                return { success: true, data: loadedQuoteData };
            } else {
                // 沒有找到存檔是正常情況，不算錯誤
                return { success: true, data: null };
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return { success: false, error: error };
        }
    }
}