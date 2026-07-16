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
import {
  Activity,
  Box,
  CreditCard,
  FileText,
  FlaskConical,
  Images,
  Key,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Radio,
  ServerCog,
  Settings,
  Ticket,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SidebarData } from '@/components/layout/types'
import { ROLE } from '@/lib/roles'

/**
 * Root navigation groups for the application sidebar.
 *
 * These are shown when the URL does not match any nested sidebar view
 * registered in `layout/lib/sidebar-view-registry.ts`.
 */
export function useSidebarData(): SidebarData {
  const { t } = useTranslation()

  return {
    navGroups: [
      {
        id: 'chat',
        title: t('Chat'),
        items: [
          {
            title: t('Playground'),
            url: '/playground',
            icon: FlaskConical,
            iconColor: 'text-violet-500 dark:text-violet-400',
          },
          {
            title: t('Image Studio'),
            url: '/image-studio',
            icon: Images,
            iconColor: 'text-amber-500 dark:text-amber-400',
          },
          {
            title: t('Chat'),
            icon: MessageSquare,
            iconColor: 'text-sky-500 dark:text-sky-400',
            type: 'chat-presets',
          },
        ],
      },
      {
        id: 'general',
        title: t('General'),
        items: [
          {
            title: t('Overview'),
            url: '/dashboard/overview',
            icon: Activity,
            iconColor: 'text-emerald-500 dark:text-emerald-400',
          },
          {
            title: t('Dashboard'),
            url: '/dashboard/models',
            icon: LayoutDashboard,
            iconColor: 'text-blue-500 dark:text-blue-400',
          },
          {
            title: t('API Keys'),
            url: '/keys',
            icon: Key,
            iconColor: 'text-amber-500 dark:text-amber-400',
          },
          {
            title: t('Usage Logs'),
            url: '/usage-logs/common',
            icon: FileText,
            iconColor: 'text-cyan-500 dark:text-cyan-400',
          },
          {
            title: t('Task Logs'),
            url: '/usage-logs/task',
            activeUrls: ['/usage-logs/drawing'],
            configUrls: ['/usage-logs/drawing', '/usage-logs/task'],
            icon: ListTodo,
            iconColor: 'text-fuchsia-500 dark:text-fuchsia-400',
          },
        ],
      },
      {
        id: 'personal',
        title: t('Personal'),
        items: [
          {
            title: t('Wallet'),
            url: '/wallet',
            icon: Wallet,
            iconColor: 'text-green-500 dark:text-green-400',
          },
          {
            title: t('Subscription Plans'),
            url: '/subscription-plans',
            icon: CreditCard,
            iconColor: 'text-rose-500 dark:text-rose-400',
          },
          {
            title: t('Profile'),
            url: '/profile',
            icon: User,
            iconColor: 'text-indigo-500 dark:text-indigo-400',
          },
        ],
      },
      {
        id: 'admin',
        title: t('Admin'),
        items: [
          {
            title: t('Channels'),
            url: '/channels',
            icon: Radio,
            iconColor: 'text-orange-500 dark:text-orange-400',
          },
          {
            title: t('Models'),
            url: '/models/metadata',
            icon: Box,
            iconColor: 'text-purple-500 dark:text-purple-400',
          },
          {
            title: t('Users'),
            url: '/users',
            icon: Users,
            iconColor: 'text-teal-500 dark:text-teal-400',
          },
          {
            title: t('Redemption Codes'),
            url: '/redemption-codes',
            icon: Ticket,
            iconColor: 'text-yellow-500 dark:text-yellow-400',
          },
          {
            title: t('Subscriptions'),
            url: '/subscriptions',
            icon: CreditCard,
            iconColor: 'text-pink-500 dark:text-pink-400',
          },
          {
            title: t('System Info'),
            url: '/system-info',
            icon: ServerCog,
            requiredRole: ROLE.SUPER_ADMIN,
          },
          {
            title: t('System Settings'),
            url: '/system-settings/site',
            activeUrls: ['/system-settings'],
            icon: Settings,
            iconColor: 'text-slate-500 dark:text-slate-300',
          },
        ],
      },
    ],
  }
}
