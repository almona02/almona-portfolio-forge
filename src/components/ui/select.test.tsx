import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

function ControlledSelect({
  onValueChange,
  initial = '',
}: {
  onValueChange?: (v: string) => void
  initial?: string
}) {
  const [value, setValue] = useState(initial)
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange?.(next)
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Alpha</SelectItem>
        <SelectItem value="b">Beta</SelectItem>
        <SelectItem value="__none__">None</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe('Select event contract', () => {
  it('forwards onValueChange through SelectContent to nested SelectItem clicks', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ControlledSelect onValueChange={onValueChange} />)

    await user.click(screen.getByRole('option', { name: 'Beta' }))

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('b')
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('marks the selected option and supports none/sentinel values used by TicketForm', async () => {
    const user = userEvent.setup()
    render(<ControlledSelect initial="a" />)

    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('option', { name: 'None' }))
    expect(screen.getByRole('option', { name: 'None' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false')
  })
})
