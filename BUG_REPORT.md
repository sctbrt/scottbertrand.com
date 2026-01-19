# Comprehensive Bug Report & Hotfix List

## Audit Date: January 19, 2025
## Status: SYSTEMATIC BUG HUNT IN PROGRESS

---

## 🔴 CRITICAL BUGS (Fix Immediately)

### BUG #1: Field Notes Modal Unnecessary on All Pages
**Severity**: Medium-High
**Location**: index.html, about.html, approach.html, focus.html, contact.html
**Issue**: Field Notes modal exists on all pages but Field Notes now links directly to notes.scottbertrand.com
**Impact**:
- Extra ~20 lines of HTML on every page
- Modal never opens
- Wasted bandwidth
**Fix**: Remove Field Notes modal from all pages
**Status**: 🔴 NEEDS FIX

---

### BUG #2: Modal Images Use Picture Elements
**Severity**: Medium
**Location**: Still Goods modal on all pages
**Issue**: Modal images still use `<picture>` elements instead of simple `<img>` tags
**Impact**: Modal images won't respond to theme toggle
**Code**:
```html
<!-- CURRENT (BROKEN): -->
<picture>
    <source srcset="assets/still-goods-light.avif" type="image/avif" media="(prefers-color-scheme: dark)">
    <!-- ... -->
</picture>

<!-- SHOULD BE: -->
<img src="assets/still-goods-dark.png" alt="Still Goods" class="modal-image">
```
**Fix**: Convert modal picture elements to img tags
**Status**: 🔴 NEEDS FIX

---

### BUG #3: Email Form Hides After Submission
**Severity**: Medium
**Location**: index.html (inline JavaScript)
**Issue**: Form permanently hides after successful submission
**Code**: Line 205: `form.style.display = 'none';`
**Impact**: Users can't submit a second email (e.g., different address)
**Fix**: Remove the line that hides the form, just show success message
**Status**: 🔴 NEEDS FIX

---

## 🟡 HIGH PRIORITY BUGS (Fix Soon)

### BUG #4: Navigation Active State Not Working
**Severity**: Medium
**Location**: All pages
**Issue**: Current page doesn't show as active in navigation
**Impact**: Users don't know which page they're on
**Fix**: Add "active" class to current page nav link
**Status**: 🟡 NEEDS FIX

---

### BUG #5: Hamburger Menu Not Visible
**Severity**: Medium
**Location**: All pages (mobile)
**Issue**: Hamburger menu ID referenced but element doesn't exist in HTML
**Code**: theme.js references `getElementById('hamburger')` but no element with that ID
**Impact**: Mobile menu broken (if implemented)
**Fix**: Either add hamburger menu or remove dead code
**Status**: 🟡 NEEDS INVESTIGATION

---

### BUG #6: Field Notes Menu Image Wrong Variant
**Severity**: Low
**Location**: field-notes.html, field-note.html
**Issue**: These pages use `./assets/field-notes-menu-light.png` instead of dark variant
**Impact**: Menu image invisible on light theme on these pages
**Fix**: Change to `-dark.png` variant
**Status**: 🟡 NEEDS FIX

---

## 🟢 MEDIUM PRIORITY BUGS (Nice to Fix)

### BUG #7: Inconsistent Asset Paths
**Severity**: Low
**Location**: field-notes.html, field-note.html
**Issue**: These pages use `./assets/` while others use `assets/`
**Impact**: Could cause routing issues
**Fix**: Standardize to `assets/` (no leading ./)
**Status**: 🟢 NICE TO FIX

---

### BUG #8: Form Submit Button Doesn't Show Loading State
**Severity**: Low
**Location**: index.html (email form)
**Issue**: Button text doesn't change during submission
**Impact**: No feedback on slow connections
**Fix**: Add "Submitting..." text change and disabled state
**Status**: 🟢 NICE TO FIX

---

### BUG #9: No Error Message for Failed Submissions
**Severity**: Low
**Location**: index.html (email form)
**Issue**: Uses alert() for errors (poor UX)
**Impact**: Jarring error experience
**Fix**: Add inline error message element
**Status**: 🟢 NICE TO FIX

