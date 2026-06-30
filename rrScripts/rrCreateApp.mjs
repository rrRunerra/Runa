#!/usr/bin/env node

import prompts from "prompts";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPascalCase(str) {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function toKebabCase(str) {
  return str.toLowerCase().replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function sidebarConfigTemplate(pascalName, kebabName) {
  return `"use client";

import { Home } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";
import { ${pascalName}Flags } from "@runa/permissions";

export const get${pascalName}SidebarConfig = (): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: "Home",
        href: "/${kebabName}",
        preventRedirect: false,
        icon: <Home className="h-4 w-4" />,
        subtitle: "Home",
        position: 1,
      },
    ],
  },
  {
    section: "",
    items: [
      {
        label: "Home",
        href: "/${kebabName}",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Home",
      },
    ],
  },
];
`;
}

function navProviderTemplate(pascalName, kebabName) {
  return `"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { get${pascalName}SidebarConfig } from "../../../../config/${kebabName}SidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface Rr${pascalName}NavProviderProps {
  children: React.ReactNode;
}

export default function Rr${pascalName}NavProvider({
  children,
}: Rr${pascalName}NavProviderProps): React.JSX.Element {
  const { data: session } = useSession();

  const sidebarConfig = useMemo(() => {
    const rawConfig = get${pascalName}SidebarConfig();
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
`;
}

function layoutTemplate(pascalName, kebabName, description) {
  return `import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import Rr${pascalName}NavProvider from "@/components/rrComponents/rrProviders/rr${pascalName}NavProvider";

export const metadata: Metadata = {
  title: "${pascalName}",
  description: "${description}",
};

export default function ${pascalName}Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Rr${pascalName}NavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </Rr${pascalName}NavProvider>
    </div>
  );
}
`;
}

function pageTemplate(pascalName) {
  return `export default function ${pascalName}Page() {
  return (
    <div>
      <h1>${pascalName}</h1>
    </div>
  );
}
`;
}

function notFoundTemplate(pascalName, kebabName) {
  return `"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ${pascalName}NotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/${kebabName}/not-found");
  }, [router]);
  return null;
}
`;
}

function notFoundPageTemplate() {
  return `"use client";

import React from "react";
import RrLapplandNotFound from "@/components/rrComponents/rrImages/rrLapplandNotFound";

export default function Page(): React.JSX.Element {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-[650px] aspect-square">
        <RrLapplandNotFound className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
`;
}

function unauthorizedPageTemplate(pascalName) {
  return `import React from "react";

import ${pascalName}Unauthorized from "@/components/unauthorized/${pascalName}Unauthorized";

export default function Page(): React.JSX.Element {
  return <${pascalName}Unauthorized />;
}
`;
}

function unauthorizedComponentTemplate(pascalName) {
  return `"use client";

import React from "react";

import RrLapplandUnauthorized from "@/components/rrComponents/rrImages/rrLapplandUnauthorized";

interface ${pascalName}UnauthorizedProps {
  message?: string;
  returnUrl?: string;
}

export default function ${pascalName}Unauthorized({}: ${pascalName}UnauthorizedProps): React.JSX.Element {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-[650px] aspect-square">
        <RrLapplandUnauthorized className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
`;
}

function bitfieldTemplate(pascalName) {
  return `import { BitField } from "./bitfield";
import { ${pascalName}Flags } from "./flags";

export class ${pascalName}BitField extends BitField {
  public static override readonly Flags = ${pascalName}Flags;
}
`;
}

// ---------------------------------------------------------------------------
// File modification helpers
// ---------------------------------------------------------------------------

/** Finds the highest startOffset used in flags.ts */
function findMaxOffset(content) {
  const offsetRegex = /defineFlags\s*\([\s\S]*?\]\s*,\s*(\d+)\s*\)/g;
  let maxOffset = 0;
  let match;
  while ((match = offsetRegex.exec(content)) !== null) {
    const offset = parseInt(match[1], 10);
    if (offset > maxOffset) maxOffset = offset;
  }
  return maxOffset;
}

/** Adds the new flag entry to flags.ts before RunaFlags */
async function addFlagsToFlagsFile(flagsPath, pascalName, nextOffset) {
  const content = await readFile(flagsPath, "utf-8");
  const flagEntry = `\n\nexport const ${pascalName}Flags = defineFlags([
  "VIEW",
  "MANAGE",
], ${nextOffset});`;

  const runaIndex = content.lastIndexOf("export const RunaFlags");
  if (runaIndex === -1) {
    // Fallback: append
    await writeFile(flagsPath, content.trimEnd() + flagEntry + "\n");
    return;
  }

  const beforeRuna = content.slice(0, runaIndex).replace(/\s+$/, "");
  const afterRuna = content.slice(runaIndex);
  await writeFile(flagsPath, beforeRuna + flagEntry + "\n\n" + afterRuna);
}

/** Adds `export * from "./{kebabName}"` to index.ts alphabetically */
async function addToIndex(indexPath, kebabName) {
  const content = await readFile(indexPath, "utf-8");
  const lines = content.split("\n");

  // Don't add if already present
  if (lines.some((l) => l.includes(`"./${kebabName}"`))) return;

  const insertLine = `export * from "./${kebabName}";`;

  // Find insertion point: after "export * from "./flags"" and "export * from "./bitfield""
  // and before the first export that would come after it alphabetically
  let inserted = false;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/export \* from "\.\/(.*?)";/);
    if (match) {
      const existingName = match[1];
      // Skip "flags" and "bitfield" — they stay at the top
      if (existingName === "flags" || existingName === "bitfield") continue;
      if (existingName.localeCompare(kebabName) > 0) {
        lines.splice(i, 0, insertLine);
        inserted = true;
        break;
      }
    }
  }

  if (!inserted) lines.push(insertLine);
  await writeFile(indexPath, lines.join("\n"));
}

