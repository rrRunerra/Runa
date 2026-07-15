"use client";
import { createContext, ReactNode, useCallback, useState } from "react";
import { 
  SidebarConfig, 
  SidebarSection, 
  SidebarItem, 
  SidebarItemChild 
} from "@/types/SidebarConfig";

interface SidebarContextType {
  sidebarConfig: SidebarConfig;
  setSidebarConfig: (
    config: SidebarConfig | ((prev: SidebarConfig) => SidebarConfig),
  ) => void;
  getSection: (sectionName: string) => SidebarSection | undefined;
  getItem: (
    sectionName: string,
    itemLabel: string,
  ) => SidebarItem | undefined;
  getChild: (
    sectionName: string,
    parentLabel: string,
    childLabel: string,
  ) => SidebarItemChild | undefined;
  insertSection: (section: SidebarSection, position?: number) => void;
  insertItem: (sectionName: string, item: SidebarItem, position?: number) => void;
  insertChild: (
    sectionName: string,
    parentLabel: string,
    child: SidebarItemChild,
    position?: number,
  ) => void;
  removeSection: (sectionName: string) => void;
  removeItem: (sectionName: string, itemLabel: string) => void;
  removeChild: (
    sectionName: string,
    parentLabel: string,
    childLabel: string,
  ) => void;
  updateBadge: (sectionName: string, itemLabel: string, badge: string) => void;
  updateChildBadge: (
    sectionName: string,
    parentLabel: string,
    childLabel: string,
    badge: string,
  ) => void;
}

export const SidebarNavigationContext = createContext<
  SidebarContextType | undefined
>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig>([]);

  const getSection = useCallback(
    (sectionName: string) => {
      return sidebarConfig.find(
        (s) => s.dataKey === sectionName || s.section === sectionName,
      );
    },
    [sidebarConfig],
  );

  const getItem = useCallback(
    (sectionName: string, itemLabel: string) => {
      return getSection(sectionName)?.items.find(
        (i) => i.dataKey === itemLabel || i.label === itemLabel,
      );
    },
    [getSection],
  );

  const getChild = useCallback(
    (sectionName: string, parentLabel: string, childLabel: string) => {
      return getItem(sectionName, parentLabel)?.children?.find(
        (c) => c.dataKey === childLabel || c.label === childLabel,
      );
    },
    [getItem],
  );

  const insertSection = useCallback(
    (section: SidebarSection, position: number = 0) => {
      setSidebarConfig((prev) => {
        const newConfig = [...prev];
        newConfig.splice(position, 0, section);
        return newConfig;
      });
    },
    [],
  );

  const insertItem = useCallback((sectionName: string, item: SidebarItem, position?: number) => {
    setSidebarConfig((prev) =>
      prev.map((s) => {
        if (s.section !== sectionName) return s;
        const newItems = [...s.items];
        const insertIdx = position !== undefined ? position : newItems.length;
        newItems.splice(insertIdx, 0, item);
        return { ...s, items: newItems };
      }),
    );
  }, []);

  const insertChild = useCallback(
    (sectionName: string, parentLabel: string, child: SidebarItemChild, position?: number) => {
      setSidebarConfig((prev) =>
        prev.map((s) => {
          if (s.section !== sectionName) return s;
          return {
            ...s,
            items: s.items.map((i) => {
              if (i.label !== parentLabel) return i;
              const newChildren = [...(i.children || [])];
              const insertIdx = position !== undefined ? position : newChildren.length;
              newChildren.splice(insertIdx, 0, child);
              return { ...i, children: newChildren };
            }),
          };
        }),
      );
    },
    [],
  );


  const removeSection = useCallback((sectionName: string) => {
    setSidebarConfig((prev) => prev.filter((s) => s.section !== sectionName));
  }, []);

  const removeItem = useCallback((sectionName: string, itemLabel: string) => {
    setSidebarConfig((prev) =>
      prev.map((s) => {
        if (s.section !== sectionName) return s;
        return {
          ...s,
          items: s.items.filter((i) => i.label !== itemLabel),
        };
      }),
    );
  }, []);

  const removeChild = useCallback(
    (sectionName: string, parentLabel: string, childLabel: string) => {
      setSidebarConfig((prev) =>
        prev.map((s) => {
          if (s.section !== sectionName) return s;
          return {
            ...s,
            items: s.items.map((i) => {
              if (i.label !== parentLabel) return i;
              return {
                ...i,
                children: i.children?.filter((c) => c.label !== childLabel),
              };
            }),
          };
        }),
      );
    },
    [],
  );

  const updateBadge = useCallback(
    (sectionName: string, itemLabel: string, badge: string) => {
      setSidebarConfig((prev) =>
        prev.map((s) => {
          if (s.section !== sectionName) return s;
          return {
            ...s,
            items: s.items.map((i) =>
              i.label === itemLabel ? { ...i, badge } : i,
            ),
          };
        }),
      );
    },
    [],
  );

  const updateChildBadge = useCallback(
    (
      sectionName: string,
      parentLabel: string,
      childLabel: string,
      badge: string,
    ) => {
      setSidebarConfig((prev) =>
        prev.map((s) => {
          if (s.section !== sectionName) return s;
          return {
            ...s,
            items: s.items.map((i) => {
              if (i.label !== parentLabel) return i;
              return {
                ...i,
                children: i.children?.map((c) =>
                  c.label === childLabel ? { ...c, badge } : c,
                ),
              };
            }),
          };
        }),
      );
    },
    [],
  );

  return (
    <SidebarNavigationContext.Provider
      value={{
        sidebarConfig,
        setSidebarConfig,
        getSection,
        getItem,
        getChild,
        insertSection,
        insertItem,
        insertChild,
        removeSection,
        removeItem,
        removeChild,
        updateBadge,
        updateChildBadge,
      }}
    >
      {children}
    </SidebarNavigationContext.Provider>
  );
}
