// /04-core-code/config/initial-state.js

/**
 * @fileoverview Defines the initial state of the application.
 * This structure serves as the default blueprint for the entire app's data.
 */

export const initialState = {
    ui: {
        currentView: 'QUICK_QUOTE',
        inputValue: '',
        inputMode: 'width',
        isEditing: false,
        activeCell: { rowIndex: 0, column: 'width' },
        selectedRowIndex: null, // 用於追蹤被項次選中的行
    },
    quoteData: {
        // 核心項目列表
        rollerBlindItems: [
            { 
                itemId: `item-${Date.now()}`, 
                width: null, 
                height: null, 
                fabricType: null, 
                linePrice: null 
            }
        ],
        // 報價單元數據 (未來擴充用)
        quoteId: null,
        issueDate: null,
        dueDate: null,
        status: "Configuring",
        customer: { 
            name: "",
            address: "",
            phone: "",
            email: ""
        },
        // 總價總結
        summary: { 
            totalSum: null
        }
    }
};