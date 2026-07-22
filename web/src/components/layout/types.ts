/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { LinkProps } from '@tanstack/react-router'
import type { TFunction } from 'i18next'

export type NavIconColor =
  | 'text-info'
  | 'text-success'
  | 'text-warning'
  | 'text-destructive'
  | 'text-neutral'
  | 'text-chart-1'
  | 'text-chart-2'
  | 'text-chart-3'
  | 'text-chart-4'
  | 'text-chart-5'
  | 'text-amber-500 dark:text-amber-400'
  | 'text-blue-500 dark:text-blue-400'
  | 'text-cyan-500 dark:text-cyan-400'
  | 'text-emerald-500 dark:text-emerald-400'
  | 'text-fuchsia-500 dark:text-fuchsia-400'
  | 'text-green-500 dark:text-green-400'
  | 'text-indigo-500 dark:text-indigo-400'
  | 'text-orange-500 dark:text-orange-400'
  | 'text-pink-500 dark:text-pink-400'
  | 'text-purple-500 dark:text-purple-400'
  | 'text-red-500 dark:text-red-400'
  | 'text-rose-500 dark:text-rose-400'
  | 'text-sky-500 dark:text-sky-400'
  | 'text-slate-500 dark:text-slate-300'
  | 'text-teal-500 dark:text-teal-400'
  | 'text-violet-500 dark:text-violet-400'
  | 'text-yellow-500 dark:text-yellow-400'

/**
 * Base navigation item type
 */
type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
  iconColor?: NavIconColor
  activeUrls?: (LinkProps['to'] | (string & {}))[]
  configUrls?: (LinkProps['to'] | (string & {}))[]
  /**
   * Minimum role required to see this item in the sidebar. When set, the item
   * is hidden for users whose role is below this threshold (see
   * `useSidebarView`). Route-level guards still enforce access independently.
   */
  requiredRole?: number
}

/**
 * Navigation link type - single link item
 */
export type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
  type?: never
}

/**
 * Navigation collapsible type - collapsible navigation with sub-items
 */
export type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
  type?: never
}

/**
 * Dynamic chat presets type - dynamically loaded chat preset list from API
 */
export type NavChatPresets = BaseNavItem & {
  type: 'chat-presets'
  url?: never
  items?: never
}

/**
 * Navigation item union type
 */
export type NavItem = NavCollapsible | NavLink | NavChatPresets

/**
 * Navigation group type - a group of navigation items in sidebar
 */
export type NavGroup = {
  id?: string
  title: string
  items: NavItem[]
}

/**
 * Root sidebar data type
 *
 * Used by the default (top-level) sidebar view that lists primary
 * application navigation (chat, dashboard, admin, etc).
 */
export type SidebarData = {
  navGroups: NavGroup[]
}

/**
 * Top navigation link type
 */
export type TopNavLink = {
  title: string
  href: string
  isActive?: boolean
  disabled?: boolean
  requiresAuth?: boolean
  external?: boolean
}

/**
 * Back-navigation descriptor for a nested sidebar view
 */
export type SidebarViewParent = {
  /** Destination URL for the back button */
  to: LinkProps['to'] | (string & {})
  /** Visible label, e.g. "Back to Dashboard" — already localized */
  label: string
}

/**
 * Nested sidebar view configuration
 *
 * A nested view replaces the root navigation when the user enters a
 * dedicated workspace (e.g. System Settings). It models the modern
 * Vercel / Cloudflare "drill-in" sidebar UX: clicking a top-level entry
 * swaps the sidebar to a contextual view with a "Back" affordance.
 */
export type SidebarView = {
  /** Stable identifier (also drives transition animation keys) */
  id: string
  /** Path matcher that activates this view */
  pathPattern: RegExp
  /** Back-navigation descriptor; required for nested views */
  parent: SidebarViewParent
  /** Nav group builder, called per render with the active translator */
  getNavGroups: (t: TFunction) => NavGroup[]
}

/**
 * Resolved sidebar view returned by `useSidebarView()`
 *
 * - `view === null`: root navigation (default sidebar)
 * - `view !== null`: nested workspace view (renders header + back button)
 */
export type ResolvedSidebarView = {
  /** Animation/identity key — falls back to a sentinel for the root view */
  key: string
  view: SidebarView | null
  navGroups: NavGroup[]
}
