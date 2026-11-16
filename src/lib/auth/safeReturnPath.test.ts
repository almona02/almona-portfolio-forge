import { describe, expect, it } from 'vitest'
import { buildReturnPath, safeReturnPath } from './safeReturnPath'

describe('safeReturnPath', () => {
  const fallback = '/portal'

  it('preserves internal pathname, query, and fragment', () => {
    expect(safeReturnPath('/admin?tab=service-routines#panel', fallback)).toBe(
      '/admin?tab=service-routines#panel',
    )
    expect(safeReturnPath('/support/routines', fallback)).toBe('/support/routines')
  })

  it('rejects external and malformed destinations', () => {
    expect(safeReturnPath('https://evil.example/phish', fallback)).toBe(fallback)
    expect(safeReturnPath('//evil.example/phish', fallback)).toBe(fallback)
    expect(safeReturnPath('\\evil', fallback)).toBe(fallback)
    expect(safeReturnPath('javascript:alert(1)', fallback)).toBe(fallback)
    expect(safeReturnPath('admin', fallback)).toBe(fallback)
    expect(safeReturnPath(null, fallback)).toBe(fallback)
  })

  it('buildReturnPath joins location parts', () => {
    expect(
      buildReturnPath({
        pathname: '/admin',
        search: '?tab=service-routines',
        hash: '#x',
      }),
    ).toBe('/admin?tab=service-routines#x')
  })
})
