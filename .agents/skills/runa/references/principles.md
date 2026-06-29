# Component Design Principles

---

## DRY (Don't Repeat Yourself)

- **Extract repeated markup into sub-components.** If a JSX block appears more than once (or is clearly going to), extract it into a named component before finishing the task.
- **Extract repeated logic into hooks or utilities.** Shared state logic, data-transform helpers, and formatting functions must live in dedicated files, not be inlined per-component.
- **Split large pages/tabs into smaller components.** Any page or tab that grows beyond ~150–200 lines of JSX should be decomposed into focused child components (e.g. `SettingsHeader`, `ConnectionCard`, `EmptyState`).

---

## Reusability & Extensibility

- **Design components to accept props for customisation** rather than hard-coding values. Use sensible defaults but expose overrides via props.
- **Prefer composition over configuration.** Accept `children` or slot props instead of a single monolithic `config` object where possible.
- **Place reusable primitives in `rrComponents/`.** If a component could be used across more than one feature, it belongs in the shared `rrComponents` directory, not nested inside a feature folder.
- **Use TypeScript interfaces for component props** — always export the props interface so consumers can extend it.

---

## Related Customizations & Skill Creation

When working on Runa features, if you identify recurring workflows, coding instructions, or API patterns that are not yet formalized, consult the `skill-creator` skill to capture the workflow.

- **Creating Skills**: If a user asks to formalize a workflow, or if you identify a pattern that would benefit from structured instructions (such as a new framework utility, SDK usage patterns, or test guidelines), invoke the `skill-creator` skill to scaffold and draft a new agent skill.
- **Notification**: When creating new skills or updating existing ones, notify the user immediately and direct them to the newly written skill file so they can review and utilize it.
