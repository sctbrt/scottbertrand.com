# Subdomain Navigation Update — v1.2.1 Canonical Structure

## Issue
Both notes.scottbertrand.com and goods.scottbertrand.com have outdated navigation that doesn't match the canonical structure implemented on scottbertrand.com.

**Current Issues:**
- **Field Notes**: Links to deprecated pages (Approach, Focus)
- **Still Goods**: Uses old nav-imprint-image pattern
- **Both**: Missing Projects dropdown with all three brands

## Required Changes

### 1. Add dropdown.js

Copy `dropdown.js` from main repo to both subdomain repos (already done in /tmp clones).

### 2. Add Dropdown CSS

Append this to `styles.css` in both repos:

```css
/* ===================================
   Projects Dropdown Navigation
   =================================== */

.nav-dropdown {
    position: relative;
}

.nav-dropdown-toggle {
    background: none;
    border: none;
    color: var(--text-primary);
    font-family: inherit;
    font-size: inherit;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: color 0.2s ease;
}

.nav-dropdown-toggle:hover {
    color: var(--text-secondary);
}

.dropdown-arrow {
    font-size: 0.75rem;
    transition: transform 0.2s ease;
}

.nav-dropdown[aria-expanded="true"] .dropdown-arrow {
    transform: rotate(180deg);
}

.nav-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 1rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 1rem;
    min-width: 320px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    z-index: 1000;
}

.nav-dropdown-menu[aria-hidden="false"] {
    opacity: 1;
    visibility: visible;
}

.nav-dropdown-item {
    display: block;
    padding: 1rem;
    text-decoration: none;
    color: var(--text-primary);
    border-radius: 6px;
    transition: background-color 0.2s ease;
}

.nav-dropdown-item:hover {
    background-color: rgba(128, 128, 128, 0.1);
}

.nav-dropdown-item + .nav-dropdown-item {
    margin-top: 0.5rem;
}

.dropdown-brand-img {
    max-width: 120px;
    height: auto;
    display: block;
    margin-bottom: 0.5rem;
    opacity: 0.9;
}

.dropdown-descriptor {
    display: block;
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.4;
}

/* Mobile dropdown adjustments */
@media (max-width: 768px) {
    .nav-dropdown-menu {
        left: 0;
        right: 0;
        transform: none;
        margin: 1rem;
        min-width: auto;
    }
}

/* Disabled/Coming Soon state for dropdown items */
.nav-dropdown-item--disabled {
    opacity: 0.4;
    cursor: default;
    pointer-events: none;
}

.nav-dropdown-item--disabled:hover {
    background-color: transparent;
}

.dropdown-descriptor--coming-soon {
    font-style: italic;
    opacity: 0.7;
}
```

### 3. Replace Navigation HTML

#### For Still Goods (goods.scottbertrand.com)

**Replace lines 30-40** with:

```html
            <nav class="nav-menu" id="navMenu">
                <a href="https://scottbertrand.com/#services">Services</a>
                <a href="https://scottbertrand.com/how-it-works.html">How It Works</a>
                <div class="nav-dropdown">
                    <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
                        Projects
                        <span class="dropdown-arrow">▾</span>
                    </button>
                    <div class="nav-dropdown-menu" aria-label="Projects submenu" aria-hidden="true">
                        <a href="https://notes.scottbertrand.com" class="nav-dropdown-item">
                            <img src="assets/field-notes-menu-dark.png" alt="Field Notes" class="dropdown-brand-img" width="599" height="110">
                            <span class="dropdown-descriptor">A working archive of systems, drafts, and field observations.</span>
                        </a>
                        <a href="/" class="nav-dropdown-item">
                            <img src="assets/still-goods-menu-dark.png" alt="Still Goods" class="dropdown-brand-img" width="1333" height="283">
                            <span class="dropdown-descriptor">Objects for everyday use.</span>
                        </a>
                        <div class="nav-dropdown-item nav-dropdown-item--disabled">
                            <img src="assets/maxstewart-dark.png" alt="Max Stewart" class="dropdown-brand-img" width="2100" height="434">
                            <span class="dropdown-descriptor dropdown-descriptor--coming-soon">Coming Soon</span>
                        </div>
                    </div>
                </div>
                <a href="https://scottbertrand.com/about.html">About</a>
                <a href="https://scottbertrand.com/contact.html">Contact</a>
            </nav>
```

**Add script tag** before `</body>`:
```html
    <script type="module" src="dropdown.js"></script>
```

#### For Field Notes (notes.scottbertrand.com)

**Replace lines 30-40** with:

```html
            <nav class="nav-menu" id="navMenu">
                <a href="https://scottbertrand.com/#services">Services</a>
                <a href="https://scottbertrand.com/how-it-works.html">How It Works</a>
                <div class="nav-dropdown">
                    <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
                        Projects
                        <span class="dropdown-arrow">▾</span>
                    </button>
                    <div class="nav-dropdown-menu" aria-label="Projects submenu" aria-hidden="true">
                        <a href="/" class="nav-dropdown-item">
                            <img src="assets/field-notes-menu-dark.png" alt="Field Notes" class="dropdown-brand-img" width="599" height="110">
                            <span class="dropdown-descriptor">A working archive of systems, drafts, and field observations.</span>
                        </a>
                        <a href="https://goods.scottbertrand.com" class="nav-dropdown-item">
                            <img src="assets/still-goods-menu-dark.png" alt="Still Goods" class="dropdown-brand-img" width="1333" height="283">
                            <span class="dropdown-descriptor">Objects for everyday use.</span>
                        </a>
                        <div class="nav-dropdown-item nav-dropdown-item--disabled">
                            <img src="assets/maxstewart-dark.png" alt="Max Stewart" class="dropdown-brand-img" width="2100" height="434">
                            <span class="dropdown-descriptor dropdown-descriptor--coming-soon">Coming Soon</span>
                        </div>
                    </div>
                </div>
                <a href="https://scottbertrand.com/about.html">About</a>
                <a href="https://scottbertrand.com/contact.html">Contact</a>
            </nav>
```

**Add script tag** before `</body>`:
```html
    <script type="module" src="dropdown.js"></script>
```

### 4. Update theme.js (both repos)

Find the section that updates navigation images and add support for `.dropdown-brand-img`:

```javascript
// Update navigation menu images (dropdown brand images)
const dropdownImages = document.querySelectorAll('.dropdown-brand-img, .nav-imprint-img');
dropdownImages.forEach(img => {
    const altText = img.alt;
    if (altText === 'Field Notes') {
        img.src = assets[`field-notes-menu-${assetSuffix}`];
    } else if (altText === 'Still Goods') {
        img.src = assets[`still-goods-menu-${assetSuffix}`];
    } else if (altText === 'Max Stewart') {
        img.src = assets[`maxstewart-${assetSuffix}`];
    }
});
```

## Implementation Status

- ✓ dropdown.js copied to /tmp/scott-still-goods
- ✓ dropdown.js copied to /tmp/scott-field-notes
- ✓ Dropdown CSS appended to /tmp/scott-still-goods/styles.css
- ✓ Dropdown CSS appended to /tmp/scott-field-notes/styles.css
- ⏳ HTML navigation updates needed
- ⏳ Script tags need adding
- ⏳ theme.js updates needed
- ⏳ Commits and pushes to GitHub needed

## Next Steps

Manual completion required in subdomain repos:
1. Apply HTML navigation changes (see above)
2. Add dropdown.js script tag to HTML files
3. Update theme.js image swapping logic
4. Test locally
5. Commit with message: "Update navigation to v1.2.1 canonical structure with Projects dropdown"
6. Push to GitHub for Vercel deployment
