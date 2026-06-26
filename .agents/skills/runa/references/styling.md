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

- Use **semantic color tokens only** (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary`, `border`, `bg-card`, etc.).
- **Never** use raw Tailwind color values (`bg-zinc-950`, `text-emerald-400`, `border-amber-500`) — these break the opposite theme.
- **Never** add manual `dark:` class overrides — semantic tokens resolve correctly for both themes automatically.

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
