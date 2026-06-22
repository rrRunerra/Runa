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
    
    items: SidebarItem[]

    permissions?: Permissions
}

type SidebarItem = {
    label: string
    subtitle: string

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