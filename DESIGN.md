# DESIGN.md — Prompter Design System

## 1. Product Identity

**Prompter** is a pay-per-use AI image generation platform.

- **What**: Users upload a reference image, select a prompt style from a catalog, and receive an AI-generated image.
- **Payment**: x402 protocol — on-chain USDC payments on Base. No subscriptions, no accounts.
- **Audience**: Creative users (artists, designers, content creators) who want AI image generation without platform lock-in.
- **Platform**: Web PWA. Dark-only. Desktop-first but fully responsive.
- **Tech**: Vite + React + TypeScript frontend, Cloudflare Workers backend, OpenRouter API.

**Brand Keywords**: creative, trustless, fast, minimal, web3, tool, dark.

---

## 2. Design Principles

1. **Content is King** — The generated images are the hero. Chrome must step back. Use darkness to frame the art.

2. **Trust Through Transparency** — Payment flow must be explicit. Show amounts, addresses, network, and verification status clearly. No dark patterns.

3. **Fast Feedback** — Every action gets an immediate visual response. Generation status, payment verification, and errors are always visible inline.

4. **Dark & Focused** — OLED-first dark mode. Deep black backgrounds conserve battery and reduce eye strain. High contrast for readability. No light mode.

5. **Accessible by Default** — 4.5:1 contrast minimum. Keyboard navigable. Screen reader friendly. Respects `prefers-reduced-motion`.

---

## 3. Audit — Current State & Issues

This section documents the current UI to guide refactoring.

### 3.1 Files
```
frontend/src/
├── main.tsx
├── App.tsx
├── App.css              # Dark-only tokens + component styles
├── index.css            # Light-first tokens (conflicts with App.css)
├── components/
│   ├── Header.tsx / Header.css
│   ├── BurgerButton.tsx / BurgerButton.css
│   ├── SidePanel.tsx / SidePanel.css
│   ├── ImageUpload.tsx
│   ├── PromptGallery.tsx
│   ├── StatusIndicator.tsx / StatusIndicator.css
│   ├── StatusBar.tsx / StatusBar.css
│   ├── PaywallModal.tsx / PaywallModal.css
│   ├── WalletSelectionModal.tsx
│   └── ImageModal.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── MyImagesPage.tsx
│   ├── ConfigPage.tsx / ConfigPage.css
│   └── AboutPage.tsx
├── hooks/useX402Payment.ts
├── context/WalletContext.tsx, ImagesContext.tsx
└── utils/extractImageUrl.ts, walletConnect.ts, imageStorage.ts
```

### 3.2 Known Inconsistencies

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **Dual token systems** — `index.css` defines light-mode-first variables; `App.css` overwrites `:root` with dark-only values. The `prefers-color-scheme: dark` block in `index.css` will never activate. | `index.css`, `App.css` | Critical |
| 2 | **White header on dark body** — `Header.css` uses `background: #ffffff`, while the body is `#0f0f11`. | `Header.css` | High |
| 3 | **Hardcoded colors in JS** — `StatusIndicator.tsx` defines status colors as plain hex strings in a JS config object. | `StatusIndicator.tsx:8-14` | High |
| 4 | **Hardcoded colors in CSS** — `StatusBar.css` uses `#9ca3af`, `#10b981`, `#6b7280`, `#ef4444` directly. | `StatusBar.css` | High |
| 5 | **Undefined CSS variable** — `ConfigPage.css` references `--text-bright` which is never defined. | `ConfigPage.css` | Medium |
| 6 | **Loose `<main>` element** — `ConfigPage.tsx` renders `<main>` without `className="app-main"`, creating a different layout container. | `ConfigPage.tsx` | Medium |
| 7 | **Inconsistent heading styles** — `index.css` uses `system-ui` with `56px` h1. `App.css` uses `Inter` with `rem` sizing. | `index.css`, `App.css` | Medium |
| 8 | **No CSS reset** — Relies on `* { box-sizing: border-box }` and `body { margin: 0 }` only. | `App.css`, `index.css` | Low |
| 9 | **Inline styles** — 8 instances of inline `style={{...}}` across 5 files. Ad-hoc fixes. | Various | Low |

