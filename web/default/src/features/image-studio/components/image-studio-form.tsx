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
import { MagicWand01Icon, Edit02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ModelGroupSelector } from '@/components/model-group-selector'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

import { QUALITY_OPTIONS, SIZE_OPTIONS } from '../constants'
import type { ImageStudioFormValues } from '../lib/schema'
import type {
  GroupOption,
  ImageFilePreview,
  ImageStudioMode,
  ModelOption,
} from '../types'
import { ImageOptionSelect } from './image-option-select'
import { ImageUploadField } from './image-upload-field'

type ImageStudioFormProps = {
  form: UseFormReturn<ImageStudioFormValues>
  mode: ImageStudioMode
  groups: GroupOption[]
  models: ModelOption[]
  sourcePreviews: ImageFilePreview[]
  maskPreview: ImageFilePreview | null
  sourceError?: string
  isLoadingOptions: boolean
  isSubmitting: boolean
  onModeChange: (mode: ImageStudioMode) => void
  onSubmit: () => void
  onReset: () => void
  onSourceFilesSelected: (files: File[]) => void
  onSourceFileRemove: (index: number) => void
  onMaskSelected: (file: File | null) => void
  onInvalidFiles: () => void
}

export function ImageStudioForm(props: ImageStudioFormProps) {
  const { t } = useTranslation()
  const errors = props.form.formState.errors
  let submitLabel = t('Create images')
  if (props.isSubmitting) {
    submitLabel = t('Creating images...')
  } else if (props.mode === 'edit') {
    submitLabel = t('Apply edit')
  }

  const updateSelect = (field: keyof ImageStudioFormValues, value: string) => {
    props.form.setValue(field, value as never, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <Card className='overflow-hidden'>
      <CardHeader className='border-b'>
        <CardTitle>
          {props.mode === 'generation'
            ? t('Create an image')
            : t('Edit an image')}
        </CardTitle>
        <CardDescription>
          {props.mode === 'generation'
            ? t('Turn a detailed prompt into one or more images.')
            : t('Transform source images with an optional transparency mask.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id='image-studio-form' onSubmit={props.onSubmit}>
          <FieldGroup>
            <Tabs
              value={props.mode}
              onValueChange={(value) =>
                props.onModeChange(value as ImageStudioMode)
              }
            >
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='generation' disabled={props.isSubmitting}>
                  <HugeiconsIcon
                    icon={MagicWand01Icon}
                    data-icon='inline-start'
                  />
                  {t('Generate')}
                </TabsTrigger>
                <TabsTrigger value='edit' disabled={props.isSubmitting}>
                  <HugeiconsIcon icon={Edit02Icon} data-icon='inline-start' />
                  {t('Edit')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Field>
              <FieldTitle>{t('Model and group')}</FieldTitle>
              <ModelGroupSelector
                className='w-full max-w-none justify-between'
                disabled={props.isLoadingOptions || props.isSubmitting}
                groups={props.groups}
                models={props.models}
                onGroupChange={(value) => updateSelect('group', value)}
                onModelChange={(value) => updateSelect('model', value)}
                selectedGroup={props.form.watch('group')}
                selectedModel={props.form.watch('model')}
              />
              {errors.model?.message || errors.group?.message ? (
                <FieldError>
                  {t(errors.model?.message ?? errors.group?.message ?? '')}
                </FieldError>
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.prompt) || undefined}>
              <FieldLabel htmlFor='image-prompt'>{t('Prompt')}</FieldLabel>
              <Textarea
                aria-invalid={Boolean(errors.prompt) || undefined}
                className='min-h-32 resize-y'
                disabled={props.isSubmitting}
                id='image-prompt'
                placeholder={t(
                  'Describe the subject, composition, lighting, materials, and mood.'
                )}
                {...props.form.register('prompt')}
              />
              <FieldDescription>
                {t(
                  'Specific visual directions usually produce better results.'
                )}
              </FieldDescription>
              {errors.prompt?.message ? (
                <FieldError>{t(errors.prompt.message)}</FieldError>
              ) : null}
            </Field>

            {props.mode === 'edit' ? (
              <div className='grid gap-5'>
                <ImageUploadField
                  disabled={props.isSubmitting}
                  error={props.sourceError}
                  id='image-source-files'
                  invalid={Boolean(props.sourceError)}
                  kind='source'
                  multiple
                  onFilesSelected={props.onSourceFilesSelected}
                  onInvalidFiles={props.onInvalidFiles}
                  onRemove={props.onSourceFileRemove}
                  previews={props.sourcePreviews}
                />
                <ImageUploadField
                  disabled={props.isSubmitting}
                  id='image-mask-file'
                  kind='mask'
                  onFilesSelected={(files) =>
                    props.onMaskSelected(files[0] ?? null)
                  }
                  onInvalidFiles={props.onInvalidFiles}
                  onRemove={() => props.onMaskSelected(null)}
                  previews={props.maskPreview ? [props.maskPreview] : []}
                />
              </div>
            ) : null}

            <div className='grid gap-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(5.5rem,0.8fr)]'>
              <ImageOptionSelect
                disabled={props.isSubmitting}
                id='image-size'
                label={t('Size')}
                onValueChange={(value) => updateSelect('size', value)}
                options={SIZE_OPTIONS}
                value={props.form.watch('size')}
              />
              <ImageOptionSelect
                disabled={props.isSubmitting}
                id='image-quality'
                label={t('Quality')}
                onValueChange={(value) => updateSelect('quality', value)}
                options={QUALITY_OPTIONS}
                value={props.form.watch('quality')}
              />
              <Field data-invalid={Boolean(errors.n) || undefined}>
                <FieldLabel htmlFor='image-count'>
                  {t('Image count')}
                </FieldLabel>
                <Input
                  aria-invalid={Boolean(errors.n) || undefined}
                  disabled={props.isSubmitting}
                  id='image-count'
                  max={128}
                  min={1}
                  type='number'
                  {...props.form.register('n', { valueAsNumber: true })}
                />
                {errors.n?.message ? (
                  <FieldError>{t(errors.n.message)}</FieldError>
                ) : null}
              </Field>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className='justify-between border-t'>
        <Button
          disabled={props.isSubmitting}
          onClick={props.onReset}
          type='button'
          variant='ghost'
        >
          {t('Reset settings')}
        </Button>
        <Button
          disabled={props.isSubmitting || props.isLoadingOptions}
          form='image-studio-form'
          type='submit'
        >
          {props.isSubmitting ? (
            <Spinner data-icon='inline-start' />
          ) : (
            <HugeiconsIcon
              icon={props.mode === 'generation' ? MagicWand01Icon : Edit02Icon}
              data-icon='inline-start'
            />
          )}
          {submitLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
