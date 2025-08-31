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
     * Renders the table body based on the provided items and UI state.
     * @param {Array} items - The array of rollerBlindItems.
     * @param {object} activeCell - The currently active cell { rowIndex, column }.
     * @param {number|null} selectedRowIndex - The index of the selected row.
     */
    render(items, activeCell, selectedRowIndex) {
        if (items.length === 0 || (items.length === 1 && !items[0].width && !items[0].height)) {
            this.tbody.innerHTML = `<tr><td colspan="5" style="text-align: left; color: #888;">Enter dimensions to begin...</td></tr>`;
            return;
        }

        const rowsHtml = items.map((item, index) => {
            const isRowActive = index === activeCell.rowIndex;
            const isSequenceSelected = index === selectedRowIndex;
            
            const sequenceCellClass = isSequenceSelected ? 'selected-row-highlight' : '';
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