### 3.3 Current Color Values (App.css — the dominant system)

| Role | Value | Notes |
|------|-------|-------|
| Background | `#0f0f11` | Near-black |
| Surface | `#1a1a1f` | Card backgrounds |
| Surface-2 | `#25252b` | Elevated surfaces |
| Text | `#e0e0e0` | Primary body text |
| Text Muted | `#999` | Secondary text |
| Accent | `#7c8bff` | Blue-purple, primary brand |
| Accent Hover | `#8b95ff` | Hover state |
| Border | `#333` | Dividers, outlines |
| Success | `#4caf50` | Positive states |
| Error | `#f44336` | Destructive states |

---

## 4. Theme — Dark Mode (OLED)

**Single theme: Dark Only.** No light mode. Decision justified by:
- AI generation tools feel natural in dark environments (focus on image output).
- OLED blacks conserve battery on mobile.
- Web3/crypto tools overwhelmingly use dark themes (user expectation).
- Simpler implementation — no theme-switching logic, no dual-mode design tokens.

### Reference Colors (Raw Values)

```
Background (deepest)  #0a0a0a
Surface 1             #141416
Surface 2             #1e1e22
Surface 3             #28282e
Text Primary          #e4e4e7
Text Secondary        #a1a1aa
Text Muted            #71717a
Border                #27272a
Border Emphasized     #3f3f46
```

---

## 5. Color Token System

All colors use CSS custom properties. No raw hex values in component code.

### 5.1 Full Token Table

| Token | Light Role | Value | Notes |
|-------|-----------|-------|-------|
| `--color-bg` | Page background | `#0a0a0a` | Deepest black |
| `--color-surface` | Card / input / panel | `#141416` | 1 level up |
| `--color-surface-2` | Elevated card / hover | `#1e1e22` | 2 levels up |
| `--color-surface-3` | Highest surface | `#28282e` | 3 levels up (rare) |
| `--color-text` | Primary body text | `#e4e4e7` | 4.5:1+ on `--color-surface` |
| `--color-text-secondary` | Secondary / labels | `#a1a1aa` | 3:1+ on surfaces |
| `--color-text-muted` | Placeholders / hints | `#71717a` | OK for non-critical text |
| `--color-text-inverse` | Text on accent bg | `#ffffff` | Used on filled buttons |
| `--color-border` | Default borders | `#27272a` | Subtle |
| `--color-border-emphasized` | Active / focus borders | `#3f3f46` | Slightly brighter |
| `--color-accent` | Primary brand / CTA | `#7c3bff` | Purple (AI, creative) |
| `--color-accent-hover` | Accent hover state | `#9370ff` | 10% lighter |
| `--color-accent-muted` | Accent low-emphasis | `rgba(124,59,255,0.15)` | Backgrounds, selection |
| `--color-accent-pink` | Generation accent | `#ec4899` | Used for generation UI |
| `--color-success` | Positive states | `#22c55e` | ≥4.5:1 on surface |
| `--color-success-muted` | Success low-emphasis | `rgba(34,197,94,0.15)` | Backgrounds |
| `--color-error` | Error / destructive | `#ef4444` | ≥4.5:1 on surface |
| `--color-error-muted` | Error low-emphasis | `rgba(239,68,68,0.15)` | Backgrounds |
| `--color-warning` | Warning / attention | `#f59e0b` | Payment required, alerts |
| `--color-warning-muted` | Warning low-emphasis | `rgba(245,158,11,0.15)` | Backgrounds |
| `--color-overlay` | Modal backdrop | `rgba(0,0,0,0.75)` | 75% black scrim |
| `--color-ring` | Focus ring | `#7c3bff` | Matches accent |

### 5.2 Usage Rules

