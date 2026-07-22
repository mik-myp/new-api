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
import { Image02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

import type { ImageStudioResult } from '../types'
import { ImageResultCard } from './image-result-card'

type ImageResultsProps = {
  results: ImageStudioResult[]
  isLoading: boolean
  loadingCount: number
  onClear: () => void
}

export function ImageResults(props: ImageResultsProps) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<ImageStudioResult | null>(null)
  const skeletonCount = Math.min(Math.max(props.loadingCount, 1), 6)
  let boardContent: ReactNode

  if (props.isLoading) {
    boardContent = (
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <div className='overflow-hidden rounded-xl border' key={index}>
            <Skeleton className='aspect-square w-full rounded-none' />
            <div className='bg-card flex flex-col gap-2 p-3'>
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-4 w-full' />
            </div>
          </div>
        ))}
      </div>
    )
  } else if (props.results.length > 0) {
    boardContent = (
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {props.results.map((result) => (
          <ImageResultCard
            key={result.id}
            onPreview={setPreview}
            result={result}
          />
        ))}
      </div>
    )
  } else {
    boardContent = (
      <div className='flex min-h-[26rem] items-center justify-center lg:h-full lg:min-h-full'>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <HugeiconsIcon icon={Image02Icon} strokeWidth={1.8} />
            </EmptyMedia>
            <EmptyTitle>{t('Your images will appear here')}</EmptyTitle>
            <EmptyDescription>
              {t(
                'Choose a mode, describe the result, and create your first image.'
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <section className='bg-card flex min-h-[32rem] flex-col overflow-hidden rounded-2xl border lg:h-full lg:min-h-0'>
      <div className='flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5'>
        <div>
          <h2 className='font-semibold tracking-tight'>{t('Studio board')}</h2>
          <p className='text-muted-foreground text-xs'>
            {t('Generated images stay in this session until you clear them.')}
          </p>
        </div>
        {props.results.length > 0 ? (
          <Button onClick={props.onClear} size='sm' variant='ghost'>
            {t('Clear board')}
          </Button>
        ) : null}
      </div>

      <div className='bg-muted/15 min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:32px_32px] p-4 sm:p-5'>
        {boardContent}
      </div>

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className='max-h-[92vh] max-w-5xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{t('Image preview')}</DialogTitle>
            <DialogDescription>
              {preview?.revisedPrompt ?? preview?.prompt ?? ''}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className='bg-muted/20 relative overflow-hidden rounded-xl border'>
              <div className='absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30' />
              <img
                alt={preview.revisedPrompt ?? preview.prompt}
                className='relative max-h-[72vh] w-full object-contain'
                src={preview.src}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
