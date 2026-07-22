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
import type { SelectOption } from './types'

export const IMAGE_STUDIO_ENDPOINTS = {
  GENERATIONS: '/pg/images/generations',
  EDITS: '/pg/images/edits',
  USER_MODELS: '/api/user/models',
  USER_GROUPS: '/api/user/self/groups',
} as const

export const IMAGE_STUDIO_GROUP_HEADER = 'New-Api-Group'

export const SIZE_OPTIONS: SelectOption[] = [
  { value: '1024x1024', labelKey: 'Square · 1024 × 1024' },
  { value: '1536x1024', labelKey: 'Landscape · 1536 × 1024' },
  { value: '1024x1536', labelKey: 'Portrait · 1024 × 1536' },
  { value: '1792x1024', labelKey: 'Wide · 1792 × 1024' },
  { value: '1024x1792', labelKey: 'Tall · 1024 × 1792' },
  { value: '512x512', labelKey: 'Square · 512 × 512' },
  { value: '256x256', labelKey: 'Square · 256 × 256' },
]

export const QUALITY_OPTIONS: SelectOption[] = [
  { value: 'auto', labelKey: 'Auto' },
  { value: 'low', labelKey: 'Low' },
  { value: 'medium', labelKey: 'Medium' },
  { value: 'high', labelKey: 'High' },
  { value: 'standard', labelKey: 'Standard' },
  { value: 'hd', labelKey: 'HD' },
]