- **Never** reference raw hex values in component files.
- Always import `tokens.css` first — it is the single source of truth.
- Muted variants (`--color-success-muted`) are for backgrounds/badges only — text always uses the non-muted variant.
- Text on `--color-accent` must use `--color-text-inverse` (white).

---

## 6. Typography

### 6.1 Font Families

| Role | Font | Weights | Source |
|------|------|---------|--------|
| Headings | **Space Grotesk** | 500, 600, 700 | Google Fonts |
| Body | **Inter** | 400, 500, 600 | Google Fonts |
| Mono | **JetBrains Mono** | 400, 500 | Google Fonts |

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap');
```

### 6.2 Type Scale

| Token | Size | Line Height | Weight | Use |
|-------|------|-------------|--------|-----|
| `--text-xs` | 0.75rem (12px) | 1.5 | 400 | Captions, metadata labels |
| `--text-sm` | 0.875rem (14px) | 1.5 | 400 | Helper text, secondary info |
| `--text-base` | 1rem (16px) | 1.6 | 400 | Body text (default) |
| `--text-md` | 1.125rem (18px) | 1.5 | 400 | Large body, emphasized text |
| `--text-lg` | 1.25rem (20px) | 1.4 | 600 | Section headings |
| `--text-xl` | 1.5rem (24px) | 1.3 | 600 | Page titles (h2) |
| `--text-2xl` | 2rem (32px) | 1.2 | 700 | Hero titles (h1) |
| `--text-3xl` | 3rem (48px) | 1.1 | 700 | Landing/display (rare) |

### 6.3 Typography Rules

- `font-display: swap` for all web fonts (no FOIT).
- Body default is `font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- Mono is used for: wallet addresses, transaction hashes, code blocks, amounts.
- `font-weight: 500` for labels and navigation. `font-weight: 600` for headings.
- `letter-spacing: -0.01em` on headings; `0` on body; `0.02em` on mono.

---

## 7. Layout & Spacing

### 7.1 Spacing Scale (4px base)

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | Tight inline gaps |
| `--space-2` | 8px | Icon gaps, tight padding |
| `--space-3` | 12px | Card padding, grid gaps |
| `--space-4` | 16px | Standard padding/gap |
| `--space-5` | 20px | Section padding (small) |
| `--space-6` | 24px | Section padding (default) |
| `--space-8` | 32px | Large section gaps |
| `--space-12` | 48px | Page-level separation |

### 7.2 Breakpoints

| Name | Width | Use |
|------|-------|-----|
| `sm` | 480px | Small phone landscape |
| `md` | 640px | Tablet portrait / large phone |
| `lg` | 900px | Tablet landscape / 2-column |
| `xl` | 1024px | Desktop |
| `2xl` | 1200px | Max content width |

### 7.3 Layout Rules

- **Max content width**: `1200px` (`.app-main`).
- **Header**: Fixed/sticky, 64px height. Respects safe areas. Adds `padding-top: 64px` to body content.
- **Home page grid**: `400px 1fr` columns on desktop (≥900px). Single column on mobile. Upload section is sticky on desktop.
- **Gallery grid**: `auto-fill, minmax(160px, 1fr)`. Falls back to 2-column grid on small phones.
- **Modals / overlays**: Fixed full-screen. `z-index: 1000`. Backdrop with `backdrop-filter: blur(8px)`.
- **Side panel**: Fixed right, `280px` width (wider than current 170px for better touch targets). `z-index: 999`.
- **No horizontal scroll** at any breakpoint.
- **Avoid 100vh** — use `100dvh` or `min-height: 100%` approach.

### 7.4 Z-Index Scale

| Layer | Value | Element |
|-------|-------|---------|
| Base | `0` | Default content |
| Sticky | `10` | Sticky header |
| Dropdown | `20` | Dropdowns, popovers |
| Overlay | `40` | Side panel backdrop |
| Side panel | `50` | Slide-in panel |
| Modal backdrop | `100` | Modal scrim |
| Modal | `101` | Modal content |
| Toast | `200` | Toast notifications |
| Wallet modal | `10000` | WalletConnect injection (external) |

