// /04-core-code/ui/panel-component.js

/**
 * @fileoverview A dedicated component for managing a slide-out panel's behavior.
 */
export class PanelComponent {
    /**
     * @param {HTMLElement} panelElement The main panel element.
     * @param {HTMLElement} toggleElement The button that toggles the panel.
     * @param {EventAggregator} eventAggregator The application's event bus.
     * @param {string} toggleEventName The event to listen for to toggle the panel.
     * @param {string} retractEventName The event to listen for to retract the panel.
     */
    constructor({ panelElement, toggleElement, eventAggregator, toggleEventName, retractEventName }) {
        if (!panelElement || !toggleElement || !eventAggregator) {
            throw new Error("Panel, toggle element, and event aggregator are required.");
        }
        this.panelElement = panelElement;
        this.toggleElement = toggleElement;
        this.eventAggregator = eventAggregator;
        this.toggleEventName = toggleEventName;
        this.retractEventName = retractEventName;

        this.initialize();
        console.log("PanelComponent Initialized for:", panelElement.id);
    }

    initialize() {
        // Listen for clicks on its own toggle button
        this.toggleElement.addEventListener('click', () => this.toggle());

        // Listen for global events that should affect this panel
        if (this.toggleEventName) {
            this.eventAggregator.subscribe(this.toggleEventName, () => this.toggle());
        }
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