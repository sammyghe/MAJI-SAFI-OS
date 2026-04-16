# Design System Specification: Hydraulic Precision

## 1. Overview & Creative North Star
The "Hydraulic Precision" system is an editorial-grade interface designed to balance the fluid nature of water-resource management with the rigid, unforgiving accuracy of high-finance ledgers. We are moving away from "SaaS-standard" dashboards toward a "Digital Ledger" aesthetic—think high-end Swiss typography meeting a specialized architectural tool.

**Creative North Star: The Sovereign Ledger**
This system treats data as a premium asset. We avoid the "cluttered box" look of traditional OS environments. Instead, we use intentional asymmetry, expansive negative space, and a high-contrast typographic scale to create a sense of authoritative calm. Every numeric value is a hero; every label is a quiet assistant.

## 2. Colors: Tonal Depth & Fluidity
We leverage a deep, oceanic palette. While the primary blue provides the "soul" of the system, the hierarchy is defined by the shifting depths of the background layers.

*   **The "No-Line" Rule:** Although the base requirements allow for 1px borders, we primarily define sections through background shifts. Use `surface-container-low` against a `surface` background to create a boundary. 
*   **The Ghost Border:** For mandatory containment, use a "Ghost Border"—the `outline-variant` token at **10-15% opacity**. This provides a whisper of structure without "caging" the data.
*   **Surface Hierarchy:**
    *   `surface-container-lowest` (#0a0e14): Used for the deepest "recessed" areas (e.g., the main ledger track).
    *   `surface` (#10141a): The standard canvas.
    *   `surface-container-high` (#262a31): Used for active floating elements or headers.
*   **The Glass & Gradient Rule:** To signify importance, use a linear gradient from `primary` (#0077B6) to `primary_container` (#0077B6 at 70% opacity) for primary CTAs. For cards, use `surface_container` with a `backdrop-blur-md` and 80% opacity to allow the dark background to bleed through.

## 3. Typography: The Dual-Tone System
We use a high-contrast font strategy to separate "Administrative Labels" from "Operational Data."

*   **Headlines (Manrope):** Sophisticated, geometric, and authoritative. Use `headline-lg` for section headers with wide letter-spacing (-0.02em).
*   **The Ledger (Space Grotesk):** This is our "utility" font. All numbers, currency, and data points **must** use Space Grotesk. Its mono-spaced qualities ensure that columns of figures align perfectly, conveying a sense of mathematical "Actual Budget" integrity.
*   **Labels (Inter):** Small, crisp, and functional. Used for metadata and button text.

| Role | Font | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | Manrope | 3.5rem | 700 | Branding/Hero Stats |
| **Ledger Bold** | Space Grotesk | 1.125rem | 600 | Currency & Numeric Values |
| **Label** | Inter | 0.75rem | 500 | Metadata & Form Titles |

## 4. Elevation & Depth: Layering over Shadowing
Traditional shadows are prohibited. Depth is achieved via **Tonal Layering**.

*   **The Layering Principle:** A "floating" card is created by placing a `surface-container-highest` element over a `surface-dim` background.
*   **Ambient Glow:** Instead of a drop shadow, use a subtle 4px blur of `primary` color at 5% opacity behind active numeric cards to simulate a glowing "screen" effect.
*   **Glassmorphism:** Use Tailwind's `bg-opacity-80` and `backdrop-blur-xl` on the Sidebar and Card elements. This maintains a "wet," premium look consistent with the primary color's water theme.

## 5. Components

### The Resizable Sidebar
*   **Visuals:** `surface-container-low` background, 1px "Ghost Border" on the right edge.
*   **Behavior:** Default `240px`. Interactions must feel "heavy" and tactile. Use `lucide-react` icons sized at 18px for better optical balance with the Inter label font.

### Premium Ledger Cards
*   **Structure:** No shadows. `1px` Ghost Border (`outline-variant` @ 15%).
*   **Content:** Every numeric figure must be followed by a `[Ref]` placeholder in `label-sm` (Inter) at 40% opacity.
*   **Layout:** Use asymmetrical padding (e.g., `pt-8 pb-4 px-6`) to give the data "room to breathe" at the top of the card.

### Buttons & Inputs
*   **Primary Button:** `bg-primary` (#0077B6), `text-on_primary`, `rounded-sm`. No gradient on hover; instead, increase brightness by 10%.
*   **Inputs:** `bg-surface_container_lowest` with a bottom-only 1px border. Focus state: the border transforms into a 1px `primary` solid line.

### Data Chips
*   **Success:** `bg-secondary_container` (#12533a) with `text-secondary`.
*   **Alert:** `bg-tertiary_container` (#e1112e) with `text-on_tertiary_container`.
*   **Design Note:** Use `rounded-none` for a more "brutalist/ledger" feel on status indicators.

## 6. Do's and Don'ts

### Do
*   **DO** use `Space Grotesk` for every single number. A currency value in a sans-serif font is a system failure.
*   **DO** leave significant "white space" (even in dark mode). The design should feel expensive and unhurried.
*   **DO** use `[Ref]` tags to anchor every piece of numeric data to its source, styled as `text-outline/50`.

### Don't
*   **DON'T** use `shadow-lg` or any standard drop shadows. If it needs to pop, change the surface color or add a backdrop blur.
*   **DON'T** use rounded corners larger than `rounded-md` (0.375rem). The system should feel sharp and precise, not soft or consumer-grade.
*   **DON'T** use 100% opaque borders to separate content. Use the "Ghost Border" or background shifts only.

## 7. Tailwind Implementation Reference