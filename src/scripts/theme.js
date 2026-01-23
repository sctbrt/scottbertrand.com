/**
 * Theme Manager — v1.5.0
 * Time-based theme with OS fallback and manual override
 * Uses Canada/Eastern timezone for day/night detection
 */

class ThemeManager {
    constructor() {
        this.html = document.documentElement;
        this.toggle = document.getElementById('themeToggle');
        this.iconElement = null;
        this.currentMode = this.getSavedMode();
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.timezone = 'America/Toronto'; // Canada/Eastern

        this.init();
    }

    init() {
        // Get icon element reference
        if (this.toggle) {
            this.iconElement = this.toggle.querySelector('.theme-icon');
        }

        // Apply theme immediately (before DOM ready to prevent FOUC)
        this.applyTheme();

        // Set up OS listener - respond to system changes when in system mode
        this.mediaQuery.addEventListener('change', () => {
            if (this.currentMode === 'system') {
                this.applyTheme();
            }
        });

        // Set up time-based updates (check every minute when in system mode)
        this.startTimeBasedUpdates();

        // Toggle on button click (cycles: system → light → dark → system)
        if (this.toggle) {
            this.toggle.addEventListener('click', () => this.cycleMode());
        }
    }

    getSavedMode() {
        // Check localStorage for saved preference
        const saved = localStorage.getItem('sb-theme');
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            return saved;
        }

        // Default to system mode (time-based with OS fallback)
        return 'system';
    }

    /**
     * Get current hour in Canada/Eastern timezone
     */
    getEasternHour() {
        try {
            const now = new Date();
            const easternTime = new Date(now.toLocaleString('en-US', { timeZone: this.timezone }));
            return easternTime.getHours();
        } catch (e) {
            // Fallback if timezone not supported
            return new Date().getHours();
        }
    }

    /**
     * Determine theme based on time of day
     * Light: 7:00 AM - 7:00 PM (07:00 - 19:00)
     * Dark: 7:00 PM - 7:00 AM (19:00 - 07:00)
     */
    getTimeBasedTheme() {
        const hour = this.getEasternHour();
        // Daytime: 7 AM to 7 PM
        return (hour >= 7 && hour < 19) ? 'light' : 'dark';
    }

    /**
     * Get system theme - prioritizes time-based, falls back to OS preference
     */
    getSystemTheme() {
        // Primary: time-based theme for Canada/Eastern
        return this.getTimeBasedTheme();
    }

    /**
     * Start interval to check time and update theme when in system mode
     */
    startTimeBasedUpdates() {
        // Check every minute for time changes
        setInterval(() => {
            if (this.currentMode === 'system') {
                this.applyTheme();
            }
        }, 60000); // 60 seconds
    }

    cycleMode() {
        // Cycle through: system → light → dark → system
        const modes = ['system', 'light', 'dark'];
        const currentIndex = modes.indexOf(this.currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.currentMode = modes[nextIndex];

        // Save and apply
        localStorage.setItem('sb-theme', this.currentMode);
        this.applyTheme();
    }

    applyTheme() {
        // Determine effective theme
        let effectiveTheme;
        if (this.currentMode === 'system') {
            effectiveTheme = this.getSystemTheme();
        } else {
            effectiveTheme = this.currentMode;
        }

        // Apply data-theme attribute
        this.html.setAttribute('data-theme', effectiveTheme);
        this.html.setAttribute('data-theme-mode', this.currentMode);

        // Update icon to reflect current mode
        this.updateIcon();
    }

    updateIcon() {
        if (!this.iconElement) return;

        // Icons: ◐ for system (auto), ☀ for light, ☾ for dark
        const icons = {
            system: '◐',
            light: '☀',
            dark: '☾'
        };

        this.iconElement.textContent = icons[this.currentMode] || '◐';

        // Update aria-label for accessibility
        const labels = {
            system: 'Theme: Auto (time-based). Click to switch to light.',
            light: 'Theme: Light. Click to switch to dark.',
            dark: 'Theme: Dark. Click to switch to auto.'
        };

        if (this.toggle) {
            this.toggle.setAttribute('aria-label', labels[this.currentMode] || 'Toggle theme');
        }
    }
}

/**
 * Menu Manager — v2.0.0
 * Premium morphing menu with focus trap and backdrop
 * Hamburger-on-overflow: collapses nav only when content would spill
 */
class MenuManager {
    constructor() {
        this.hamburger = document.getElementById('hamburger');
        this.navMenu = document.getElementById('navMenu');
        this.backdrop = document.getElementById('menuBackdrop');
        this.navContainer = this.navMenu?.parentElement;
        this.lastFocus = null;
        this.focusTrapHandler = null;

        if (this.hamburger && this.navMenu && this.navContainer) {
            this.init();
        }
    }

