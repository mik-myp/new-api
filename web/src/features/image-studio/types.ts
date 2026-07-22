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
import type { ImageStudioFormValues } from './lib/schema'

export type ImageStudioMode = 'generation' | 'edit'

export type ModelOption = {
  label: string
  value: string
}

export type GroupOption = {
  label: string
  value: string
  ratio?: number
  desc?: string
}

export type ImageResponseData = {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

export type ImageResponse = {
  created?: number
  data?: ImageResponseData[]
}

export type ImageFilePreview = {
  file: File
  url: string
}

export type ImageStudioSubmission = {
  mode: ImageStudioMode
  values: ImageStudioFormValues
  sourceFiles: File[]
  maskFile: File | null
}

export type ImageStudioResult = {
  id: string
  src: string
  prompt: string
  revisedPrompt?: string
  model: string
  mode: ImageStudioMode
  createdAt: number
  extension: string
}

export type SelectOption = {
  labelKey: string
  value: string
}