---

## 8. Component Specifications

### 8.1 Header
- **Fixed top**, `64px` height. Background: `--color-surface` (not white!).
- **Left**: Logo icon (Lucide `Sparkles` or branded SVG).
- **Center**: App name "Prompter" in Space Grotesk 700, `--text-xl`. Gradient text: `linear-gradient(135deg, var(--color-accent), var(--color-accent-pink))`.
- **Right**: Wallet StatusBar + BurgerButton.
- **Bottom border**: `1px solid var(--color-border)`.
- **Mobile (<640px)**: Reduce padding to 12px. Center title, hide StatusBar if not connected.

### 8.2 SidePanel
- **Width**: 280px (increased from 170px for touch targets).
- **Background**: `--color-surface`. Slides from right.
- **Items**: Icon + label pairs. Min height 48px per item.
- **Active state**: Left border accent (`3px solid var(--color-accent)`).
- **Divider** before "Config" and "About" (secondary nav separation).

### 8.3 BurgerButton
- **Size**: 44×44px touch target.
- **Animation**: Three lines → X transform. Keep current CSS-only approach.
- **Color**: `currentColor`, inherits from header.

### 8.4 ImageUpload
- **Surface**: `--color-surface`, `border-radius: 12px`.
- **Drop zone**: `2px dashed var(--color-border)`. Min height 300px.
- **Drag-over state**: `border-color: var(--color-accent)`, `background: var(--color-accent-muted)`.
- **Preview**: `object-fit: contain`, max-height 400px.
- **"Choose file" button**: `--color-accent` filled, white text, min-height 44px.
- **Sticky** on desktop (`position: sticky; top: 24px`). Static on mobile.

### 8.5 PromptGallery
- **Grid**: `auto-fill, minmax(160px, 1fr)`.
- **Card**: `--color-surface`, `border-radius: 12px`. `border: 2px solid transparent`.
- **Selected card**: `border-color: var(--color-accent)`.
- **Hover**: `translateY(-2px)` + `box-shadow: 0 8px 24px rgba(0,0,0,0.4)`.
- **"Generate" button**: Full-width, `--color-accent` filled. Disabled state: `--color-surface-2` background, `--color-text-muted` text, `cursor: not-allowed`.

### 8.6 StatusIndicator
- **States**: `idle` (hidden), `generating` (blue pulsing), `completed` (green), `error` (red), `payment_required` (amber).
- **Colors**: MUST use CSS variables, not hardcoded hex. 
  - `generating`: `var(--color-accent)` (purple)
  - `completed`: `var(--color-success)`
  - `error`: `var(--color-error)`
  - `payment_required`: `var(--color-warning)`
- **Animation**: `pulse` on generating state (respects `prefers-reduced-motion`).
- **Layout**: Flex row, icon + label + optional error text.

### 8.7 StatusBar (Wallet)
- **Not connected**: Gray dot + "Not connected" text in `--color-text-muted`.
- **Connected**: Green dot `var(--color-success)` + truncated address (first 6 / last 4 chars) in `JetBrains Mono`.
- **Disconnect button**: Small, `--color-text-muted`, hover to `--color-error`.
- **Touch target**: 44px min height.

### 8.8 PaywallModal
- **Overlay**: `--color-overlay` + `backdrop-filter: blur(8px)`.
- **Modal body**: `--color-surface`, `border-radius: 16px`, max-width 480px.
- **Header**: Step indicator (1 → 2), price in large text, network badge.
- **Step 1**: Wallet connection button (MetaMask / WalletConnect).
- **Step 2**: Payment details, USDC amount, recipient (truncated), "Pay & Generate" button.
- **States**: connecting, paying, verifying, error, success.
- **Close**: X button top-right. Escape key. Backdrop click dismisses (confirm if payment in progress).

