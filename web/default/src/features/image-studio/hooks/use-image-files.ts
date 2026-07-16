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
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ImageFilePreview } from '../types'

export function useImageFiles() {
  const [sourcePreviews, setSourcePreviews] = useState<ImageFilePreview[]>([])
  const [maskPreview, setMaskPreview] = useState<ImageFilePreview | null>(null)
  const sourceRef = useRef<ImageFilePreview[]>([])
  const maskRef = useRef<ImageFilePreview | null>(null)

  useEffect(() => {
    sourceRef.current = sourcePreviews
  }, [sourcePreviews])

  useEffect(() => {
    maskRef.current = maskPreview
  }, [maskPreview])

  useEffect(
    () => () => {
      sourceRef.current.forEach((preview) => URL.revokeObjectURL(preview.url))
      if (maskRef.current) URL.revokeObjectURL(maskRef.current.url)
    },
    []
  )

  const addSourceFiles = useCallback((files: File[]) => {
    setSourcePreviews((current) => {
      const known = new Set(
        current.map(
          (preview) =>
            `${preview.file.name}:${preview.file.size}:${preview.file.lastModified}`
        )
      )
      const additions = files.flatMap((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`
        if (known.has(key)) return []
        known.add(key)
        return [{ file, url: URL.createObjectURL(file) }]
      })
      return [...current, ...additions]
    })
  }, [])

  const removeSourceFile = useCallback((index: number) => {
    setSourcePreviews((current) => {
      const removed = current[index]
      if (removed) URL.revokeObjectURL(removed.url)
      return current.filter((_, currentIndex) => currentIndex !== index)
    })
  }, [])

  const updateMaskFile = useCallback((file: File | null) => {
    setMaskPreview((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return file ? { file, url: URL.createObjectURL(file) } : null
    })
  }, [])

  const clearFiles = useCallback(() => {
    setSourcePreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.url))
      return []
    })
    setMaskPreview((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
  }, [])

  return {
    sourcePreviews,
    maskPreview,
    sourceFiles: sourcePreviews.map((preview) => preview.file),
    maskFile: maskPreview?.file ?? null,
    addSourceFiles,
    removeSourceFile,
    updateMaskFile,
    clearFiles,
  }
}