    init() {
        // Set up hamburger toggle
        this.hamburger.addEventListener('click', () => this.toggleMenu());

        // Set up close button
        const closeBtn = this.navMenu.querySelector('.mobile-menu-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeMenu();
            });
        }

        // Set up backdrop click to close
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => this.closeMenu());
        }

        // Close menu when clicking menu items (except dropdown toggle)
        this.navMenu.querySelectorAll('a').forEach(item => {
            item.addEventListener('click', () => this.closeMenu());
        });

        // Close menu on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.navMenu.classList.contains('active')) {
                this.closeMenu();
            }
        });

        // Set up overflow detection with ResizeObserver
        this.setupOverflowDetection();
    }

    setupOverflowDetection() {
        // Cache the natural width of nav links (measured when expanded)
        let naturalNavWidth = 0;

        const measureNaturalWidth = () => {
            // Ensure nav is not collapsed for accurate measurement
            const wasCollapsed = this.navContainer.classList.contains('nav--collapsed');
            if (wasCollapsed) {
                this.navContainer.classList.remove('nav--collapsed');
            }

            // Measure only TOP-LEVEL nav items (direct children), not nested dropdown items
            const topLevelItems = this.navMenu.querySelectorAll(':scope > a, :scope > .nav-dropdown');
            let totalWidth = 0;
            topLevelItems.forEach(item => {
                totalWidth += item.offsetWidth;
            });

            // Add gaps between items (nav-menu has gap: 32px in CSS)
            const gap = 32;
            if (topLevelItems.length > 1) {
                totalWidth += gap * (topLevelItems.length - 1);
            }

            naturalNavWidth = totalWidth;

            // Restore collapsed state if it was collapsed
            if (wasCollapsed) {
                this.navContainer.classList.add('nav--collapsed');
            }
        };

        const checkOverflow = () => {
            const wasCollapsed = this.navContainer.classList.contains('nav--collapsed');

            // Temporarily uncollapse to measure available space
            if (wasCollapsed) {
                this.navContainer.classList.remove('nav--collapsed');
            }

            // Measure if we haven't yet
            if (naturalNavWidth === 0) {
                measureNaturalWidth();
            }

            // Get the actual available width in the grid's middle column
            // Container width minus brand, utilities, gaps (2x24px), and padding (2x24px)
            const containerRect = this.navContainer.getBoundingClientRect();
            const brand = this.navContainer.querySelector('.site-brand');
            const utilities = this.navContainer.querySelector('.nav-utilities');
            const brandWidth = brand ? brand.getBoundingClientRect().width : 0;
            const utilitiesWidth = utilities ? utilities.getBoundingClientRect().width : 0;

            // Available = total container - brand - utilities - 2 grid gaps (48px) - some buffer
            const availableWidth = containerRect.width - brandWidth - utilitiesWidth - 48 - 24;

            const isOverflowing = naturalNavWidth > availableWidth;

            if (isOverflowing) {
                this.navContainer.classList.add('nav--collapsed');
            } else {
                this.navContainer.classList.remove('nav--collapsed');
                if (wasCollapsed) {
                    this.closeMenu();
                }
            }
        };

        // Observe container size changes
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(checkOverflow);
        });
        resizeObserver.observe(this.navContainer);

        // Initial check after fonts load
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                requestAnimationFrame(checkOverflow);
            });
        } else {
            requestAnimationFrame(checkOverflow);
        }
    }

    getFocusableElements() {
        return this.navMenu.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
    }

    enableFocusTrap() {
        this.focusTrapHandler = (e) => {
            if (e.key !== 'Tab') return;

            const focusables = this.getFocusableElements();
            if (focusables.length === 0) return;

            const firstFocusable = focusables[0];
            const lastFocusable = focusables[focusables.length - 1];

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        };

        document.addEventListener('keydown', this.focusTrapHandler);
    }

    disableFocusTrap() {
        if (this.focusTrapHandler) {
            document.removeEventListener('keydown', this.focusTrapHandler);
            this.focusTrapHandler = null;
        }
    }

    toggleMenu() {
        const isActive = this.navMenu.classList.contains('active');

        if (isActive) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        // Store current focus for restoration
        this.lastFocus = document.activeElement;

        // Add menu-open class to nav-container to disable backdrop-filter
        // (fixes position:fixed containing block issue)
        this.navContainer.classList.add('nav--menu-open');

        // Activate menu and backdrop
        this.navMenu.classList.add('active');
        this.hamburger.classList.add('active');
        this.backdrop?.classList.add('active');

        // Update ARIA attributes
        this.navMenu.setAttribute('aria-hidden', 'false');
        this.hamburger.setAttribute('aria-expanded', 'true');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Focus the menu for screen readers
        this.navMenu.focus();

        // Enable focus trap
        this.enableFocusTrap();
    }

    closeMenu() {
        // Remove menu-open class from nav-container
        this.navContainer.classList.remove('nav--menu-open');

        // Deactivate menu and backdrop
        this.navMenu.classList.remove('active');
        this.hamburger.classList.remove('active');
        this.backdrop?.classList.remove('active');

        // Update ARIA attributes
        this.navMenu.setAttribute('aria-hidden', 'true');
        this.hamburger.setAttribute('aria-expanded', 'false');

        // Restore body scroll
        document.body.style.overflow = '';

        // Disable focus trap
        this.disableFocusTrap();

        // Restore focus to trigger element
        if (this.lastFocus && typeof this.lastFocus.focus === 'function') {
            this.lastFocus.focus();
        } else {
            this.hamburger.focus();
        }
    }
}

/**
 * Active Nav State
 * Highlights the current section in navigation based on scroll position
 */
class ActiveNavManager {
    constructor() {
        this.sections = document.querySelectorAll('.section[id], .hero');
        this.navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');

        if (this.sections.length > 0 && this.navLinks.length > 0) {
            this.init();
        }
    }

    init() {
        // Set up Intersection Observer
        const options = {
            root: null,
            rootMargin: '-20% 0px -60% 0px',
            threshold: 0
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id || 'hero';
                    this.setActiveLink(id);
                }
            });
        }, options);

        // Observe all sections
        this.sections.forEach(section => {
            this.observer.observe(section);
        });
    }

    setActiveLink(sectionId) {
        // Remove active class from all links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to matching link
        const activeLink = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new MenuManager();
    new ActiveNavManager();
});
