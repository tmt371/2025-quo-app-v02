// /04-core-code/ui/dialog-component.js

/**
 * @fileoverview A component to manage the custom confirmation dialog.
 */
export class DialogComponent {
    constructor({ overlayElement, eventAggregator }) {
        if (!overlayElement || !eventAggregator) {
            throw new Error("Overlay element and event aggregator are required for DialogComponent.");
        }
        this.overlay = overlayElement;
        this.eventAggregator = eventAggregator;
        
        // Find buttons within the overlay
        this.saveLoadBtn = document.getElementById('dialog-btn-save-load');
        this.loadBtn = document.getElementById('dialog-btn-load');
        this.cancelBtn = document.getElementById('dialog-btn-cancel');

        this.initialize();
        console.log("DialogComponent Initialized.");
    }

    initialize() {
        // Listen for the event that tells this component to show itself
        this.eventAggregator.subscribe('showLoadConfirmationDialog', () => this.show());

        // Add click listeners to the buttons
        this.saveLoadBtn.addEventListener('click', () => {
            this.eventAggregator.publish('userChoseSaveThenLoad');
            this.hide();
        });

        this.loadBtn.addEventListener('click', () => {
            this.eventAggregator.publish('userChoseLoadDirectly');
            this.hide();
        });

        this.cancelBtn.addEventListener('click', () => {
            // No event needs to be published for cancel, just hide the dialog.
            this.hide();
        });

        // Allow clicking the background overlay to also cancel/hide.
        this.overlay.addEventListener('click', (event) => {
            if (event.target === this.overlay) {
                this.hide();
            }
        });
    }

    show() {
        this.overlay.classList.remove('is-hidden');
    }

    hide() {
        this.overlay.classList.add('is-hidden');
    }
}