/** Adds the new app entry to rrApps.tsx with icon + flag import */
async function addToRrApps(
  rrAppsPath,
  pascalName,
  kebabName,
  description,
  shortDescription,
) {
  let content = await readFile(rrAppsPath, "utf-8");
  const lines = content.split("\n");

  // -----------------------------------------------------------------------
  // 1. Add Folder to the lucide-react import
  // -----------------------------------------------------------------------
  const lucideStart = lines.findIndex((l) => l.includes('from "lucide-react"'));
  if (lucideStart === -1) {
    console.error("Could not find lucide-react import in rrApps.tsx");
    return;
  }

  // Find the opening brace line (scan backwards)
  let braceLine = -1;
  for (let i = lucideStart; i >= 0; i--) {
    if (lines[i].includes("{")) {
      braceLine = i;
      break;
    }
  }

  if (
    braceLine === -1 ||
    !lines.slice(braceLine, lucideStart + 1).some((l) => l.includes("Folder"))
  ) {
    // Insert Folder import after the opening brace
    for (let i = braceLine + 1; i < lucideStart; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === "" || trimmed === "{" || trimmed === "}") continue;
      // Insert Folder before the first actual import item
      const firstItem = lines[i];
      lines.splice(i, 0, "  Folder,");
      break;
    }
  }

  // -----------------------------------------------------------------------
  // 2. Add {PascalName}Flags to the @runa/permissions import
  // -----------------------------------------------------------------------
  const permImportLine = lines.findIndex((l) =>
    l.includes('from "@runa/permissions"'),
  );
  if (permImportLine === -1) {
    // No permissions import yet — add one before the rrApps array
    const arrayIndex = lines.findIndex((l) =>
      l.includes("export const rrApps"),
    );
    if (arrayIndex !== -1) {
      lines.splice(
        arrayIndex,
        0,
        "",
        `import { ${pascalName}Flags } from "@runa/permissions";`,
        "",
      );
    }
  } else {
    // Find the opening brace for the permissions import
    let permBraceLine = -1;
    for (let i = permImportLine; i >= 0; i--) {
      if (lines[i].includes("{")) {
        permBraceLine = i;
        break;
      }
    }

    const flagName = `${pascalName}Flags`;
    if (permBraceLine !== -1) {
      // Check if it already exists
      const existing = lines.slice(permBraceLine, permImportLine + 1);
      if (!existing.some((l) => l.includes(flagName))) {
        // Insert alphabetically
        for (let i = permBraceLine + 1; i < permImportLine; i++) {
          const trimmed = lines[i].trim();
          if (trimmed === "" || trimmed === "{" || trimmed === "}") continue;
          const existingFlagName = trimmed.replace(/,/, "");
          if (existingFlagName.localeCompare(flagName) > 0) {
            lines.splice(i, 0, `  ${flagName},`);
            break;
          }
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 3. Insert the app entry alphabetically (Polaris always stays first)
  // -----------------------------------------------------------------------
  const appEntry = `  {
    name: "${pascalName}",
    href: "/${kebabName}",
    icon: <Folder className="size-4" />,
    description: "${description}",
    descriptionShort: "${shortDescription}",
    permissions: [${pascalName}Flags.VIEW],
  },`;

  // Find the closing brace line of the Polaris entry
  let polarisCloseBrace = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('name: "Polaris"')) {
      // Walk forward to find the matching "}," that closes the Polaris object
      let braceDepth = 0;
      for (let j = i; j < lines.length; j++) {
        const openBraces = (lines[j].match(/{/g) || []).length;
        const closeBraces = (lines[j].match(/}/g) || []).length;
        braceDepth += openBraces - closeBraces;
        if (braceDepth === 0) {
          polarisCloseBrace = j;
          break;
        }
      }
      break;
    }
  }

  // Now find where to insert after Polaris
  let insertIndex = -1;

  if (polarisCloseBrace !== -1) {
    // Look at the entries after Polaris, find the first one alphabetically after our name
    for (let i = polarisCloseBrace + 1; i < lines.length; i++) {
      const match = lines[i].match(/name:\s*"([^"]+)"/);
      if (match) {
        const existingName = match[1];
        if (existingName.localeCompare(pascalName) > 0) {
          // Insert before this entry — find its opening brace
          // Walk back from match to find "{"
          for (let j = i; j >= polarisCloseBrace + 1; j--) {
            if (lines[j].includes("{")) {
              insertIndex = j;
              break;
            }
          }
          break;
        }
      }
    }

    // If we didn't find an insertion point, append before the closing ];
    if (insertIndex === -1) {
      const closingBracket = lines.findLastIndex((l) => l.includes("];"));
      if (closingBracket !== -1) {
        insertIndex = closingBracket;
      } else {
        insertIndex = lines.length;
      }
    }
  } else {
    // No Polaris entry? Unlikely but fallback to end of array
    const closingBracket = lines.findLastIndex((l) => l.includes("];"));
    insertIndex = closingBracket !== -1 ? closingBracket : lines.length;
  }

  lines.splice(insertIndex, 0, appEntry);

  await writeFile(rrAppsPath, lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const cwd = process.cwd();
  const isInScriptDir = path.basename(cwd) === "rrScripts" || cwd === __dirname;
  const projectRoot = isInScriptDir ? ROOT : cwd;

  // Verify we're in the Runa project root
  if (!existsSync(path.join(projectRoot, "package.json"))) {
    console.error(
      "Error: Script must be run from the Runa project root or rrScripts/ directory.",
    );
    process.exit(1);
  }

  console.log("");
  console.log("  ╭─────────────────────────────────────╮");
  console.log("  │                                     │");
  console.log("  │         Runa App Creator            │");
  console.log("  │                                     │");
  console.log("  ╰─────────────────────────────────────╯");
  console.log("");

  const response = await prompts([
    {
      type: "text",
      name: "name",
      message: "What is the app name?",
      hint: "e.g. Orion, Serpens, Draco",
      validate: (val) =>
        val.trim().length > 0 ? true : "App name is required",
    },
    {
      type: "text",
      name: "description",
      message: "Description?",
      hint: "e.g. Media tracking, Chat features",
      validate: (val) =>
        val.trim().length > 0 ? true : "Description is required",
    },
    {
      type: "text",
      name: "shortDescription",
      message: "Short description (sidebar label)?",
      hint: "e.g. Media, Chat",
      validate: (val) =>
        val.trim().length > 0 ? true : "Short description is required",
    },
  ]);

  const appName = response.name.trim();
  const pascalName = toPascalCase(appName);
  const kebabName = toKebabCase(appName);
  const description = response.description.trim();
  const shortDescription = response.shortDescription.trim();

  console.log(`\n  Creating app: ${pascalName} (/${kebabName})\n`);

  // -----------------------------------------------------------------------
  // Paths
  // -----------------------------------------------------------------------
  const paths = {
    sidebarConfig: path.join(
      projectRoot,
      "apps/frontend/config",
      `${kebabName}SidebarConfig.tsx`,
    ),
    navProvider: path.join(
      projectRoot,
      "apps/frontend/src/components/rrComponents/rrProviders",
      `rr${pascalName}NavProvider.tsx`,
    ),
    layout: path.join(
      projectRoot,
      "apps/frontend/src/app/(apps)",
      kebabName,
      "layout.tsx",
    ),
    page: path.join(
      projectRoot,
      "apps/frontend/src/app/(apps)",
      kebabName,
      "page.tsx",
    ),
    notFoundDir: path.join(
      projectRoot,
      "apps/frontend/src/app/(apps)",
      kebabName,
      "not-found",
    ),
    notFoundPage: path.join(
      projectRoot,
      "apps/frontend/src/app/(apps)",
      kebabName,
      "not-found/page.tsx",
    ),
    notFound: path.join(
      projectRoot,
      "apps/frontend/src/app/(apps)",
      kebabName,
      "not-found.tsx",
    ),
    unauthorizedDir: path.join(
      projectRoot,
      "apps/frontend/src/app/(apps)",
      kebabName,
      "unauthorized",
    ),
    unauthorizedPage: path.join(
      projectRoot,
      "apps/frontend/src/app/(apps)",
      kebabName,
      "unauthorized/page.tsx",
    ),
    unauthorizedComponent: path.join(
      projectRoot,
      "apps/frontend/src/components/unauthorized",
      `${pascalName}Unauthorized.tsx`,
    ),
    bitfield: path.join(
      projectRoot,
      "packages/permissions/src",
      `${kebabName}.ts`,
    ),
    rrApps: path.join(projectRoot, "apps/frontend/config/rrApps.tsx"),
    flags: path.join(projectRoot, "packages/permissions/src/flags.ts"),
    index: path.join(projectRoot, "packages/permissions/src/index.ts"),
  };

  // -----------------------------------------------------------------------
  // Create directories
  // -----------------------------------------------------------------------
  const appDir = path.dirname(paths.layout);
  await mkdir(appDir, { recursive: true });
  await mkdir(paths.notFoundDir, { recursive: true });
  await mkdir(paths.unauthorizedDir, { recursive: true });

  // -----------------------------------------------------------------------
  // Calculate next permission offset
  // -----------------------------------------------------------------------
  const flagsContent = await readFile(paths.flags, "utf-8");
  const maxOffset = findMaxOffset(flagsContent);
  const nextOffset = Math.max(maxOffset, 0) + 100;

  // -----------------------------------------------------------------------
  // Write all new files
  // -----------------------------------------------------------------------

  await writeFile(
    paths.sidebarConfig,
    sidebarConfigTemplate(pascalName, kebabName),
  );
  console.log(`  Created: config/${kebabName}SidebarConfig.tsx`);

  await writeFile(
    paths.navProvider,
    navProviderTemplate(pascalName, kebabName),
  );
  console.log(`  Created: rrProviders/rr${pascalName}NavProvider.tsx`);

  await writeFile(
    paths.layout,
    layoutTemplate(pascalName, kebabName, description),
  );
  console.log(`  Created: app/(apps)/${kebabName}/layout.tsx`);

  await writeFile(paths.page, pageTemplate(pascalName));
  console.log(`  Created: app/(apps)/${kebabName}/page.tsx`);

  await writeFile(paths.notFoundPage, notFoundPageTemplate());
  console.log(`  Created: app/(apps)/${kebabName}/not-found/page.tsx`);

  await writeFile(paths.notFound, notFoundTemplate(pascalName, kebabName));
  console.log(`  Created: app/(apps)/${kebabName}/not-found.tsx`);

  await writeFile(paths.unauthorizedPage, unauthorizedPageTemplate(pascalName));
  console.log(`  Created: app/(apps)/${kebabName}/unauthorized/page.tsx`);

  await writeFile(
    paths.unauthorizedComponent,
    unauthorizedComponentTemplate(pascalName),
  );
  console.log(`  Created: unauthorized/${pascalName}Unauthorized.tsx`);

  await writeFile(paths.bitfield, bitfieldTemplate(pascalName));
  console.log(`  Created: packages/permissions/src/${kebabName}.ts`);

  // -----------------------------------------------------------------------
  // Modify existing files
  // -----------------------------------------------------------------------

  await addToRrApps(
    paths.rrApps,
    pascalName,
    kebabName,
    description,
    shortDescription,
  );
  console.log(`  Updated: config/rrApps.tsx`);

  await addFlagsToFlagsFile(paths.flags, pascalName, nextOffset);
  console.log(
    `  Updated: packages/permissions/src/flags.ts (offset ${nextOffset})`,
  );

  await addToIndex(paths.index, kebabName);
  console.log(`  Updated: packages/permissions/src/index.ts`);

  console.log("");
  console.log(`  ╔═══════════════════════════════════════╗`);
  console.log(`  ║  App "${pascalName}" created!         ║`);
  console.log(`  ╚═══════════════════════════════════════╝`);
  console.log("");
  console.log(`  Next steps:`);
  console.log(`  1. Choose a custom lucide icon in config/rrApps.tsx`);
  console.log(
    `  2. Customize the sidebar config in config/${kebabName}SidebarConfig.tsx`,
  );
  console.log(`  3. Build the app pages in app/(apps)/${kebabName}/`);
  console.log("");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
