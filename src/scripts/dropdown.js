// Case Studies Dropdown Navigation
// Handles click/keyboard interaction for the Case Studies dropdown menu

document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.querySelector('.nav-dropdown');
    const toggle = document.querySelector('.nav-dropdown-toggle');
    const menu = document.querySelector('.nav-dropdown-menu');

    if (!dropdown || !toggle || !menu) return;

    // Toggle dropdown on click
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
            toggle.focus();
        }
    });

    // Keyboard navigation
    toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                closeDropdown();
            } else {
                openDropdown();
            }
        }
    });

    // Get all focusable elements in the menu
    const menuLinks = menu.querySelectorAll('a');

    function openDropdown() {
        toggle.setAttribute('aria-expanded', 'true');
        menu.setAttribute('aria-hidden', 'false');
        dropdown.setAttribute('aria-expanded', 'true');
        // Make links focusable
        menuLinks.forEach(link => link.removeAttribute('tabindex'));
    }

    function closeDropdown() {
        toggle.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
        dropdown.setAttribute('aria-expanded', 'false');
        // Make links not focusable when hidden
        menuLinks.forEach(link => link.setAttribute('tabindex', '-1'));
    }

    // Initialize links as not focusable (menu starts hidden)
    menuLinks.forEach(link => link.setAttribute('tabindex', '-1'));

    // Active state logic for Case Studies dropdown
    // When on Field Notes or Still Goods (including subdomains), Case Studies appears active
    const currentHost = window.location.hostname;
    const isProjectSite = currentHost.includes('notes.scottbertrand') ||
                         currentHost.includes('goods.scottbertrand');

    if (isProjectSite) {
        toggle.classList.add('active');
    }
});
