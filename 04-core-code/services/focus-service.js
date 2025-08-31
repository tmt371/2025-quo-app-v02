// /04-core-code/services/focus-service.js

/**
 * @fileoverview Service for managing input focus and active cell logic.
 */
export class FocusService {
    constructor() {
        console.log("FocusService Initialized.");
    }

    /**
     * Calculates the new active cell when W or H key is pressed.
     * Finds the first empty cell in the specified column.
     * @param {object} uiState The current UI state.
     * @param {object} quoteData The current quote data.
     * @param {string} column The column to focus ('width' or 'height').
     * @returns {object} The updated UI state.
     */
    focusFirstEmptyCell(uiState, quoteData, column) {
        const updatedUiState = { ...uiState };
        const items = quoteData.rollerBlindItems;
        const firstEmptyIndex = items.findIndex(item => !item[column]);
        const targetIndex = (firstEmptyIndex !== -1) ? firstEmptyIndex : items.length - 1;

        updatedUiState.activeCell = { rowIndex: targetIndex, column: column };
        updatedUiState.inputMode = column;
        updatedUiState.inputValue = '';
        return updatedUiState;
    }

    /**
     * Calculates the new active cell after a value is committed.
     * Moves focus down one row in the same column.
     * @param {object} uiState The current UI state.
     * @param {object} quoteData The current quote data.
     * @returns {object} The updated UI state.
     */
    focusAfterCommit(uiState, quoteData) {
        return this.moveActiveCell(uiState, quoteData, 'down');
    }

    /**
     * Calculates the new active cell after a row is deleted.
     * Moves focus to the width cell of the new last row.
     * @param {object} uiState The current UI state.
     * @param {object} quoteData The current quote data.
     * @returns {object} The updated UI state.
     */
    focusAfterDelete(uiState, quoteData) {
        const updatedUiState = { ...uiState };
        updatedUiState.activeCell = { rowIndex: quoteData.rollerBlindItems.length - 1, column: 'width' };
        return updatedUiState;
    }

    /**
     * Calculates the new active cell after a row is cleared.
     * Moves focus to the width cell of the cleared row.
     * @param {object} uiState The current UI state.
     * @returns {object} The updated UI state.
     */
    focusAfterClear(uiState) {
        const updatedUiState = { ...uiState };
        updatedUiState.activeCell = { rowIndex: uiState.selectedRowIndex, column: 'width' };
        return updatedUiState;
    }

    /**
     * Calculates the new active cell when an arrow key is pressed.
     * @param {object} uiState The current UI state.
     * @param {object} quoteData The current quote data.
     * @param {string} direction 'up', 'down', 'left', or 'right'.
     * @returns {object} The updated UI state.
     */
    moveActiveCell(uiState, quoteData, direction) {
        const updatedUiState = { ...uiState };
        let { rowIndex, column } = updatedUiState.activeCell;
        const items = quoteData.rollerBlindItems;
        const navigableColumns = ['width', 'height', 'TYPE'];
        let columnIndex = navigableColumns.indexOf(column);

        switch (direction) {
            case 'up': rowIndex = Math.max(0, rowIndex - 1); break;
            case 'down': rowIndex = Math.min(items.length - 1, rowIndex + 1); break;
            case 'left': columnIndex = Math.max(0, columnIndex - 1); break;
            case 'right': columnIndex = Math.min(navigableColumns.length - 1, columnIndex + 1); break;
        }
        
        column = navigableColumns[columnIndex];
        updatedUiState.activeCell = { rowIndex, column };
        updatedUiState.inputMode = (column === 'width' || column === 'height') ? column : updatedUiState.inputMode;
        updatedUiState.selectedRowIndex = null;
        
        const currentItem = items[rowIndex];
        if (currentItem && (column === 'width' || column === 'height')) {
            updatedUiState.inputValue = String(currentItem[column] || '');
        } else {
            updatedUiState.inputValue = '';
        }
        
        return updatedUiState;
    }
}