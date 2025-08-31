// /04-core-code/ui/header-component.js

/**
 * @fileoverview A dedicated component for rendering the header's input display cell.
 */
export class HeaderComponent {
    constructor(inputElement) {
        if (!inputElement) {
            throw new Error("Input element is required for HeaderComponent.");
        }
        this.inputDisplayCell = inputElement;
        console.log("HeaderComponent Initialized.");
    }

    /**
     * Renders the input value into the display cell.
     * @param {string} inputValue The value to display.
     */
    render(inputValue) {
        if (this.inputDisplayCell.value !== inputValue) {
            this.inputDisplayCell.value = inputValue || '';
        }
    }
}