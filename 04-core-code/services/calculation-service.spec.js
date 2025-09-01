// /04-core-code/services/calculation-service.spec.js

import { CalculationService } from './calculation-service.js';

// --- Mock Dependencies ---
// 我們需要模擬 CalculationService 所依賴的模組
const mockProductStrategy = {
    calculatePrice: jest.fn((item, priceMatrix) => {
        if (!item.width || !item.height) {
            return { price: null, error: 'Incomplete data.' };
        }
        if (item.width > 3000) {
            return { price: null, error: 'Width exceeds maximum.' };
        }
        // 簡化版的計價邏輯，僅用於測試
        return { price: item.width * 0.1 + item.height * 0.2 };
    })
};

const mockConfigManager = {
    getPriceMatrix: jest.fn(() => ({
        // 回傳一個假的價格矩陣，內容不重要，因為計價邏輯已被 mock
    }))
};

// --- Test Suite ---
describe('CalculationService', () => {
    let calculationService;

    beforeEach(() => {
        // 在每個測試案例執行前，都建立一個新的 CalculationService 實例
        calculationService = new CalculationService({
            productFactory: null, // 在這個測試中用不到
            configManager: mockConfigManager
        });
        
        // 清除 mock 函數的歷史紀錄
        mockProductStrategy.calculatePrice.mockClear();
        mockConfigManager.getPriceMatrix.mockClear();
    });

    it('should correctly calculate and sum prices for valid items', () => {
        const quoteData = {
            rollerBlindItems: [
                { width: 1000, height: 1000, fabricType: 'BO', linePrice: null },
                { width: 2000, height: 1500, fabricType: 'BO', linePrice: null },
                { width: null, height: null, fabricType: null, linePrice: null }
            ],
            summary: { totalSum: 0 }
        };

        const { updatedQuoteData, firstError } = calculationService.calculateAndSum(quoteData, mockProductStrategy);

        // 驗證總價
        // 1000*0.1 + 1000*0.2 = 300
        // 2000*0.1 + 1500*0.2 = 500
        // total = 800
        expect(updatedQuoteData.summary.totalSum).toBe(800);

        // 驗證各行的價格
        expect(updatedQuoteData.rollerBlindItems[0].linePrice).toBe(300);
        expect(updatedQuoteData.rollerBlindItems[1].linePrice).toBe(500);

        // 驗證沒有錯誤回報
        expect(firstError).toBeNull();

        // 驗證依賴項的方法有被正確呼叫
        expect(mockConfigManager.getPriceMatrix).toHaveBeenCalledTimes(2);
        expect(mockProductStrategy.calculatePrice).toHaveBeenCalledTimes(2);
    });

    it('should return the first error encountered and skip invalid items', () => {
        const quoteData = {
            rollerBlindItems: [
                { width: 1000, height: 1000, fabricType: 'BO', linePrice: null },
                { width: 4000, height: 1500, fabricType: 'BO', linePrice: null }, // 錯誤行
                { width: 2000, height: 2000, fabricType: 'BO', linePrice: null }  // 應被計算
            ],
            summary: { totalSum: 0 }
        };

        const { updatedQuoteData, firstError } = calculationService.calculateAndSum(quoteData, mockProductStrategy);

        // 驗證總價只包含有效行的總和
        // 1000*0.1 + 1000*0.2 = 300
        // 2000*0.1 + 2000*0.2 = 600
        // total = 900
        expect(updatedQuoteData.summary.totalSum).toBe(900);

        // 驗證第一行價格正確，第二行價格為 null
        expect(updatedQuoteData.rollerBlindItems[0].linePrice).toBe(300);
        expect(updatedQuoteData.rollerBlindItems[1].linePrice).toBeNull();
        expect(updatedQuoteData.rollerBlindItems[2].linePrice).toBe(600);

        // 驗證回報了第一個遇到的錯誤
        expect(firstError).not.toBeNull();
        expect(firstError.rowIndex).toBe(1);
        expect(firstError.message).toContain('Width exceeds maximum.');
    });
});