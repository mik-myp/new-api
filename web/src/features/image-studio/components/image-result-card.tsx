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
  Copy01Icon,
  Download04Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

import { downloadGeneratedImage } from '../lib/image-utils'
import type { ImageStudioResult } from '../types'

type ImageResultCardProps = {
  result: ImageStudioResult
  onPreview: (result: ImageStudioResult) => void
}

export function ImageResultCard(props: ImageResultCardProps) {
  const { t } = useTranslation()

  const copyRevisedPrompt = async () => {
    if (!props.result.revisedPrompt) return
    await navigator.clipboard.writeText(props.result.revisedPrompt)
    toast.success(t('Revised prompt copied'))
  }

  return (
    <Card className='gap-0 overflow-hidden py-0'>
      <CardContent className='p-0'>
        <button
          aria-label={t('Preview generated image')}
          className='bg-muted/25 relative block aspect-square w-full overflow-hidden text-left'
          onClick={() => props.onPreview(props.result)}
          type='button'
        >
          <div className='absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-35' />
          <img
            alt={props.result.revisedPrompt ?? props.result.prompt}
            className='relative size-full object-contain'
            loading='lazy'
            src={props.result.src}
          />
        </button>
        <div className='flex flex-col gap-2 p-3'>
          <div className='flex items-center justify-between gap-2'>
            <Badge variant='secondary'>
              {props.result.mode === 'generation'
                ? t('Generated')
                : t('Edited')}
            </Badge>
            <span className='text-muted-foreground truncate font-mono text-[10px]'>
              {props.result.model}
            </span>
          </div>
          <p className='line-clamp-2 text-sm leading-5'>
            {props.result.revisedPrompt ?? props.result.prompt}
          </p>
        </div>
      </CardContent>
      <CardFooter className='justify-end gap-1 border-t p-2'>
        {props.result.revisedPrompt ? (
          <Button
            aria-label={t('Copy revised prompt')}
            onClick={copyRevisedPrompt}
            size='icon-sm'
            variant='ghost'
          >
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
          </Button>
        ) : null}
        <Button
          aria-label={t('Preview generated image')}
          onClick={() => props.onPreview(props.result)}
          size='icon-sm'
          variant='ghost'
        >
          <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
        </Button>
        <Button
          aria-label={t('Download generated image')}
          onClick={() => downloadGeneratedImage(props.result)}
          size='icon-sm'
          variant='ghost'
        >
          <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
        </Button>
      </CardFooter>
    </Card>
  )
}