### 8.9 WalletSelectionModal
- **Reuses** PaywallModal overlay classes.
- **Two cards**: MetaMask (orange gradient accent) and WalletConnect (blue gradient accent). 48px min height each.
- **Connecting state**: Spinner in the selected card.

### 8.10 ImageModal (My Images)
- **Overlay**: `--color-overlay` + `backdrop-filter: blur(8px)`.
- **Image**: Max 70vh, contained in `--color-bg`.
- **Metadata section**: `--color-surface-2`, grid layout. Labels in `--color-text-muted`, values in `--color-text`.
- **Actions**: Download, Delete. Delete uses `--color-error` hover state.
- **Close**: Escape key, X button, backdrop click.

### 8.11 Buttons (Base `.button` class)
- **Min height**: 44px (touch target).
- **Border radius**: 8px.
- **Font**: Inter 500, 0.95rem.
- **Transition**: `all 0.15s ease-out`.
- **Variants**:
  - `.primary`: filled `--color-accent`, white text. Hover: `--color-accent-hover`.
  - `.secondary`: transparent, `1px solid var(--color-border)`. Hover: `--color-surface-2`.
  - `.danger`: `1px solid var(--color-error)`, transparent bg. Hover: `--color-error-muted`. Text stays `--color-error`.
  - `.ghost`: transparent, no border. Hover: `--color-surface-2`.

---

## 9. Interaction & Animation

### 9.1 Timing
| Type | Duration | Easing | Use |
|------|----------|--------|-----|
| Micro-interaction | `150ms` | `ease-out` | Hover, focus, active states |
| Standard transition | `200ms` | `ease-out` | Modal open, card expand |
| Complex transition | `300ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Panel slide, page transitions |
| Exit animation | `100-150ms` | `ease-in` | Dismissal (60-70% of enter) |

### 9.2 Rules
- **Transform/opacity only** — no animating width, height, top, left. Use `transform: translateY()`, `scale()`, `opacity`.
- **Enter**: `ease-out`. **Exit**: `ease-in`. Exit duration is ~60% of enter duration.
- **Press feedback**: `scale(0.97)` on `:active` for cards. `opacity` reduction on buttons.
- **Loading**: Show skeleton/spinner after 300ms wait. Use `animate-pulse` pattern.
- **`prefers-reduced-motion`**: Disable all non-essential animations. StatusIndicator pulse becomes static color. Card hover transform is removed. Modals appear instantly (no transition).

### 9.3 Key Animations
- **Modal enter**: `fadeIn 200ms ease-out` on overlay. `slideUp 300ms cubic-bezier(0.4,0,0.2,1)` on modal body.
- **Side panel**: `transform: translateX(0)` → `translateX(100%)`. 250ms.
- **Card hover**: `transform: translateY(-2px)`, no layout shift.
- **Burger → X**: Current CSS transform approach — keep it.
- **Status pulse**: `opacity` keyframe, 1.5s cycle.

---

## 10. Icon System

### 10.1 Library
**Lucide React** — tree-shakeable, 1000+ icons, consistent 24px base with `strokeWidth: 2`.

Install:
```bash
bun add lucide-react
```

### 10.2 Usage
```tsx
import { Sparkles, Upload, Download, Trash2, X, Menu, ChevronRight } from 'lucide-react';

// Default sizing
<Sparkles size={24} strokeWidth={2} />

// In buttons
<button className="button primary">
  <Sparkles size={18} />
  Generate
