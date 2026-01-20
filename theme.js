/**
 * Theme Manager
 * Handles light/dark theme switching and image swapping
 */

// Import all image variants so Vite includes them in the build
import sbMonogramDark from './assets/sb-monogram-dark.png';
import sbMonogramLight from './assets/sb-monogram-light.png';
import wordmarkDark from './assets/scott-bertrand-wordmark-dark.png';
import wordmarkLight from './assets/scott-bertrand-wordmark-light.png';
import fieldNotesMenuDark from './assets/field-notes-menu-dark.png';
import fieldNotesMenuLight from './assets/field-notes-menu-light.png';
import stillGoodsMenuDark from './assets/still-goods-menu-dark.png';
import stillGoodsMenuLight from './assets/still-goods-menu-light.png';
import maxStewartMenuDark from './assets/maxstewart-dark.png';
import maxStewartMenuLight from './assets/maxstewart-light.png';
import fieldNotesLockupDark from './assets/field-notes-lockup-dark.png';
import fieldNotesLockupLight from './assets/field-notes-lockup-light.png';
import stillGoodsDark from './assets/still-goods-dark.png';
import stillGoodsLight from './assets/still-goods-light.png';

// Create asset map for dynamic access
const assets = {
    'sb-monogram-dark': sbMonogramDark,
    'sb-monogram-light': sbMonogramLight,
    'scott-bertrand-wordmark-dark': wordmarkDark,
    'scott-bertrand-wordmark-light': wordmarkLight,
    'field-notes-menu-dark': fieldNotesMenuDark,
    'field-notes-menu-light': fieldNotesMenuLight,
    'still-goods-menu-dark': stillGoodsMenuDark,
    'still-goods-menu-light': stillGoodsMenuLight,
    'maxstewart-dark': maxStewartMenuDark,
    'maxstewart-light': maxStewartMenuLight,
    'field-notes-lockup-dark': fieldNotesLockupDark,
    'field-notes-lockup-light': fieldNotesLockupLight,
    'still-goods-dark': stillGoodsDark,
    'still-goods-light': stillGoodsLight
};

class ThemeManager {
    constructor() {
        this.html = document.documentElement;
        this.toggle = document.getElementById('themeToggle');
        this.currentTheme = this.getSavedTheme();

        this.init();
    }

    init() {
        // Apply saved theme on load
        this.applyTheme(this.currentTheme, false);

        // Toggle on button click
        if (this.toggle) {
            this.toggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    getSavedTheme() {
        // Check if user has a saved preference
        const saved = localStorage.getItem('theme');
        if (saved) {
            return saved;
        }

        // First visit: respect system preference
        return this.getSystemTheme();
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme, true);
    }

    applyTheme(theme, animate = false) {
        this.currentTheme = theme;

        // Use the user's selected theme directly
        // Don't override with system preference - user toggle takes precedence
        const effectiveTheme = theme;

        // Update data-theme attribute with effective theme
        this.html.setAttribute('data-theme', effectiveTheme);

        // Save user preference to localStorage
        localStorage.setItem('theme', theme);

        // Update images (inverse relationship: light theme = dark assets for contrast)
        const assetSuffix = effectiveTheme === 'light' ? 'dark' : 'light';

        // Update monograms
        const monograms = document.querySelectorAll('.wordmark-monogram, .nav-monogram, .brand-monogram');
        monograms.forEach(img => {
            img.src = assets[`sb-monogram-${assetSuffix}`];
        });

        // Update wordmarks
        const wordmarks = document.querySelectorAll('.wordmark-text, .nav-wordmark, .brand-wordmark, .hero-wordmark');
        wordmarks.forEach(img => {
            img.src = assets[`scott-bertrand-wordmark-${assetSuffix}`];
        });

        // Update favicon
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.href = assets[`sb-monogram-${assetSuffix}`];
        }

        // Update Field Notes modal image if it exists
        const fieldNotesModalImage = document.querySelector('#fieldNotesModal .modal-image');
        if (fieldNotesModalImage) {
            fieldNotesModalImage.src = assets[`field-notes-lockup-${assetSuffix}`];
        }

        // Update Still Goods modal image if it exists
        const stillGoodsModalImage = document.getElementById('stillGoodsModalImage');
        if (stillGoodsModalImage) {
            stillGoodsModalImage.src = assets[`still-goods-${assetSuffix}`];
        }

        // Update Max Stewart modal image if it exists
        const maxStewartModalImage = document.getElementById('maxStewartModalImage');
        if (maxStewartModalImage) {
            maxStewartModalImage.src = assets[`maxstewart-${assetSuffix}`];
        }

        // Update navigation menu images
        const navImprintImages = document.querySelectorAll('.nav-imprint-img');
        navImprintImages.forEach(img => {
            const altText = img.alt;
            if (altText === 'Field Notes') {
                img.src = assets[`field-notes-menu-${assetSuffix}`];
            } else if (altText === 'Still Goods') {
                img.src = assets[`still-goods-menu-${assetSuffix}`];
            } else if (altText === 'Max Stewart') {
                img.src = assets[`maxstewart-${assetSuffix}`];
            }
        });
    }
}

/**
 * Hamburger Menu
 * Handles mobile menu toggle
 */
class MenuManager {
    constructor() {
        this.hamburger = document.getElementById('hamburger');
        this.navMenu = document.getElementById('navMenu');

        if (this.hamburger && this.navMenu) {
            this.init();
        }
    }

    init() {
        // Toggle menu on hamburger click
        this.hamburger.addEventListener('click', () => this.toggleMenu());

        // Close menu when clicking menu items
        this.navMenu.querySelectorAll('a, button').forEach(item => {
            item.addEventListener('click', () => this.closeMenu());
        });
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
        this.navMenu.classList.add('active');
        this.hamburger.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeMenu() {
        this.navMenu.classList.remove('active');
        this.hamburger.classList.remove('active');
        document.body.style.overflow = '';
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
