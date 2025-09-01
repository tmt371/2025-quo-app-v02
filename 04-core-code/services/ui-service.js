// /04-core-code/services/ui-service.js

/**
 * @fileoverview A dedicated service for managing all UI-related state.
 * Acts as the single source of truth for the UI state.
 */
export class UIService {
    constructor(initialUIState) {
        // Use a deep copy to ensure the service has its own state object.
        this.state = JSON.parse(JSON.stringify(initialUIState));
        
        // Initialize states not present in the initial config
        this.state.isMultiDeleteMode = false;
        this.state.multiDeleteSelectedIndexes = new Set();
        
        console.log("UIService Initialized.");
    }

    /**
     * Returns the entire UI state object.
     * @returns {object} The current UI state.
     */
    getState() {
        return this.state;
    }

    /**
     * Resets the UI state to its initial condition.
     * @param {object} initialUIState - The initial UI state configuration.
     */
    reset(initialUIState) {
        this.state = JSON.parse(JSON.stringify(initialUIState));
        this.state.isMultiDeleteMode = false;
        this.state.multiDeleteSelectedIndexes = new Set();
    }

    /**
     * Sets the active cell in the UI.
     * @param {number} rowIndex 
     * @param {string} column 
     */
    setActiveCell(rowIndex, column) {
        this.state.activeCell = { rowIndex, column };
        this.state.inputMode = column;
    }

    /**
     * Sets the current value in the input display.
     * @param {string} value 
     */
    setInputValue(value) {
        this.state.inputValue = String(value || '');
    }

    /**
     * Appends a key to the current input value.
     * @param {string} key 
     */
    appendInputValue(key) {
        this.state.inputValue += key;
    }

    /**
     * Deletes the last character from the input value.
     */
    deleteLastInputChar() {
        this.state.inputValue = this.state.inputValue.slice(0, -1);
    }

    /**
     * Clears the input value.
     */
    clearInputValue() {
        this.state.inputValue = '';
    }

    /**
     * Toggles the selection of a single row.
     * @param {number} rowIndex 
     */
    toggleRowSelection(rowIndex) {
        this.state.selectedRowIndex = (this.state.selectedRowIndex === rowIndex) ? null : rowIndex;
    }

    /**
     * Clears any single row selection.
     */
    clearRowSelection() {
        this.state.selectedRowIndex = null;
    }

    /**
     * Toggles the multi-delete mode.
     */
    toggleMultiDeleteMode() {
        const isEnteringMode = !this.state.isMultiDeleteMode;
        this.state.isMultiDeleteMode = isEnteringMode;
        this.state.multiDeleteSelectedIndexes.clear();

        if (isEnteringMode && this.state.selectedRowIndex !== null) {
            this.state.multiDeleteSelectedIndexes.add(this.state.selectedRowIndex);
        }
        
        // Entering or exiting multi-delete mode clears single selection
        this.clearRowSelection();

        return isEnteringMode;
    }
    
    /**
     * Toggles the selection of a row in multi-delete mode.
     * @param {number} rowIndex 
     */
    toggleMultiDeleteSelection(rowIndex) {
        if (this.state.multiDeleteSelectedIndexes.has(rowIndex)) {
            this.state.multiDeleteSelectedIndexes.delete(rowIndex);
        } else {
            this.state.multiDeleteSelectedIndexes.add(rowIndex);
        }
    }

    /**
     * Sets the state of whether the total sum is outdated.
     * @param {boolean} isOutdated 
     */
    setSumOutdated(isOutdated) {
        this.state.isSumOutdated = isOutdated;
    }
}