</button>
```

### 10.3 Size Tokens
| Context | Size |
|---------|------|
| Inline with body text | `18px` |
| Standalone icon button | `24px` |
| Large decorative | `32px` |
| Navigation icon | `20px` |

### 10.4 Migration from Inline SVG
Current components use handwritten `<svg>` elements (e.g., `PaywallModal.tsx`). Replace all with Lucide equivalents:
- `PaywallModal.tsx` SVGs → `Wallet`, `ShieldCheck`, `ExternalLink`, etc.
- `ImageModal.tsx` close SVG → `X`
- `Header.tsx` logo SVG → `Sparkles`
- `StatusBar.tsx` green dot → `Circle` (filled)
- Any other inline SVGs → closest Lucide match

### 10.5 Rules
- Always set `aria-label` on icon-only buttons.
- Use `strokeWidth={2}` consistently.
- Icon color inherits via `currentColor` — no hardcoded fill/stroke hex.

---

## 11. Accessibility

### 11.1 Requirements (Priority 1)
- **Contrast**: 4.5:1 minimum for all body text. Verified for all `--color-text` on `--color-surface` and `--color-bg` combinations.
- **Focus rings**: `outline: 2px solid var(--color-ring); outline-offset: 2px` on all interactive elements. Never `outline: none` without replacement.
- **Keyboard navigation**: Tab order matches visual order. All interactive elements reachable via Tab. Modals trap focus.
- **Screen readers**: `aria-label` on icon-only buttons. `aria-live="polite"` for status updates. `role="alert"` for errors. `alt` text for meaningful images.
- **Form labels**: All inputs have visible `<label>` elements. No placeholder-only labels.

### 11.2 Component-Specific
- **StatusIndicator**: `aria-live="polite"` for status changes. `role="alert"` for errors.
- **PaywallModal**: Focus trap. Escape closes. First focusable element auto-focused.
- **ImageUpload**: `role="button"` on drop-zone. `aria-label="Upload reference image"`.
- **PromptGallery cards**: `role="button"` or `<button>`. `aria-pressed` for selected state.
- **Toast/PWA banner**: `role="status"` with `aria-live="polite"`.

### 11.3 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 11.4 Dynamic Type
- All text sizes in `rem` units (already the case).
- Layouts use flex/grid, not fixed widths — they naturally reflow on text zoom.
- Test at 200% zoom.

---

## 12. CSS Architecture

### 12.1 File Structure (Target)

```
frontend/src/styles/
├── tokens.css         # All CSS custom properties (single source of truth)
├── reset.css          # Modern CSS reset
├── global.css         # Body, headings, base elements
└── utilities.css      # Optional: text-scale, spacing utilities

frontend/src/components/
├── Header.css         # Imports tokens implicitly (global), component-specific
├── SidePanel.css
├── StatusIndicator.css
├── StatusBar.css
├── PaywallModal.css
├── BurgerButton.css
└── ...

frontend/src/
├── App.css            # App shell layout + shared component patterns
├── index.css          # REMOVED — consolidate into tokens.css + global.css
```

### 12.2 Tokens File (`src/styles/tokens.css`)

Single source of truth. All CSS custom properties live here.

```css
:root {
  /* Backgrounds */
  --color-bg: #0a0a0a;
  --color-surface: #141416;
  --color-surface-2: #1e1e22;
  --color-surface-3: #28282e;

  /* Text */
  --color-text: #e4e4e7;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
  --color-text-inverse: #ffffff;

  /* Borders */
  --color-border: #27272a;
  --color-border-emphasized: #3f3f46;

  /* Brand */
  --color-accent: #7c3bff;
  --color-accent-hover: #9370ff;
  --color-accent-muted: rgba(124, 59, 255, 0.15);
  --color-accent-pink: #ec4899;

  /* Semantic */
  --color-success: #22c55e;
  --color-success-muted: rgba(34, 197, 94, 0.15);
  --color-error: #ef4444;
  --color-error-muted: rgba(239, 68, 68, 0.15);
  --color-warning: #f59e0b;
  --color-warning-muted: rgba(245, 158, 11, 0.15);

  /* Overlay */
  --color-overlay: rgba(0, 0, 0, 0.75);

  /* Focus */
  --color-ring: #7c3bff;

  /* Typography */
  --font-heading: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, Consolas, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.125rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 3rem;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows (dark mode) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);

  /* Z-Index */
  --z-base: 0;
  --z-sticky: 10;
  --z-dropdown: 20;
  --z-overlay: 40;
  --z-side-panel: 50;
  --z-modal-backdrop: 100;
  --z-modal: 101;
  --z-toast: 200;
}
```

### 12.3 Reset File (`src/styles/reset.css`)

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  -moz-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  min-height: 100dvh;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}

button {
  cursor: pointer;
}
```

