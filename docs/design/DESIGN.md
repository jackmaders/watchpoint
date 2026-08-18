# Design System: Watchpoint

This document is the canonical design system specification for Watchpoint and AI coding agents. It defines the visual tokens, typography, component primitives, and styling constraints for all user interface work.

---

## 1. Visual Philosophy & Core Aesthetics

- **Style**: Modern, high-density observability & video player interface. Minimalist, uncluttered, utilitarian.
- **Theme Default**: Solar Dusk dark mode by default with warm-paper light mode when the system prefers light.
- **Spacing**: 4px baseline grid (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `gap-2`, `gap-4`).
- **Surface Elevation**: Subtle `border-border` / `border-input` separation with restrained Solar Dusk shadows (`shadow-sm` through `shadow-2xl`).

---

## 2. Color Palette & Semantic Tokens

All codebase components must use these semantic tokens. Arbitrary hard-coded hex colors are forbidden. The token values are defined canonically in `src/app/styles/globals.css`; this table documents their intent and usage.

| Token | Tailwind Class | Semantic Usage |
| :--- | :--- | :--- |
| `accent` | `bg-accent` | Cool-blue contextual highlights, hover states, active dropdown items |
| `accent-foreground` | `text-accent-foreground` | Text on hovered items |
| `background` | `bg-background` | Application canvas / base background |
| `border` | `border-border` | Component borders and separators |
| `card` | `bg-card` | Surface containers, sidebars, panels |
| `card-foreground` | `text-card-foreground` | Text on card surfaces |
| `destructive` | `bg-destructive` | Error states, stop buttons, delete actions |
| `destructive-foreground` | `text-destructive-foreground` | Text on destructive buttons |
| `foreground` | `text-foreground` | Primary text and headers |
| `input` | `border-input` | Input outlines |
| `muted` | `bg-muted` | Recessed backgrounds, table headers, track bars |
| `muted-foreground` | `text-muted-foreground` | Timestamps, helper copy, subtitles, metadata |
| `primary` | `bg-primary, text-primary` | Orange primary actions, active highlights, key metrics |
| `primary-foreground` | `text-primary-foreground` | Text on primary buttons |
| `ring` | `ring-ring` | Keyboard focus rings |
| `secondary` | `bg-secondary` | Secondary buttons, warm neutral badges, inactive tabs |
| `secondary-foreground` | `text-secondary-foreground` | Text on secondary buttons |

---

## 3. Typography & Hierarchy

- **Font Family**:
  - Sans: `font-sans` (`Oxanium`, ui-sans-serif, system-ui) — the primary interface voice.
  - Serif: `font-serif` (`Merriweather`, ui-serif, Georgia) — reserved for rare editorial emphasis.
  - Mono: `font-mono` (`Fira Code`, ui-monospace, monospace) — used for timestamps, video frame numbers, error codes, and log outputs.

The agreed weights are self-hosted in `public/fonts`: Oxanium 400/500/600/700, Merriweather 400/700, and Fira Code 400/500/600. Do not add an external font runtime or package.
- **Hierarchy Scale**:
  - `text-xs` (12px, tracking-tight): Timestamps, badge labels, metadata pills, keyboard shortcuts.
  - `text-sm` (14px, leading-5): Standard body copy, table cells, form labels, button labels.
  - `text-base` (16px, leading-6): Card headers, emphasized text, prominent inputs.
  - `text-lg` (18px, font-semibold): Section headings, modal titles.
  - `text-xl` (20px, font-bold): View titles, dashboard metrics.

---

## 4. Component Primitive Catalog (`shared/ui`)

When building interfaces, strictly compose screens from these standardized atomic components:

### Button (`shared/ui/button.tsx`)
- **Sizes**:
  - `sm`: `h-8 px-3 text-xs rounded-md`
  - `default`: `h-9 px-4 py-2 text-sm rounded-md`
  - `lg`: `h-10 px-8 text-base rounded-md`
  - `icon`: `h-9 w-9 p-0 rounded-md`
- **Variants**:
  - `default`: `bg-primary text-primary-foreground shadow hover:bg-primary/90`
  - `secondary`: `bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80`
  - `outline`: `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`
  - `ghost`: `hover:bg-accent hover:text-accent-foreground`
  - `destructive`: `bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90`
  - `link`: `text-primary underline-offset-4 hover:underline`

### Input & Form Controls
- `Input`: `h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring`
- `Badge`: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold` (`bg-secondary text-secondary-foreground` or `bg-primary/10 text-primary`)

### Cards & Panels
- `Card`: `rounded-lg border border-input bg-card text-card-foreground shadow`

---

## 5. Icon Standards

- All icons must map directly to **`lucide-react`** icon identifiers.
- Inline custom SVG shapes are prohibited in production components.
- Common icons in Watchpoint:
  - Playback: `Play`, `Pause`, `RotateCcw`, `Volume2`, `VolumeX`, `Maximize`, `Minimize`, `FastForward`
  - Timeline & Markers: `Flag`, `Bookmark`, `Pin`, `Scissors`, `Sliders`
  - Navigation & Status: `ChevronDown`, `ChevronRight`, `CheckCircle2`, `AlertCircle`, `Info`, `Clock`, `Search`, `Settings`

---

## 6. Implementation Guidance

The edited token source is the Tailwind v4 CSS in `src/app/styles/globals.css`. Keep semantic values and their `@theme` mappings together; this file documents their intent and usage.

1. **Use this `DESIGN.md`** as the design context anchor.
2. **Use semantic Tailwind classes** and the token names defined here.
3. **Include interactive states** such as `Default`, `Hover`, `Loading`, `Active`, and `Error/Empty` where they apply.
