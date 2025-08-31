// /04-core-code/ui/panel-component.js

/**
 * @fileoverview A dedicated component for managing a slide-out panel's behavior.
 */
export class PanelComponent {
    /**
     * @param {HTMLElement} panelElement The main panel element.
     * @param {HTMLElement} toggleElement The button that toggles the panel.
     * @param {EventAggregator} eventAggregator The application's event bus.
     * @param {string} retractEventName The event to listen for to retract the panel.
     */
    constructor({ panelElement, toggleElement, eventAggregator, retractEventName }) {
        if (!panelElement || !toggleElement || !eventAggregator) {
            throw new Error("Panel, toggle element, and event aggregator are required.");
        }
        this.panelElement = panelElement;
        this.toggleElement = toggleElement;
        this.eventAggregator = eventAggregator;
        this.retractEventName = retractEventName;

        this.initialize();
        console.log("PanelComponent Initialized for:", panelElement.id);
    }

    initialize() {
        // [修改] 元件現在直接監聽自己開關的點擊事件
        this.toggleElement.addEventListener('click', () => this.toggle());

        // [修改] 只監聽用於外部觸發「收回」的全局事件
        if (this.retractEventName) {
            this.eventAggregator.subscribe(this.retractEventName, () => this.retract());
        }
    }

    toggle() {
        if (this.panelElement) {
            this.panelElement.classList.toggle('is-expanded');
        }
    }

    retract() {
        if (this.panelElement) {
            this.panelElement.classList.remove('is-expanded');
        }
    }

    expand() {
        if (this.panelElement) {
            this.panelElement.classList.add('is-expanded');
        }
    }
}