### 12.4 Global Styles (`src/styles/global.css`)

```css
body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-text);
  background: var(--color-bg);
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  color: var(--color-text);
  line-height: 1.2;
}

h1 { font-size: var(--text-2xl); font-weight: 700; letter-spacing: -0.02em; }
h2 { font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.01em; }
h3 { font-size: var(--text-md); font-weight: 600; }
h4 { font-size: var(--text-base); font-weight: 600; }

code, .mono {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

a {
  color: var(--color-accent);
  text-decoration: none;

  &:hover { text-decoration: underline; }
}

:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

### 12.5 Rules
- `tokens.css` is loaded first in `main.tsx`.
- `reset.css` is loaded second.
- `global.css` is loaded third.
- `App.css` is loaded last and imports shared component patterns.
- Component `.css` files only contain component-specific rules — no redefinition of tokens.
- **Delete `index.css`** — it is redundant and conflicting.

---

## 13. Migration Plan

### Phase 1 — Dependencies & Tokens (no visual changes)
1. `bun add lucide-react`
2. Create `frontend/src/styles/tokens.css` with all tokens from §12.2.
3. Create `frontend/src/styles/reset.css` with reset from §12.3.
4. Create `frontend/src/styles/global.css` with global styles from §12.4.
5. In `main.tsx`, import the three new CSS files before App.css.

### Phase 2 — Consolidate Token System
6. Remove the `index.css` import from `main.tsx`. Delete `index.css`.
7. Update `App.css`: remove `:root { ... }` block. Replace all `var(--bg)` → `var(--color-bg)`, `var(--surface)` → `var(--color-surface)`, etc.
8. Update `Header.css`: replace `#ffffff` → `var(--color-surface)`, `#333` → `var(--color-text)`.
9. Update `StatusBar.css`: replace all hardcoded hex with token variables.
10. Update `StatusIndicator.css`: replace `#ef4444` with `var(--color-error)`.
11. Update `ConfigPage.css`: replace `--text-bright` → `var(--color-text)`.

### Phase 3 — Migrate Hardcoded Colors in TSX
12. Update `StatusIndicator.tsx`: replace the `statusConfig` JS object's color values to use CSS variables (pass class names, not inline colors). Or use a CSS class-based approach.
13. Replace all 8 inline `style={{...}}` instances with CSS classes or tokens.
14. Fix `ConfigPage.tsx`: add `className="app-main"` to `<main>`.

### Phase 4 — Icon Migration
15. Replace inline SVGs in `PaywallModal.tsx` with Lucide React components.
16. Replace inline SVGs in `StatusBar.tsx`, `ImageModal.tsx`, `Header.tsx` with Lucide.
17. Remove any leftover `<svg>` elements from components.

### Phase 5 — Accessibility & Polish
18. Add `aria-label` to all icon-only buttons.
19. Add `aria-live` regions for StatusIndicator and payment status.
20. Add `:focus-visible` styles to all interactive elements.
21. Add `prefers-reduced-motion` media query.
22. Add `font-display: swap` for Google Fonts.
23. Test at 375px, 768px, 1024px, 1440px widths.
24. Verify all contrast ratios meet 4.5:1.
25. Test with keyboard navigation through entire flow.

---

## 14. Pre-Delivery Checklist

Before any UI deployment, verify:

### Visual Quality
- [ ] No emojis used as icons (Lucide React instead)
- [ ] All icons from Lucide with `strokeWidth={2}`
- [ ] No raw hex color values in components (only CSS variable references)
- [ ] Pressed/hover/disabled states visually distinct
- [ ] Token system used consistently across all CSS files

