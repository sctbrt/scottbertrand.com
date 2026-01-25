// Case Studies Dropdown Navigation
// Handles click/keyboard interaction for the Case Studies dropdown menu

document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.querySelector('.nav-dropdown');
    const toggle = document.querySelector('.nav-dropdown-toggle');
    const menu = document.querySelector('.nav-dropdown-menu');

    if (!dropdown || !toggle || !menu) return;

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

    // Initialize dropdown state (closed)
    closeDropdown();

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

    // Close dropdown AND hamburger menu when clicking dropdown items
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeDropdown();
            // Also close the hamburger menu if it's open (mobile)
            const navMenu = document.querySelector('.nav-menu');
            const navContainer = document.querySelector('.nav-container');
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navMenu.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                // Update hamburger button state
                const hamburger = navContainer?.querySelector('.hamburger-menu');
                if (hamburger) {
                    hamburger.classList.remove('active');
                    hamburger.setAttribute('aria-expanded', 'false');
                }
                // Hide backdrop
                const backdrop = document.getElementById('menuBackdrop');
                if (backdrop) {
                    backdrop.classList.remove('active');
                }
            }
        });
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
            toggle.focus();
        }
    });

    // Keyboard navigation for toggle
    toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                closeDropdown();
            } else {
                openDropdown();
                // Focus first menu item after opening
                if (menuLinks.length > 0) {
                    setTimeout(() => menuLinks[0].focus(), 50);
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            if (!isExpanded) {
                openDropdown();
            }
            if (menuLinks.length > 0) {
                setTimeout(() => menuLinks[0].focus(), 50);
            }
        }
    });

    // Arrow key navigation within dropdown menu
    menuLinks.forEach((link, index) => {
        link.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (index + 1) % menuLinks.length;
                menuLinks[nextIndex].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = (index - 1 + menuLinks.length) % menuLinks.length;
                menuLinks[prevIndex].focus();
            } else if (e.key === 'Tab' && !e.shiftKey && index === menuLinks.length - 1) {
                // Close dropdown when tabbing out of last item
                closeDropdown();
            } else if (e.key === 'Tab' && e.shiftKey && index === 0) {
                // Close dropdown when shift-tabbing out of first item
                closeDropdown();
            }
        });
    });

    // Handle bfcache (back/forward cache) - reset dropdown state when page is restored
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            closeDropdown();
        }
    });

    // Active state logic for Case Studies dropdown
    // When on Field Notes or Still Goods (including subdomains), Case Studies appears active
    const currentHost = window.location.hostname;
    const isProjectSite = currentHost.includes('notes.scottbertrand') ||
                         currentHost.includes('goods.scottbertrand');

    if (isProjectSite) {
        toggle.classList.add('active');
    }
});
