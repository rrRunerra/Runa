import { ReactNode } from "react"
import { BitField } from "@runa/permissions"
import { LucideIcon } from "lucide-react"

type Permissions = bigint | bigint[]

interface SidebarSection {
    /**
     * if section starts with #$, then that section will be used for mini navigation
     * in mobile view
     */
    section: string

    /**
     * Stable, language-agnostic key used for programmatic lookups via
     * getSection(). Unlike `section`, this value never changes when the locale
     * switches, so components can safely call getSection("Structures") regardless
     * of the active language.
     */
    dataKey?: string

    items: SidebarItem[]

    permissions?: Permissions
}

type SidebarItem = {
    label: string
    subtitle: string

    /**
     * Stable, language-agnostic key used for programmatic lookups via
     * getItem(). Unlike `label`, this value never changes when the locale
     * switches.
     */
    dataKey?: string

    icon?: ReactNode
    badge?: string

    /**
     * By default it will be set at the position as in array index
     */
    position?: number

    permissions?: Permissions

    children?: SidebarItemChild[]
} & (
    | { href: string; preventRedirect: boolean; component?: never }
    | { href?: never; preventRedirect?: never; component: ReactNode }
)

type SidebarItemChild = {
    label: string
    subtitle: string

    /**
     * Stable, language-agnostic key used for programmatic lookups via
     * getChild(). Unlike `label`, this value never changes when the locale
     * switches.
     */
    dataKey?: string

    icon?: ReactNode
    badge?: string

    position?: number

    permissions?: Permissions
} & (
    | { href: string; preventRedirect: boolean; component?: never }
    | { href?: never; preventRedirect?: never; component: ReactNode }
)

type SidebarConfig = SidebarSection[]

export {
    Permissions,
    SidebarSection,
    SidebarItem,
    SidebarItemChild,
    SidebarConfig
}