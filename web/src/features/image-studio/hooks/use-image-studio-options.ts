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
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { getImageStudioGroups, getImageStudioModels } from '../api'
import type { ImageStudioFormValues } from '../lib/schema'
import type { GroupOption, ModelOption } from '../types'

const EMPTY_GROUPS: GroupOption[] = []
const EMPTY_MODELS: ModelOption[] = []

function chooseImageModel(models: string[]): string {
  const preferredModels = ['gpt-image-2', 'gpt-image-1', 'dall-e-3']
  const preferred = preferredModels.find((model) => models.includes(model))
  if (preferred) return preferred

  return (
    models.find((model) => /image|dall-e|imagen|flux/i.test(model)) ??
    models[0] ??
    ''
  )
}

export function useImageStudioOptions(
  form: UseFormReturn<ImageStudioFormValues>
) {
  const currentGroup = form.watch('group')
  const currentModel = form.watch('model')

  const groupsQuery = useQuery({
    queryKey: ['image-studio-groups'],
    queryFn: getImageStudioGroups,
  })
  const modelsQuery = useQuery({
    queryKey: ['image-studio-models', currentGroup],
    queryFn: () => getImageStudioModels(currentGroup),
    enabled: currentGroup !== '',
  })

  const groups = groupsQuery.data ?? EMPTY_GROUPS
  const models = modelsQuery.data ?? EMPTY_MODELS

  useEffect(() => {
    if (groups.length === 0) return
    if (groups.some((group) => group.value === currentGroup)) return

    const fallback =
      groups.find((group) => group.value === 'default')?.value ??
      groups[0].value
    form.setValue('group', fallback, { shouldValidate: true })
  }, [currentGroup, form, groups])

  useEffect(() => {
    if (models.length === 0) return
    if (models.some((model) => model.value === currentModel)) return

    form.setValue(
      'model',
      chooseImageModel(models.map((model) => model.value)),
      { shouldValidate: true }
    )
  }, [currentModel, form, models])

  return {
    groups,
    models,
    isLoading: groupsQuery.isLoading || modelsQuery.isLoading,
  }
}
