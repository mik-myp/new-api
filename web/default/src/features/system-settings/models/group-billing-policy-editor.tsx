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
import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  parseGroupBillingPolicyRows,
  serializeGroupBillingPolicyRows,
  type GroupBillingPolicyRow,
} from './group-billing-policy'

type GroupBillingPolicyEditorProps = {
  value: string
  onChange: (value: string) => void
}

let idCounter = 0

function uid() {
  idCounter += 1
  return `gbp_${idCounter}`
}

function createRow(): GroupBillingPolicyRow {
  return {
    id: uid(),
    group: '',
    wallet: true,
    subscription: false,
  }
}

function rowsFromValue(value: string): GroupBillingPolicyRow[] {
  return parseGroupBillingPolicyRows(value).map((row) => ({
    ...row,
    id: row.id || uid(),
  }))
}

export function GroupBillingPolicyEditor(props: GroupBillingPolicyEditorProps) {
  const { t } = useTranslation()
  const onChange = props.onChange
  const lastEmittedValue = useRef(props.value)
  const [rows, setRows] = useState<GroupBillingPolicyRow[]>(() =>
    rowsFromValue(props.value)
  )

  useEffect(() => {
    if (props.value === lastEmittedValue.current) return
    setRows(rowsFromValue(props.value))
    lastEmittedValue.current = props.value
  }, [props.value])

  const emitRows = useCallback(
    (nextRows: GroupBillingPolicyRow[]) => {
      setRows(nextRows)
      const nextValue = serializeGroupBillingPolicyRows(nextRows)
      lastEmittedValue.current = nextValue
      onChange(nextValue)
    },
    [onChange]
  )

  const updateRow = useCallback(
    (id: string, patch: Partial<GroupBillingPolicyRow>) => {
      emitRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    },
    [emitRows, rows]
  )

  const addRow = useCallback(() => {
    emitRows([...rows, createRow()])
  }, [emitRows, rows])

  const removeRow = useCallback(
    (id: string) => {
      emitRows(rows.filter((row) => row.id !== id))
    },
    [emitRows, rows]
  )

  return (
    <div className='rounded-lg border'>
      <div className='flex items-center justify-between gap-3 border-b px-4 py-3'>
        <h3 className='text-sm font-semibold'>{t('Group billing policy')}</h3>
        <Button type='button' variant='outline' size='sm' onClick={addRow}>
          <Plus className='mr-2 h-4 w-4' />
          {t('Add group')}
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className='text-muted-foreground px-4 py-6 text-center text-sm'>
          {t('No group billing policies')}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='min-w-[180px]'>{t('Group')}</TableHead>
              <TableHead className='w-[150px]'>{t('Wallet')}</TableHead>
              <TableHead className='w-[170px]'>{t('Subscription')}</TableHead>
              <TableHead className='w-[80px] text-right'>
                {t('Actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Input
                    value={row.group}
                    placeholder={t('Group name')}
                    onChange={(event) =>
                      updateRow(row.id, { group: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <label className='flex items-center gap-2'>
                    <Checkbox
                      checked={row.wallet}
                      onCheckedChange={(checked) => {
                        if (checked !== true && !row.subscription) return
                        updateRow(row.id, { wallet: checked === true })
                      }}
                    />
                    <span>{t('Wallet')}</span>
                  </label>
                </TableCell>
                <TableCell>
                  <label className='flex items-center gap-2'>
                    <Checkbox
                      checked={row.subscription}
                      onCheckedChange={(checked) => {
                        if (checked !== true && !row.wallet) return
                        updateRow(row.id, {
                          subscription: checked === true,
                        })
                      }}
                    />
                    <span>{t('Subscription')}</span>
                  </label>
                </TableCell>
                <TableCell className='text-right'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-destructive h-8 w-8 p-0'
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
