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
import { Cancel01Icon, ImageUploadIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { cn } from '@/lib/utils'

import type { ImageFilePreview } from '../types'

type ImageUploadFieldProps = {
  id: string
  kind: 'source' | 'mask'
  previews: ImageFilePreview[]
  multiple?: boolean
  invalid?: boolean
  error?: string
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
  onRemove: (index: number) => void
  onInvalidFiles: () => void
}

export function ImageUploadField(props: ImageUploadFieldProps) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const isMask = props.kind === 'mask'

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter((file) => file.type.startsWith('image/'))
    if (validFiles.length !== files.length) props.onInvalidFiles()
    if (validFiles.length > 0) {
      props.onFilesSelected(props.multiple ? validFiles : [validFiles[0]])
    }
  }

  return (
    <Field data-invalid={props.invalid || undefined}>
      <FieldLabel htmlFor={props.id}>
        {isMask ? t('Optional mask') : t('Source images')}
      </FieldLabel>
      <label
        className={cn(
          'border-input bg-background hover:bg-accent/40 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : '',
          props.disabled ? 'pointer-events-none opacity-50' : ''
        )}
        htmlFor={props.id}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          handleFiles([...event.dataTransfer.files])
        }}
      >
        <HugeiconsIcon
          icon={ImageUploadIcon}
          strokeWidth={1.8}
          className='text-muted-foreground size-7'
        />
        <span className='text-sm font-medium'>
          {isMask ? t('Choose a mask image') : t('Choose or drop images')}
        </span>
        <span className='text-muted-foreground text-xs'>
          {isMask
            ? t('Transparent mask areas will be replaced.')
            : t('PNG, JPEG, or WebP. Multiple source images are supported.')}
        </span>
      </label>
      <input
        accept='image/*'
        className='sr-only'
        disabled={props.disabled}
        id={props.id}
        multiple={props.multiple}
        onChange={(event) => {
          handleFiles([...(event.target.files ?? [])])
          event.target.value = ''
        }}
        type='file'
      />
      {props.previews.length > 0 ? (
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
          {props.previews.map((preview, index) => (
            <div
              className='bg-muted/30 group relative overflow-hidden rounded-lg border'
              key={`${preview.file.name}-${preview.file.lastModified}`}
            >
              <AspectRatio ratio={1}>
                <img
                  alt={preview.file.name}
                  className='size-full object-cover'
                  src={preview.url}
                />
              </AspectRatio>
              <Button
                aria-label={t('Remove {{name}}', {
                  name: preview.file.name,
                })}
                className='absolute top-1.5 right-1.5 opacity-90'
                onClick={() => props.onRemove(index)}
                size='icon-xs'
                type='button'
                variant='secondary'
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
              <div className='bg-background/85 absolute inset-x-0 bottom-0 truncate px-2 py-1 text-[10px] backdrop-blur-sm'>
                {preview.file.name}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <FieldDescription>
        {isMask
          ? t('The mask should match the source image dimensions.')
          : t('The first image is the primary edit reference.')}
      </FieldDescription>
      {props.error ? <FieldError>{props.error}</FieldError> : null}
    </Field>
  )
}
