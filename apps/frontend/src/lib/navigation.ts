import { hasPermission, BitFieldResolvable } from "@runa/permissions";
import type { SidebarConfig, SidebarSection, SidebarItem } from "@/types/SidebarConfig";

/**
 * Checks if the user has access to a resource based on its permissions.
 * If no permissions are required, it is public and accessible without a session.
 */
function hasAccess(
  userPermissions: number[] | undefined,
  required: BitFieldResolvable | undefined
): boolean {
  if (!required) return true;
  if (!userPermissions) return false;
  
  // Default to checking if user has ANY of the required permissions (logical OR)
  return hasPermission(userPermissions, required, "any");
}

/**
 * Filters a SidebarConfig recursively based on user permissions.
 * Sections and items automatically inherit visibility from their children.
 */
export function filterSidebarConfig(
  config: SidebarConfig,
  userPermissions: number[] | undefined
): SidebarConfig {
  return config
    .map((section): SidebarSection => {
      // 1. Check section permission
      const sectionPerm = section.permissions || (section as any).permission;
      if (!hasAccess(userPermissions, sectionPerm)) {
        return { ...section, items: [] };
      }

      // 2. Filter items in this section
      const filteredItems = section.items
        .map((item): SidebarItem => {
          const itemPerm = item.permissions || (item as any).permission;

          // If the item itself is not accessible, return item with empty children (will be filtered out)
          if (!hasAccess(userPermissions, itemPerm)) {
            return { ...item, children: [] } as any;
          }

          // Filter children if present
          if (item.children && item.children.length > 0) {
            const filteredChildren = item.children.filter((child) => {
              const childPerm = child.permissions || (child as any).permission;
              return hasAccess(userPermissions, childPerm);
            });
            return { ...item, children: filteredChildren };
          }

          return item;
        })
        .filter((item) => {
          const itemPerm = item.permissions || (item as any).permission;

          // Keep item if:
          // 1. User has access to the item itself
          const itemAccess = hasAccess(userPermissions, itemPerm);
          if (!itemAccess) return false;

          // 2. If it has children, at least one child must be accessible
          const originalItem = section.items.find((i) => i.label === item.label);
          if (originalItem && originalItem.children && originalItem.children.length > 0) {
            return !!(item.children && item.children.length > 0);
          }

          return true;
        });

      return { ...section, items: filteredItems };
    })
    .filter((section) => {
      // Keep sections that have items left, or are special mobile views (starting with #$)
      return section.items.length > 0 || section.section?.startsWith("#$");
    });
}
