# Design System: Watchpoint

This document is the canonical design system specification for Watchpoint and AI coding agents. It defines the visual tokens, typography, component primitives, and styling constraints for all user interface work.

---

## 1. Visual Philosophy & Core Aesthetics

- **Style**: Modern, high-density observability & video player interface. Minimalist, uncluttered, utilitarian.
- **Theme Default**: Dark mode by default with balanced contrast and crisp separation.
- **Spacing**: 4px baseline grid (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `gap-2`, `gap-4`).
- **Surface Elevation**: Subtle border borders (`border-border` / `border-input`) over heavy box-shadows.

---

## 2. Color Palette & Semantic Tokens

All codebase components must use these semantic tokens. Arbitrary hard-coded hex colors are forbidden.

| Token | Dark Mode Value | Light Mode Value | Tailwind Class | Semantic Usage |
| :--- | :--- | :--- | :--- | :--- |
| `background` | `#0a0a0a` | `#ffffff` | `bg-background` | Application canvas / base background |
| `foreground` | `#ededed` | `#171717` | `text-foreground` | Primary text and headers |
| `card` | `#121212` | `#f9f9f9` | `bg-card` | Surface containers, sidebars, panels |
| `card-foreground` | `#ededed` | `#171717` | `text-card-foreground` | Text on card surfaces |
| `primary` | `#3b82f6` (Blue) | `#2563eb` | `bg-primary`, `text-primary` | Primary action buttons, active highlights, key metrics |
| `primary-foreground` | `#ffffff` | `#ffffff` | `text-primary-foreground` | Text on primary buttons |
| `secondary` | `#262626` | `#f4f4f5` | `bg-secondary` | Secondary buttons, subtle badges, inactive tabs |
| `secondary-foreground` | `#f4f4f5` | `#18181b` | `text-secondary-foreground` | Text on secondary buttons |
| `muted` | `#27272a` | `#f4f4f5` | `bg-muted` | Recessed backgrounds, table headers, track bars |
| `muted-foreground` | `#a1a1aa` | `#71717a` | `text-muted-foreground` | Timestamps, helper copy, subtitles, metadata |
| `accent` | `#27272a` | `#f4f4f5` | `bg-accent` | Hover states, active dropdown items |
| `accent-foreground` | `#fafafa` | `#09090b` | `text-accent-foreground` | Text on hovered items |
| `destructive` | `#ef4444` (Red) | `#dc2626` | `bg-destructive` | Error states, stop buttons, delete actions |
| `destructive-foreground` | `#ffffff` | `#ffffff` | `text-destructive-foreground` | Text on destructive actions |
| `border` / `input` | `#27272a` | `#e4e4e7` | `border-input`, `border-border` | Component borders, separators, input outlines |
| `ring` | `#3b82f6` | `#2563eb` | `ring-ring` | Keyboard focus rings |

---

## 3. Typography & Hierarchy

- **Font Family**:
  - Sans: `font-sans` (`Geist Sans`, `Inter`, `Arial`, system-ui)
  - Mono: `font-mono` (`Geist Mono`, `JetBrains Mono`, monospace) — used for timestamps, video frame numbers, error codes, and log outputs.
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

1. **Use this `DESIGN.md`** as the design context anchor.
2. **Use semantic Tailwind classes** and the token names defined here.
3. **Include interactive states** such as `Default`, `Hover`, `Loading`, `Active`, and `Error/Empty` where they apply.
