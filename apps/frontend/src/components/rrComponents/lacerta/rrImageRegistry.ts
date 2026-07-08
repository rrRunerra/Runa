import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Webpack require.context types
// ---------------------------------------------------------------------------
type SvgComponentProps = React.ComponentProps<"svg">;
type SvgModule = { default: ComponentType<SvgComponentProps> };

interface WebpackContext {
  keys(): string[];
  <T>(id: string): T;
}

interface ExtendedRequire extends NodeRequire {
  context(
    directory: string,
    useSubdirectories: boolean,
    regExp: RegExp
  ): WebpackContext;
}

// ---------------------------------------------------------------------------
// Auto-discovery (recursive — picks up subfolders automatically)
// Path is relative to THIS file's location (lacerta/ → ../rrImages/)
// ---------------------------------------------------------------------------
const ctx = (require as unknown as ExtendedRequire).context(
  "../rrImages",
  true, // recursive — include all subfolders
  /\.tsx$/
);

/**
 * Flat list of component keys, e.g. "rrLapplandWelcomeImage" or "subdir/rrFoo".
 * Automatically updated when files are added/removed — no manual edits needed.
 */
export const SVG_KEYS: string[] = ctx
  .keys()
  .map((k) => k.replace(/^\.\//, "").replace(/\.tsx$/, ""));

/**
 * Direct component reference map keyed by SVG_KEYS entries.
 * require.context is synchronous — modules are already in the bundle,
 * so React.lazy is not needed (and causes a runtime error with Turbopack).
 */
export const SVG_COMPONENTS: Record<string, ComponentType<SvgComponentProps>> = {};

ctx.keys().forEach((key: string) => {
  const name = key.replace(/^\.\//, "").replace(/\.tsx$/, "");
  const mod = ctx<SvgModule>(key);
  SVG_COMPONENTS[name] = mod.default;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable label from a registry key, e.g. "rrLapplandWelcomeImage" → "Lappland Welcome Image" */
export function svgKeyToLabel(key: string): string {
  const basename = key.includes("/") ? (key.split("/").pop() ?? key) : key;
  return basename
    .replace(/^rr/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}
