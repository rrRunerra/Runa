# Runa Design System

> A premium, glassmorphic design language built with **Tailwind CSS v4**, **Framer Motion**, and **OKLCH color tokens**. This document codifies the visual language, animation philosophy, and component patterns used across the Runa frontend.

---

## Table of Contents

- [Philosophy](#philosophy)
- [Color System](#color-system)
- [Typography](#typography)
- [Spacing & Radius](#spacing--radius)
- [Surface & Glass](#surface--glass)
- [Animation System](#animation-system)
- [Component Patterns](#component-patterns)
- [Icon Standards](#icon-standards)
- [Responsive Strategy](#responsive-strategy)

---

## Philosophy

Runa's UI follows three core tenets:

1. **Premium Feel** — Every surface should feel polished, layered, and intentional. We avoid flat, sterile layouts in favor of depth via blur, translucency, and subtle borders.
2. **Spring-Driven Motion** — All meaningful transitions use physics-based spring curves, not linear easing. Motion should feel organic, never robotic.
3. **Dark-First Design** — Dark mode is the primary experience. Light mode is derived from it, not bolted on. Both modes share the same structural hierarchy.

---

## Color System

### Token Architecture

All colors are defined as **OKLCH** values in `globals.css` via CSS custom properties. Tailwind references these via `--color-*` aliases.

| Token                | Purpose                                  | Dark Value (example)              |
| -------------------- | ---------------------------------------- | --------------------------------- |
| `--background`       | Page/app-level background                | `oklch(0.141 0.005 285.823)`      |
| `--foreground`       | Primary text                             | `oklch(0.985 0 0)`                |
| `--card`             | Elevated surface (cards, panels)         | `oklch(0.21 0.006 285.885)`       |
| `--primary`          | Brand accent, active states, CTAs        | `oklch(0.432 0.232 292.759)`      |
| `--primary-foreground` | Text on primary-colored backgrounds   | `oklch(0.969 0.016 293.756)`      |
| `--muted`            | Subtle backgrounds, disabled states      | `oklch(0.274 0.006 286.033)`      |
| `--muted-foreground` | Secondary/tertiary text                  | `oklch(0.705 0.015 286.067)`      |
| `--border`           | Dividers and container outlines          | `oklch(1 0 0 / 10%)`             |
| `--destructive`      | Error/danger states                      | `oklch(0.704 0.191 22.216)`       |

### Semantic Colors (Inline)

For status indicators and contextual accents, use these patterns **inline** (not as tokens):

| Context       | Color Pattern                                          |
| ------------- | ------------------------------------------------------ |
| Success/Active | `bg-emerald-500/10 text-emerald-500 border-emerald-500/20` |
| Error/Invalid | `border-red-500/50 bg-red-500/5 text-red-500`           |
| Warning       | `bg-orange-500/10 text-orange-500 border-orange-500/20`  |
| Info/Accent   | `bg-purple-500/10 text-purple-400 border-purple-500/20`  |
| Primary glow  | `bg-primary/10 text-primary border-primary/20`           |

### Multi-Theme Support

Runa supports multiple themes (Default, Catppuccin, Cosmic Night, Cyberpunk) defined in `config/themes.ts`. Each theme provides four colors for preview mockups: `background`, `sidebar`, `primary`, `accent` with both `dark` and `light` variants.

---

## Typography

### Font Stack

```css
--font-sans: /* Geist Sans via next/font */
--font-mono: /* Geist Mono via next/font */
--font-heading: var(--font-sans);
```

### Scale

| Usage                 | Class                                               | Size    |
| --------------------- | --------------------------------------------------- | ------- |
| Dialog title          | `text-base sm:text-lg font-bold`                    | 16–18px |
| Section heading       | `text-xs sm:text-sm font-semibold`                  | 12–14px |
| Subsection heading    | `text-xs font-semibold uppercase tracking-wider`    | 12px    |
| Body text             | `text-xs text-muted-foreground`                     | 12px    |
| Fine print / labels   | `text-[11px] sm:text-xs text-muted-foreground`      | 11–12px |
| Micro text            | `text-[10px] text-muted-foreground`                 | 10px    |
| Badge / status        | `text-[10px] font-semibold`                         | 10px    |

### Hierarchy Rules

- **Section headers** (`h3`): `text-sm font-semibold text-foreground`
- **Subsection headers** (`h4`): `text-xs font-semibold text-muted-foreground uppercase tracking-wider`
- **Descriptions** always sit below headings: `text-xs text-muted-foreground mt-0.5`
- **Labels** on form fields: use the `<Label>` component from `ui/label`

---

## Spacing & Radius

### Spacing Scale

| Context             | Value                    |
| ------------------- | ------------------------ |
| Dialog padding      | `p-5 sm:p-6`            |
| Section gap         | `space-y-6`             |
| Card internal       | `p-4 sm:p-5`            |
| Item gap (tight)    | `gap-1.5`               |
| Item gap (normal)   | `gap-3` or `gap-3.5`    |
| Item gap (wide)     | `gap-4`                 |
| Grid gap            | `gap-4`                 |
| Border bottom pad   | `pb-4 sm:pb-5`          |

### Radius Tokens

Defined in `globals.css` as multiples of `--radius` (0.625rem = 10px):

| Token          | Value     | Usage                        |
| -------------- | --------- | ---------------------------- |
| `rounded-sm`   | 6px       | Tiny badges                  |
| `rounded-md`   | 8px       | Inputs, small buttons        |
| `rounded-lg`   | 10px      | Standard cards, buttons      |
| `rounded-xl`   | 14px      | Navigation items, panels     |
| `rounded-2xl`  | 18px      | Dialog containers, theme cards |
| `rounded-full` | ∞         | Avatars, status dots, pills  |

**Preferred radius:** `rounded-xl` for interactive elements, `rounded-2xl` for containers.

---

## Surface & Glass

### Glassmorphic Containers

The signature look. Used for dialogs and elevated surfaces.

```
bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl rounded-2xl
```

Key properties:
- **Background**: Semi-transparent zinc (`/90` opacity)
- **Blur**: `backdrop-blur-xl` (24px)
- **Border**: Subtle zinc at 80% opacity
- **Shadow**: `shadow-2xl` for depth
- **Radius**: Always `rounded-2xl`

### Surface Hierarchy

| Level            | Pattern                                              |
| ---------------- | ---------------------------------------------------- |
| L0 — Page        | `bg-background`                                       |
| L1 — Dialog      | `bg-zinc-950/90 backdrop-blur-xl`                     |
| L2 — Sidebar     | `bg-zinc-900/10 border-zinc-800/40`                   |
| L3 — Card        | `bg-card/30 backdrop-blur-xs border-border/60`        |
| L4 — Inset       | `bg-muted/30 border-border/50`                        |
| L5 — Footer      | `bg-zinc-900/20 border-t border-zinc-800/40`          |

### Dividers

Use low-opacity borders, never solid lines:

```
border-zinc-800/40      /* Primary dividers */
border-border/40        /* Between list items (with divide-y) */
border-white/5          /* Inside mockup previews */
```

---

## Animation System

### Library

All animations use **Framer Motion** (`framer-motion`). Import `motion` and `AnimatePresence` from it.

### Spring Presets

| Name              | Config                                            | Usage                             |
| ----------------- | ------------------------------------------------- | --------------------------------- |
| **Default Spring** | `type: "spring", stiffness: 380, damping: 30`    | Layout animations, indicator bar, border morphs |
| **Content Spring** | `type: "spring", stiffness: 300, damping: 24`    | Staggered card entrances          |
| **Quick Fade**    | `duration: 0.2`                                   | Tab content transitions (enter/exit) |
| **Micro Pop**     | `duration: 0.15`                                  | Checkmark scale-in, badge pop     |

> **IMPORTANT**: When typing spring transitions, use `type: "spring" as const` to satisfy Framer Motion's `Variants` type.

### Core Patterns

#### 1. Layout Indicator (Shared Layout)

Used for sidebar nav active state and theme selection outlines:

```tsx
<motion.div
  layoutId="uniqueIdentifier"
  className="absolute ..."
  transition={{ type: "spring", stiffness: 380, damping: 30 }}
/>
```

- `layoutId="activeSettingsIndicator"` — Vertical bar on sidebar nav
- `layoutId="activeSettingsHighlight"` — Background highlight on sidebar nav
- `layoutId="activeThemeOutline"` — Border ring on theme cards
- `layoutId="activeModeOutline"` — Border ring on light/dark toggle

The indicator element is **conditionally rendered** inside the active item only.

#### 2. Tab Content Transition (AnimatePresence)

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeCategory}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.2 }}
  >
    {/* Tab content */}
  </motion.div>
</AnimatePresence>
```

- `mode="wait"` ensures old tab exits before new one enters.
- Vertical slide: `y: 12` → `y: 0` → `y: -12`.

#### 3. Staggered Container Entrance

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};
```

Apply `containerVariants` to a parent `motion.div` and `itemVariants` to each child `motion.div`. Used for multi-section content like the Appearance dialog.

#### 4. Micro-Interactions

| Element      | Hover                       | Active/Tap               |
| ------------ | --------------------------- | ------------------------ |
| Card/Button  | `whileHover={{ y: -3 }}`   | `whileTap={{ scale: 0.97 }}` |
| CTA Button   | `whileHover={{ scale: 1.02 }}` | `whileTap={{ scale: 0.98 }}` |
| Icon in card | `group-hover:scale-110 transition-transform duration-200` | — |

#### 5. Checkmark Pop (AnimatePresence)

```tsx
<AnimatePresence mode="popLayout">
  {isSelected ? (
    <motion.div
      key="selected"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
    >
      <Check className="size-2.5 stroke-3" />
    </motion.div>
  ) : (
    <div key="unselected" className="size-4 rounded-full border-2 border-zinc-800" />
  )}
</AnimatePresence>
```

---

## Component Patterns

### Dialog Anatomy

Every dialog follows this structure:

```
┌──────────────────────────────────────┐
│  DialogContent (glassmorphic)        │
│  ┌────────────────────────────────┐  │
│  │  DialogHeader                  │  │
│  │  [Icon Badge] [Title + Desc]   │  │
│  ├────────────────────────────────┤  │
│  │  Content Area (overflow-y)     │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │  Sections (space-y-6)    │  │  │
│  │  │  ┌──────────────────┐   │  │  │
│  │  │  │  Heading + Desc  │   │  │  │
│  │  │  │  Controls/Cards  │   │  │  │
│  │  │  └──────────────────┘   │  │  │
│  │  └──────────────────────────┘  │  │
│  ├────────────────────────────────┤  │
│  │  Footer (Cancel + Save)        │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

#### Header Icon Badge

```tsx
<div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hidden sm:block shrink-0">
  <IconComponent className="size-5" />
</div>
```

#### Footer Bar

```tsx
<div className="px-5 sm:px-6 py-4 border-t border-zinc-800/40 flex justify-end gap-3 bg-zinc-900/20 shrink-0">
  <Button variant="ghost" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 rounded-xl h-9 cursor-pointer">
    Cancel
  </Button>
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer">
      Save Changes
    </Button>
  </motion.div>
</div>
```

### Sidebar Navigation

Used in `SettingsDialog` for category switching:

```tsx
<button className="relative flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl ...">
  {isActive && (
    <>
      {/* Vertical indicator bar */}
      <motion.div
        layoutId="activeSettingsIndicator"
        className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-md"
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      />
      {/* Background highlight */}
      <motion.div
        layoutId="activeSettingsHighlight"
        className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/10"
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        style={{ pointerEvents: "none" }}
      />
    </>
  )}
  <span className="relative z-10 flex items-center gap-2.5">
    <Icon className="size-4" />
    Label
  </span>
</button>
```

Text color states:
- **Active**: `text-primary`
- **Inactive**: `text-muted-foreground hover:text-foreground`

### Selection Card

Used for theme picker and light/dark mode toggle:

```tsx
<motion.button
  whileHover={{ y: -3 }}
  whileTap={{ scale: 0.97 }}
  className={`group relative rounded-2xl border-2 p-3 ... ${
    isSelected
      ? "border-transparent bg-primary/5"
      : "border-zinc-800/60 hover:bg-zinc-900/20"
  }`}
>
  {isSelected && (
    <motion.div
      layoutId="activeOutlineId"
      className="absolute inset-0 border-2 border-primary rounded-2xl shadow-[0_0_15px_rgba(var(--primary),0.08)]"
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      style={{ pointerEvents: "none" }}
    />
  )}
  {/* Card content */}
</motion.button>
```

### Toggle Row (Privacy/Settings)

```tsx
<div className="flex items-center justify-between py-4">
  <div className="space-y-0.5 pr-8">
    <Label className="text-sm font-medium text-foreground cursor-pointer">
      Setting Name
    </Label>
    <p className="text-xs text-muted-foreground">
      Description of what this toggle does.
    </p>
  </div>
  <Switch checked={value} onCheckedChange={setValue} />
</div>
```

Wrap in `divide-y divide-border/40` for automatic separators.

### Connection Card

Elevated card with provider info, status badge, and action buttons:

```tsx
<div className={cn(
  "group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all duration-300 bg-card/30 backdrop-blur-xs",
  isConnected
    ? "border-emerald-500/20 hover:border-emerald-500/40"
    : "border-border/60 hover:border-primary/30"
)}>
  {/* Provider logo + info + badge */}
  {/* Action buttons */}
</div>
```

### Loading Spinner

```tsx
<div className="flex flex-col items-center justify-center py-12 space-y-4">
  <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  <p className="text-xs text-muted-foreground">Loading...</p>
</div>
```

### Form Inputs

All inputs use shadcn `<Input>` with:
- Height: `h-9`
- Padding: `px-3`
- Error state: `border-red-500/50 bg-red-500/5 focus-visible:ring-red-500/30`
- Password toggle: Absolutely-positioned eye icon at `right-3`

### Validation Criteria Panel

Animated criteria list for password requirements:

```tsx
<div className="p-3 rounded-xl bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
    Password Criteria
  </p>
  <ul className="grid grid-cols-1 gap-1.5">
    <li className="flex items-center gap-2 text-[11px]">
      <div className={cn(
        "size-1.5 rounded-full transition-all",
        met ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30"
      )} />
      Criterion label
    </li>
  </ul>
</div>
```

The green dot gains a glow (`shadow-[0_0_6px_...]`) when the criterion is met.

---

## Icon Standards

- **Library**: Lucide React (`lucide-react`)
- **Default size**: `size-4` (16px) for inline icons
- **Header badge icon**: `size-5` (20px)
- **Micro icons**: `size-3.5` (14px) for buttons, toggles
- **Check icon**: `size-2.5 stroke-3` (inside selection dots)
- **Always** use the `className` prop, never `width`/`height`

---

## Responsive Strategy

### Breakpoints

Follow Tailwind's default breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`).

### Patterns

| Element            | Mobile                              | Desktop                             |
| ------------------ | ----------------------------------- | ----------------------------------- |
| Dialog width       | `max-w-[95vw]`                      | `md:max-w-5xl lg:max-w-6xl`        |
| Dialog layout      | `flex-col`, height `h-[92vh]`       | `md:flex-row`, height `md:h-[720px]` |
| Sidebar nav        | Horizontal scrollable row           | `md:w-64` vertical column           |
| Section heading    | `text-xs`                           | `sm:text-sm`                         |
| Grid columns       | `grid-cols-2`                       | `sm:grid-cols-3 lg:grid-cols-4`      |
| Header icon badge  | `hidden`                            | `sm:block`                           |
| Content padding    | `p-5`                               | `sm:p-6`                             |

### Overflow

- Use `overflow-x-auto no-scrollbar` for horizontal scroll areas (mobile nav)
- Use `overflow-y-auto` on the main content panel
- Mark all fixed-height sections as `shrink-0`

---

## Quick Reference: Class Combos

### Glassmorphic dialog
```
bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl rounded-2xl
```

### Active sidebar item background
```
bg-primary/5 rounded-xl border border-primary/10
```

### Primary CTA button
```
bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer
```

### Ghost cancel button
```
text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 rounded-xl h-9 cursor-pointer
```

### Status badge (connected)
```
bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full font-semibold text-[10px] px-2 py-0
```

### Section divider
```
border-zinc-800/40
```

### Card with hover border shift
```
border-border/60 hover:border-primary/30 transition-all duration-300 bg-card/30 backdrop-blur-xs rounded-xl
```
