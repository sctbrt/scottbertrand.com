/**
 * Modal Manager
 * Handles Field Notes lightbox modal
 */
class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);

        if (!this.modal) return;

        this.triggers = document.querySelectorAll(`[data-modal="${modalId}"]`);
        this.closeButtons = this.modal.querySelectorAll('[data-close-modal]');

        this.init();
    }

    init() {
        // Open modal on trigger click
        this.triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
        });

        // Close modal on close button click
        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => this.close());
        });

        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    open() {
        this.modal.classList.add('active');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-active');
    }

    close() {
        this.modal.classList.remove('active');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-active');
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new Modal('stillGoodsModal');
});