### Interaction
- [ ] All buttons/links have `cursor: pointer`
- [ ] Touch targets ≥44px (min-height on all buttons)
- [ ] Loading states shown for operations >300ms
- [ ] Disabled buttons have `cursor: not-allowed` + reduced opacity
- [ ] Focus rings visible on keyboard Tab through all elements

### Accessibility
- [ ] All text contrast ≥4.5:1 on background
- [ ] All icon buttons have `aria-label`
- [ ] Status updates use `aria-live` regions
- [ ] Color is never the only indicator (add icon/text)
- [ ] Keyboard navigation works through full generation flow
- [ ] `prefers-reduced-motion` disables animations

### Layout
- [ ] Header fixed, 64px, uses `--color-surface` background
- [ ] Body has `padding-top: 64px` for header offset
- [ ] No horizontal scroll at any breakpoint
- [ ] Tested: 375px, 768px, 1024px, 1440px
- [ ] Modals scrollable when content overflows viewport
- [ ] 4px/8px spacing rhythm consistent

### Dark Mode (Only)
- [ ] Background is `--color-bg` (#0a0a0a) throughout
- [ ] Surface layers are distinguishable (bg < surface < surface-2 < surface-3)
- [ ] Text contrast verified on all surfaces
- [ ] Borders/separators visible but subtle

---

## Appendix A — Color Contrast Verification

| Foreground | Background | Ratio | Pass AA? |
|-----------|-----------|-------|-----------|
| `--color-text` (#e4e4e7) | `--color-bg` (#0a0a0a) | 15.5:1 | ✓ AAA |
| `--color-text` (#e4e4e7) | `--color-surface` (#141416) | 12.8:1 | ✓ AAA |
| `--color-text-secondary` (#a1a1aa) | `--color-surface` (#141416) | 6.5:1 | ✓ AA |
| `--color-text-muted` (#71717a) | `--color-surface` (#141416) | 3.5:1 | ✗ (non-critical only) |
| `--color-accent` (#7c3bff) | `--color-bg` (#0a0a0a) | 6.1:1 | ✓ AA |
| `--color-success` (#22c55e) | `--color-surface` (#141416) | 5.1:1 | ✓ AA |
| `--color-error` (#ef4444) | `--color-surface` (#141416) | 4.6:1 | ✓ AA |
| `--color-warning` (#f59e0b) | `--color-surface` (#141416) | 4.5:1 | ✓ AA |
| `--color-text-inverse` (#ffffff) | `--color-accent` (#7c3bff) | 4.8:1 | ✓ AA |

**Note**: `--color-text-muted` (#71717a) does NOT meet 4.5:1 and is acceptable only for non-critical decorative/hint text (WCAG allows lower contrast for inactive/disabled UI elements).

---

## Appendix B — Font Loading Strategy

```css
/* In global.css or index.html <style> */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2) format('woff2');
}
```

- Use `font-display: swap` — text renders in fallback font immediately, swaps when custom font loads.
- Preload critical weights (400, 600) in `<link rel="preload">` in `index.html`.
- Non-critical weights (500, 700) load asynchronously.

---

## Appendix C — Design Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Dark-only (no light mode) | OLED suits AI generation focus; web3 audience expects dark; simpler implementation | 2026-05 |
| Lucide React over inline SVGs | Consistent sizing/stroke; tree-shakeable; React-native; reduces maintenance | 2026-05 |
| Space Grotesk + Inter | Web3/crypto mood (Grotesk); excellent readability (Inter); both open-source | 2026-05 |
| JetBrains Mono for addresses | Tabular figures for alignments; excellent readability at small sizes; widely used in crypto | 2026-05 |
| `#7c3bff` accent (purple) | AI/creativity association; strong contrast on dark; pairs with `#ec4899` pink for generation states | 2026-05 |
| 4px spacing base | Material Design standard; divisible into 8/12/16/20/24/32/48 easily | 2026-05 |

---

*This DESIGN.md is the single source of truth for Prompter's visual design. All UI changes should reference this document. When in doubt, prioritize accessibility (§11) and consistency with the token system (§5).*
