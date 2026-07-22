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
import type {
  ImageResponse,
  ImageStudioResult,
  ImageStudioSubmission,
} from '../types'

function getOutputExtension(url?: string): string {
  if (url) {
    const pathname = url.split('?')[0].toLowerCase()
    const extension = pathname.match(/\.(png|jpe?g|webp)$/)?.[1]
    if (extension) {
      return extension === 'jpeg' ? 'jpg' : extension
    }
  }

  return 'png'
}

function getMimeType(extension: string): string {
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'webp') return 'image/webp'
  return 'image/png'
}

export function createImageStudioResults(
  response: ImageResponse,
  submission: ImageStudioSubmission
): ImageStudioResult[] {
  const createdAt = response.created ? response.created * 1000 : Date.now()

  return (response.data ?? []).flatMap((item, index) => {
    const extension = getOutputExtension(item.url)
    const src =
      item.url ??
      (item.b64_json
        ? `data:${getMimeType(extension)};base64,${item.b64_json}`
        : '')

    if (!src) return []

    return [
      {
        id: `${createdAt}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        src,
        prompt: submission.values.prompt,
        revisedPrompt: item.revised_prompt,
        model: submission.values.model,
        mode: submission.mode,
        createdAt,
        extension,
      },
    ]
  })
}

export function getImageRequestErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (!error || typeof error !== 'object') return fallback

  const requestError = error as {
    message?: string
    response?: {
      data?: {
        message?: string
        error?: { message?: string }
      }
    }
  }

  return (
    requestError.response?.data?.error?.message ??
    requestError.response?.data?.message ??
    requestError.message ??
    fallback
  )
}

export async function downloadGeneratedImage(
  result: ImageStudioResult
): Promise<void> {
  const filename = `image-studio-${result.id}.${result.extension}`
  const anchor = document.createElement('a')

  if (result.src.startsWith('data:')) {
    anchor.href = result.src
    anchor.download = filename
    anchor.click()
    return
  }

  try {
    const response = await fetch(result.src)
    if (!response.ok) throw new Error('Image download failed')

    const blobUrl = URL.createObjectURL(await response.blob())
    anchor.href = blobUrl
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(result.src, '_blank', 'noopener,noreferrer')
  }
}