---

### BUG #10: Modal Doesn't Trap Focus
**Severity**: Low (Accessibility)
**Location**: modal.js
**Issue**: When modal opens, focus doesn't trap inside
**Impact**: Keyboard users can tab behind modal
**Fix**: Implement focus trap
**Status**: 🟢 ACCESSIBILITY IMPROVEMENT

---

### BUG #11: No Skip to Content Link
**Severity**: Low (Accessibility)
**Location**: All pages
**Issue**: No skip link for keyboard/screen reader users
**Impact**: Users must tab through nav every page
**Fix**: Add skip link
**Status**: 🟢 ACCESSIBILITY IMPROVEMENT

---

### BUG #12: Field Note Pages Have Wrong Asset Paths in Modals
**Severity**: Low
**Location**: field-notes.html, field-note.html
**Issue**: Modal images use `./assets/` instead of `assets/`
**Impact**: Images might not load
**Fix**: Standardize paths
**Status**: 🟢 NEEDS FIX

---

## ⚪ LOW PRIORITY ISSUES (Future Enhancements)

### ISSUE #1: No Loading States
**Location**: Email form
**Impact**: No visual feedback during API calls
**Fix**: Add spinner or loading indicator
**Priority**: Future enhancement

---

### ISSUE #2: Generic Error Messages
**Location**: Email form
**Impact**: Users don't know what went wrong
**Fix**: Show specific error messages
**Priority**: Future enhancement

---

### ISSUE #3: No Analytics
**Location**: All pages
**Impact**: No tracking of user behavior
**Fix**: Add Google Analytics or Plausible
**Priority**: Future enhancement

---

### ISSUE #4: No Sitemap
**Location**: Root
**Impact**: SEO could be better
**Fix**: Generate sitemap.xml
**Priority**: Future enhancement

---

### ISSUE #5: No Structured Data
**Location**: All pages
**Impact**: Search engines can't understand content structure
**Fix**: Add JSON-LD schema
**Priority**: Future enhancement

---

## 🔧 SYSTEMATIC HOTFIX PLAN

### Phase 1: Critical Fixes (Do Now)
1. ✅ Remove Field Notes modal from all pages
2. ✅ Convert Still Goods modal picture to img tag
3. ✅ Fix email form hiding after submission

### Phase 2: High Priority (Do Soon)
4. ⬜ Add active state to navigation
5. ⬜ Fix Field Notes pages menu image variants
6. ⬜ Investigate hamburger menu issue

### Phase 3: Medium Priority (Nice to Have)
7. ⬜ Standardize asset paths
8. ⬜ Improve form submit feedback
9. ⬜ Add inline error messages

### Phase 4: Low Priority (Future)
10. ⬜ Add focus trap to modal
11. ⬜ Add skip to content link
12. ⬜ Add loading states
13. ⬜ Add analytics
14. ⬜ Add sitemap

---

## 🔍 DETAILED FINDINGS

### Finding 1: Field Notes Modal
**Files Affected**: 5 (index, about, approach, focus, contact)
**Lines of Code**: ~20 lines × 5 pages = 100 lines
**Modal Structure**:
```html
<div class="modal" id="fieldNotesModal" aria-hidden="true">
    <div class="modal-overlay" data-close-modal></div>
    <div class="modal-content">
        <button class="modal-close" data-close-modal aria-label="Close">×</button>
        <img src="assets/field-notes-lockup-light.png" alt="Field Notes" class="modal-image">
        <p class="modal-description">A working archive of systems, drafts, and field observations.</p>
        <p class="modal-caption">Opening soon.</p>
    </div>
</div>
```
**Why It's Dead Code**: Field Notes navigation changed from button opening modal to direct link to subdomain

---

