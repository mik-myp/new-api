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
import { z } from 'zod'

export const imageStudioSchema = z.object({
  model: z.string().trim().min(1, 'Select an image model'),
  group: z.string().trim().min(1, 'Select a group'),
  prompt: z.string().trim().min(1, 'Describe the image you want'),
  n: z
    .number()
    .int('Image count must be a whole number')
    .min(1, 'Generate at least one image')
    .max(128, 'Image count cannot exceed 128'),
  size: z.string(),
  quality: z.string(),
})

export type ImageStudioFormValues = z.infer<typeof imageStudioSchema>

export const DEFAULT_IMAGE_STUDIO_VALUES: ImageStudioFormValues = {
  model: 'gpt-image-2',
  group: 'default',
  prompt: '',
  n: 1,
  size: '1024x1024',
  quality: 'auto',
}
