// /04-core-code/ui/table-component.js

/**
 * @fileoverview A dedicated component for rendering the results table body.
 */
export class TableComponent {
    constructor(tbodyElement) {
        if (!tbodyElement) {
            throw new Error("Table body element is required for TableComponent.");
        }
        this.tbody = tbodyElement;
        console.log("TableComponent Initialized.");
    }

    /**
     * Renders the table body based on the provided state object.
     * @param {object} state - The full application state containing quoteData and ui state.
     */
    render(state) {
        const { rollerBlindItems } = state.quoteData;
        const { activeCell, selectedRowIndex, isMultiDeleteMode, multiDeleteSelectedIndexes } = state.ui;

        if (rollerBlindItems.length === 0 || (rollerBlindItems.length === 1 && !rollerBlindItems[0].width && !rollerBlindItems[0].height)) {
            this.tbody.innerHTML = `<tr><td colspan="5" style="text-align: left; color: #888;">Enter dimensions to begin...</td></tr>`;
            return;
        }

        const rowsHtml = rollerBlindItems.map((item, index) => {
            const isRowActive = index === activeCell.rowIndex;
            
            let sequenceCellClass = '';
            const isLastRow = index === rollerBlindItems.length - 1;
            const isRowEmpty = !item.width && !item.height && !item.fabricType;

            if (isMultiDeleteMode) {
                if (isLastRow && isRowEmpty) {
                    sequenceCellClass = 'selection-disabled';
                } else if (multiDeleteSelectedIndexes.has(index)) {
                    sequenceCellClass = 'multi-selected-row';
                }
            } else {
                if (index === selectedRowIndex) {
                    sequenceCellClass = 'selected-row-highlight';
                }
            }

            const wCellClass = (isRowActive && activeCell.column === 'width') ? 'active-input-cell' : '';
            const hCellClass = (isRowActive && activeCell.column === 'height') ? 'active-input-cell' : '';
            const typeCellClass = (isRowActive && activeCell.column === 'TYPE') ? 'active-input-cell' : '';

            let fabricTypeClass = '';
            if (item.fabricType === 'BO1') fabricTypeClass = 'type-bo1';
            else if (item.fabricType === 'SN') fabricTypeClass = 'type-sn';
            
            return `
                <tr data-row-index="${index}">
                    <td data-column="sequence" class="col-sequence ${sequenceCellClass}">${index + 1}</td>
                    <td data-column="width" class="col-w ${wCellClass}">${item.width || ''}</td>
                    <td data-column="height" class="col-h ${hCellClass}">${item.height || ''}</td>
                    <td data-column="TYPE" class="col-type ${fabricTypeClass} ${typeCellClass}">${(item.width || item.height) ? (item.fabricType || '') : ''}</td>
                    <td data-column="Price" class="col-price price-cell">${item.linePrice ? item.linePrice.toFixed(2) : ''}</td>
                </tr>
            `;
        }).join('');

        this.tbody.innerHTML = rowsHtml;
    }
}