### Finding 2: Still Goods Modal Picture Element
**Current Code**:
```html
<picture>
    <source srcset="assets/still-goods-light.avif" type="image/avif" media="(prefers-color-scheme: dark)">
    <source srcset="assets/still-goods-light.webp" type="image/webp" media="(prefers-color-scheme: dark)">
    <source srcset="assets/still-goods-dark.avif" type="image/avif" media="(prefers-color-scheme: light)">
    <source srcset="assets/still-goods-dark.webp" type="image/webp" media="(prefers-color-scheme: light)">
    <img src="assets/still-goods-light.png" alt="Still Goods" class="modal-image" id="stillGoodsModalImage">
</picture>
```

**Problem**: `media="(prefers-color-scheme: ...)"` queries respond to system preference, not JavaScript theme toggle

**Solution**: Replace with simple img tag that theme.js can update:
```html
<img src="assets/still-goods-dark.png" alt="Still Goods" class="modal-image" id="stillGoodsModalImage">
```

---

### Finding 3: Form Hide Issue
**Location**: index.html line 205
**Current Code**:
```javascript
if (response.ok) {
    successMessage.classList.add('show');
    form.style.display = 'none';  // ← PROBLEM
}
```

**Issue**: Form disappears permanently

**Better Approach**:
```javascript
if (response.ok) {
    successMessage.classList.add('show');
    form.reset();
    // Don't hide form - let user submit again if needed
}
```

---

### Finding 4: Navigation Active State
**Current**: No page has active class on current nav link
**Expected**:
- On about.html: `<a href="/about.html" class="active">About</a>`
- On approach.html: `<a href="/approach.html" class="active">Approach</a>`
- Etc.

**Fix**: Add active class to each page's HTML for the current page link

---

### Finding 5: Hamburger Menu Mystery
**Code Reference**: theme.js line 109-113
```javascript
class MenuManager {
    constructor() {
        this.hamburger = document.getElementById('hamburger');
        this.navMenu = document.getElementById('navMenu');
        // ...
    }
}
```

**Issue**: No element with `id="hamburger"` exists in any HTML file

**Options**:
1. Hamburger menu is planned but not implemented yet (mobile nav)
2. Code is dead and should be removed
3. Need to add hamburger menu for mobile

**Investigation Needed**: Check if mobile navigation needs hamburger or if responsive CSS handles it

---

## 📊 BUG STATISTICS

**Total Issues Found**: 12 bugs + 5 enhancements = 17 items
**Critical**: 3 bugs
**High Priority**: 3 bugs
**Medium Priority**: 3 bugs
**Low Priority**: 3 bugs
**Future Enhancements**: 5 items

**Estimated Fix Time**:
- Critical fixes: ~30 minutes
- High priority: ~1 hour
- Total: ~2-3 hours for all fixes

---

## ✅ TESTING CHECKLIST (After Fixes)

### Visual Tests:
- [ ] All pages load without errors
- [ ] Logos visible on all pages
- [ ] Theme toggle works on all pages
- [ ] Still Goods modal works
- [ ] Field Notes modal removed (doesn't appear)
- [ ] Navigation shows active page

### Functional Tests:
- [ ] Email form submits
- [ ] Form doesn't hide after submission
- [ ] Success message shows
- [ ] Form can be submitted multiple times
- [ ] Modal opens and closes
- [ ] Theme persists on reload

### Mobile Tests:
- [ ] Site responsive on mobile
- [ ] Navigation works on mobile
- [ ] Forms work on mobile
- [ ] Modal works on mobile

### Browser Tests:
- [ ] Chrome - all features work
- [ ] Safari - all features work
- [ ] iOS Safari - theme toggle works
- [ ] iOS Safari - no dark mode conflicts

---

## 🎯 RECOMMENDED ACTION

**Immediate**: Fix critical bugs #1, #2, #3
**Next**: Fix high priority bugs #4, #5, #6
**Later**: Medium and low priority improvements

**Timeline**:
- Phase 1 (Critical): 30 minutes
- Phase 2 (High): 1 hour
- Phase 3 (Medium): 1 hour
- **Total**: 2.5 hours for solid fixes

**Next Step**: Begin systematic fixes starting with Bug #1
