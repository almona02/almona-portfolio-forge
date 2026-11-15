import { describe, expect, it } from 'vitest'
import { roleHomePath } from './roleRouting'

describe('roleHomePath', () => {
  it('sends support staff to the desk ticket-read path', () => {
    expect(roleHomePath('support')).toBe('/support/desk')
  })

  it('keeps technicians on /technician', () => {
    expect(roleHomePath('technician')).toBe('/technician')
  })
})
