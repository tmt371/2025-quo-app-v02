// /04-core-code/services/quote-service.spec.js

import { QuoteService } from './quote-service.js';

// --- Mock Dependencies ---
const mockInitialItem = {
    itemId: 'item-1', width: null, height: null, fabricType: null, linePrice: null
};

const mockProductStrategy = {
    getInitialItemData: () => ({ ...mockInitialItem, itemId: `item-${Date.now()}` })
};

const mockProductFactory = {
    getProductStrategy: () => mockProductStrategy
};

const getMockInitialState = () => ({
    quoteData: {
        rollerBlindItems: [{ ...mockInitialItem }],
        summary: { totalSum: 0 }
    }
});


// --- Test Suite ---
describe('QuoteService', () => {
    let quoteService;

    beforeEach(() => {
        quoteService = new QuoteService({
            initialState: getMockInitialState(),
            productFactory: mockProductFactory
        });
    });

    it('should initialize with a single empty row', () => {
        const items = quoteService.getItems();
        expect(items).toHaveLength(1);
        expect(items[0]).toEqual(mockInitialItem);
    });

    it('should insert a new row at the correct position', () => {
        quoteService.insertRow(0); // Insert after the first row (index 0)
        const items = quoteService.getItems();
        expect(items).toHaveLength(2);
        expect(items[1].itemId).not.toBe(items[0].itemId); // Ensure it's a new item
    });

    it('should delete a row and maintain a single empty row at the end', () => {
        quoteService.updateItemValue(0, 'width', 1000); // Add data to the first row
        quoteService.insertRow(0);
        quoteService.updateItemValue(1, 'width', 2000); // Add data to the second row

        let items = quoteService.getItems();
        expect(items).toHaveLength(3); // [row with data, row with data, empty row]

        quoteService.deleteRow(0); // Delete the first row
        items = quoteService.getItems();
        expect(items).toHaveLength(2); // [row with data, empty row]
        expect(items[0].width).toBe(2000);
    });

    it('should clear the last row with data instead of deleting it', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        let items = quoteService.getItems();
        expect(items).toHaveLength(2); // [row with data, empty row]
        
        // Per logic, deleting the last row with data should just clear it
        quoteService.deleteRow(0);
        items = quoteService.getItems();
        expect(items).toHaveLength(1); // The cleared row becomes the single empty row
        expect(items[0].width).toBeNull();
    });
    
    it('should ensure only one empty row exists at the end after updates', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        const items = quoteService.getItems();
        expect(items).toHaveLength(2); // Should automatically add an empty row

        quoteService.updateItemValue(1, 'width', 2000);
        expect(items).toHaveLength(3); // Should add another empty row

        // Now, let's test consolidation
        quoteService.deleteRow(1); // Delete the second row
        expect(items).toHaveLength(2); // [row with data, empty row]
    });
});