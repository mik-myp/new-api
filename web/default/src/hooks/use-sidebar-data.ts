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
  Key,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Radio,
  Settings,
  Ticket,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type SidebarData } from '@/components/layout/types'

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
            iconColor: 'text-chart-4',
          },
          {
            title: t('Chat'),
            icon: MessageSquare,
            iconColor: 'text-info',
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
            iconColor: 'text-success',
          },
          {
            title: t('Dashboard'),
            url: '/dashboard/models',
            icon: LayoutDashboard,
            iconColor: 'text-info',
          },
          {
            title: t('API Keys'),
            url: '/keys',
            icon: Key,
            iconColor: 'text-warning',
          },
          {
            title: t('Usage Logs'),
            url: '/usage-logs/common',
            icon: FileText,
            iconColor: 'text-neutral',
          },
          {
            title: t('Task Logs'),
            url: '/usage-logs/task',
            activeUrls: ['/usage-logs/drawing'],
            configUrls: ['/usage-logs/drawing', '/usage-logs/task'],
            icon: ListTodo,
            iconColor: 'text-chart-5',
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
            iconColor: 'text-success',
          },
          {
            title: t('Profile'),
            url: '/profile',
            icon: User,
            iconColor: 'text-chart-3',
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
            iconColor: 'text-chart-2',
          },
          {
            title: t('Models'),
            url: '/models/metadata',
            icon: Box,
            iconColor: 'text-chart-1',
          },
          {
            title: t('Users'),
            url: '/users',
            icon: Users,
            iconColor: 'text-chart-4',
          },
          {
            title: t('Redemption Codes'),
            url: '/redemption-codes',
            icon: Ticket,
            iconColor: 'text-warning',
          },
          {
            title: t('Subscription Management'),
            url: '/subscriptions',
            icon: CreditCard,
            iconColor: 'text-success',
          },
          {
            title: t('System Settings'),
            url: '/system-settings/site',
            activeUrls: ['/system-settings'],
            icon: Settings,
            iconColor: 'text-neutral',
          },
        ],
      },
    ],
  }
}
