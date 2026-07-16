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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { submitImageStudioRequest } from './api'
import { ImageResults } from './components/image-results'
import { ImageStudioForm } from './components/image-studio-form'
import { useImageFiles } from './hooks/use-image-files'
import { useImageStudioOptions } from './hooks/use-image-studio-options'
import {
  createImageStudioResults,
  getImageRequestErrorMessage,
} from './lib/image-utils'
import {
  DEFAULT_IMAGE_STUDIO_VALUES,
  imageStudioSchema,
  type ImageStudioFormValues,
} from './lib/schema'
import type {
  ImageResponse,
  ImageStudioMode,
  ImageStudioResult,
  ImageStudioSubmission,
} from './types'

export function ImageStudio() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ImageStudioMode>('generation')
  const [results, setResults] = useState<ImageStudioResult[]>([])
  const [sourceError, setSourceError] = useState<string>()
  const files = useImageFiles()
  const form = useForm<ImageStudioFormValues>({
    resolver: zodResolver(imageStudioSchema),
    defaultValues: DEFAULT_IMAGE_STUDIO_VALUES,
  })
  const options = useImageStudioOptions(form)

  const mutation = useMutation<ImageResponse, unknown, ImageStudioSubmission>({
    mutationFn: submitImageStudioRequest,
    onSuccess: (response, submission) => {
      const newResults = createImageStudioResults(response, submission)
      if (newResults.length === 0) {
        toast.error(t('Image API returned no images'))
        return
      }

      setResults((current) => [...newResults, ...current])
      toast.success(t('{{count}} images ready', { count: newResults.length }))
    },
    onError: (error) => {
      toast.error(getImageRequestErrorMessage(error, t('Image request failed')))
    },
  })

  const submitForm = form.handleSubmit((values) => {
    if (mode === 'edit' && files.sourceFiles.length === 0) {
      setSourceError(t('Add at least one source image'))
      return
    }

    setSourceError(undefined)
    mutation.mutate({
      mode,
      values,
      sourceFiles: files.sourceFiles,
      maskFile: files.maskFile,
    })
  })

  const resetSettings = () => {
    const currentModel = form.getValues('model')
    const currentGroup = form.getValues('group')
    form.reset({
      ...DEFAULT_IMAGE_STUDIO_VALUES,
      model: currentModel,
      group: currentGroup,
    })
    files.clearFiles()
    setSourceError(undefined)
  }

  return (
    <div className='flex min-h-0 flex-1 overflow-y-auto lg:overflow-hidden'>
      <div className='mx-auto flex min-h-full w-full max-w-[96rem] flex-col px-4 py-5 sm:px-6 sm:py-7 lg:min-h-0 lg:flex-1'>
        <div className='grid min-h-0 flex-1 items-start gap-6 lg:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)] lg:items-stretch'>
          <div className='lg:min-h-0 lg:overflow-y-auto lg:p-px lg:pr-2'>
            <ImageStudioForm
              form={form}
              groups={options.groups}
              isLoadingOptions={options.isLoading}
              isSubmitting={mutation.isPending}
              maskPreview={files.maskPreview}
              mode={mode}
              models={options.models}
              onInvalidFiles={() =>
                toast.error(t('Only image files can be uploaded'))
              }
              onMaskSelected={files.updateMaskFile}
              onModeChange={(nextMode) => {
                setMode(nextMode)
                setSourceError(undefined)
              }}
              onReset={resetSettings}
              onSourceFileRemove={files.removeSourceFile}
              onSourceFilesSelected={(selectedFiles) => {
                files.addSourceFiles(selectedFiles)
                setSourceError(undefined)
              }}
              onSubmit={submitForm}
              sourceError={sourceError}
              sourcePreviews={files.sourcePreviews}
            />
          </div>
          <ImageResults
            isLoading={mutation.isPending}
            loadingCount={form.watch('n')}
            onClear={() => setResults([])}
            results={results}
          />
        </div>
      </div>
    </div>
  )
}
