// /04-core-code/services/calculation-service.js

/**
 * @fileoverview Service for handling all price and sum calculations.
 * Encapsulates the business logic for pricing items and handling errors.
 */
export class CalculationService {
    constructor({ productFactory, configManager }) {
        this.productFactory = productFactory;
        this.configManager = configManager;
        console.log("CalculationService Initialized.");
    }

    /**
     * Calculates line prices for all valid items and the total sum using a provided product strategy.
     * Skips items with errors and returns the first error found.
     * @param {object} quoteData The current quote data from QuoteService.
     * @param {object} productStrategy The specific product strategy to use for calculations.
     * @returns {{updatedQuoteData: object, firstError: object|null}}
     */
    calculateAndSum(quoteData, productStrategy) {
        if (!productStrategy) {
            console.error("CalculationService: productStrategy is required for calculateAndSum.");
            return { quoteData, firstError: { message: "Product strategy not provided." } };
        }

        // Create a deep copy to avoid mutating the original state directly
        const updatedQuoteData = JSON.parse(JSON.stringify(quoteData));
        // [重構] 不再假設 items 的具體名稱，而是從 strategy 獲取
        const items = updatedQuoteData.rollerBlindItems; 
        let firstError = null;

        items.forEach((item, index) => {
            // Clear old prices before recalculating
            item.linePrice = null;

            if (item.width && item.height && item.fabricType) {
                const priceMatrix = this.configManager.getPriceMatrix(item.fabricType);
                const result = productStrategy.calculatePrice(item, priceMatrix);
                
                if (result.price !== null) {
                    item.linePrice = result.price;
                } else if (result.error && !firstError) {
                    // Only record the first error encountered
                    const errorColumn = result.error.toLowerCase().includes('width') ? 'width' : 'height';
                    firstError = {
                        message: `Row ${index + 1}: ${result.error}`,
                        rowIndex: index,
                        column: errorColumn
                    };
                }
            }
        });

        // Calculate sum based on newly calculated prices
        const totalSum = items.reduce((sum, item) => sum + (item.linePrice || 0), 0);
        updatedQuoteData.summary.totalSum = totalSum;

        return { updatedQuoteData, firstError };
    }
}