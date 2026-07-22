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
import { api } from '@/lib/api'

import { IMAGE_STUDIO_ENDPOINTS, IMAGE_STUDIO_GROUP_HEADER } from './constants'
import type {
  GroupOption,
  ImageResponse,
  ImageStudioSubmission,
  ModelOption,
} from './types'

export async function getImageStudioModels(
  group: string
): Promise<ModelOption[]> {
  const response = await api.get(IMAGE_STUDIO_ENDPOINTS.USER_MODELS, {
    params: { group },
  })
  const data = response.data

  if (!data.success || !Array.isArray(data.data)) return []

  return data.data.map((model: string) => ({ label: model, value: model }))
}

export async function getImageStudioGroups(): Promise<GroupOption[]> {
  const response = await api.get(IMAGE_STUDIO_ENDPOINTS.USER_GROUPS)
  const data = response.data

  if (!data.success || !data.data) return []

  const groups = data.data as Record<
    string,
    { desc: string; ratio: number | string }
  >

  return Object.entries(groups).map(([value, info]) => ({
    label: value,
    value,
    ratio: Number(info.ratio),
    desc: info.desc,
  }))
}

async function submitImageGeneration(
  submission: ImageStudioSubmission
): Promise<ImageResponse> {
  const values = submission.values
  const payload: Record<string, string | number> = {
    model: values.model,
    prompt: values.prompt,
    n: values.n,
    size: values.size,
    quality: values.quality,
  }

  const response = await api.post(IMAGE_STUDIO_ENDPOINTS.GENERATIONS, payload, {
    headers: { [IMAGE_STUDIO_GROUP_HEADER]: values.group },
    skipErrorHandler: true,
  })
  return response.data as ImageResponse
}

async function submitImageEdit(
  submission: ImageStudioSubmission
): Promise<ImageResponse> {
  const values = submission.values
  const formData = new FormData()

  formData.append('model', values.model)
  formData.append('prompt', values.prompt)
  formData.append('n', String(values.n))
  formData.append('size', values.size)
  formData.append('quality', values.quality)

  const imageField = submission.sourceFiles.length > 1 ? 'image[]' : 'image'
  submission.sourceFiles.forEach((file) => formData.append(imageField, file))
  if (submission.maskFile) formData.append('mask', submission.maskFile)

  const response = await api.post(IMAGE_STUDIO_ENDPOINTS.EDITS, formData, {
    headers: { [IMAGE_STUDIO_GROUP_HEADER]: values.group },
    skipErrorHandler: true,
  })
  return response.data as ImageResponse
}

export function submitImageStudioRequest(
  submission: ImageStudioSubmission
): Promise<ImageResponse> {
  if (submission.mode === 'edit') return submitImageEdit(submission)
  return submitImageGeneration(submission)
}
