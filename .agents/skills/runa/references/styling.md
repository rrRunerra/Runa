# Styling & Runa Aesthetics

All styling must follow the **shadcn skill** guidelines. Read and apply the full rules from:
`.agents/skills/shadcn/SKILL.md`

---

## Project Preset

This project uses the **radix-mira** preset with **lucide-react** icons.

- Import icons exclusively from `lucide-react`.
- Never assume a different icon library.

---

## Light & Dark Theme Support

All components **must** work correctly in both light and dark themes.

- **No Hardcoded Colors**: Never use raw hex/rgb color values or static Tailwind colors (e.g. `bg-zinc-950`, `text-emerald-400`, `border-amber-500`) in the UI markup.
- **Schematic Classes / globals.css**: All colors used in the UI must utilize Tailwind semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, etc.) or schematic classes listed/defined in `apps/frontend/src/app/globals.css`.
- **Listing Custom Colors**: If a custom color schema is required for a UI feature, define it as a schematic class inside `globals.css` using theme CSS variables (e.g. `@theme { --color-custom-name: ... }` or root variables) to support and match all themes seamlessly. Do not write inline color overrides.
- **No Manual `dark:` Overrides**: Avoid manually specifying `dark:` overrides; rely on schematic classes and semantic theme variables instead.

---

## Key Styling Rules

- **Use built-in component variants** (`variant="outline"`, `size="sm"`, etc.) before adding custom classes.
- **Use `Badge` component** (with appropriate variant) for status indicators — never custom styled `<span>` elements.
- **Use `cn()`** for conditional class composition — never manual template literal ternaries.
- **Spacing**: use `flex` + `gap-*`, never `space-x-*` / `space-y-*`.
- **Equal dimensions**: use `size-*` shorthand, not `w-* h-*`.

---

## Detailed Rule References (shadcn skill)

For correct/incorrect code pairs, refer to the shadcn skill's linked rule files:

- [`rules/styling.md`](../../shadcn/rules/styling.md) — colors, variants, `className`, spacing, `cn()`, z-index
- [`rules/composition.md`](../../shadcn/rules/composition.md) — Card, Dialog, Alert, Badge, Separator, Skeleton
- [`rules/forms.md`](../../shadcn/rules/forms.md) — FieldGroup, Field, InputGroup, validation states
- [`rules/icons.md`](../../shadcn/rules/icons.md) — `data-icon`, icon sizing

---

## Layout & Component Behavior

### Mobile First Approach
- Design layouts and components starting with a mobile-first design strategy.
- Define styles for mobile by default, and use Tailwind responsive prefixes (e.g., `md:`, `lg:`) to scale the interface upward for tablets and desktops.

### Space Maximization
- Design UIs to maximize the use of screen real estate effectively.
- Ensure components are spacious but not too cramped; maintain logical grids and tight padding hierarchies without introducing unnecessary whitespace gaps.

### Pessimistic Modals
- **No Optimistic Closing**: Always adopt a pessimistic approach when building modal-based workflows (e.g., data creation, edit dialogs, settings submissions).
- **Loading & Error Flow**: Keep the modal open and transition to a disabled/loading state (with spin indicators or placeholder highlights) during the request. Do not close the modal or assume success until the API returns a positive response. Show validation or backend errors inline if the operation fails.

### Content-Matching Skeletons
- Avoid generic page spinners for async load flows.
- Use Tailwind skeleton loaders (`Skeleton` component) designed to match the structural shape and layout of the actual content being loaded.

### Aesthetic Design Guidelines

- **No Gradients**: Never use color gradients (linear/radial/conic) in the UI layouts unless the user explicitly asks for them.
- **Minimize Card Usage**: Avoid relying exclusively on boxy card wraps (e.g. `<Card>`) for grouping content. Instead, create fresh, modern layout patterns such as borderless group headers, grid systems with dividers, canvas sheets, or minimal typography blocks.
- **Background Image Fillers**: To fill empty spaces, recommend or use Lappland (Arknights) illustration assets. Direct the user to or run the `/generate-lappland-images` skill to generate relevant anime character illustration backgrounds that fit the page theme.


