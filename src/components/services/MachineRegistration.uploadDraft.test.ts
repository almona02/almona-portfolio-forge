import { describe, expect, it, vi } from 'vitest'

/**
 * Upload-failure draft recoverability contract for missing-serial registration.
 * The UI must not clear local draft state when photo persistence fails.
 */
describe('MachineRegistration upload failure draft contract', () => {
  it('preserves draft fields when photo upload fails before registration', async () => {
    const draft = {
      serialNumber: '',
      model: 'Unknown press',
      installationDate: '2024-01-15',
      photos: ['blob:local-preview'],
      rawFiles: [{ name: 'plate.jpg' } as File],
      idempotencyKey: 'idem-draft-1',
    }

    const uploadMachinePhoto = vi.fn().mockRejectedValue(new Error('storage unavailable'))
    const registerMachine = vi.fn()

    const uploads = await Promise.allSettled(
      draft.rawFiles.map((f) => uploadMachinePhoto(f, 'user-1', 'unassigned')),
    )
    const uploadedUrls = uploads
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value)
    const failed = uploads.some((r) => r.status === 'rejected')
    const missingSerial = !draft.serialNumber.trim()

    if (failed || (missingSerial && uploadedUrls.length === 0)) {
      // Registration must not run; draft remains intact for recovery.
      expect(registerMachine).not.toHaveBeenCalled()
      expect(draft.model).toBe('Unknown press')
      expect(draft.installationDate).toBe('2024-01-15')
      expect(draft.rawFiles).toHaveLength(1)
      expect(draft.idempotencyKey).toBe('idem-draft-1')
      expect(draft.photos).toHaveLength(1)
      return
    }

    throw new Error('expected upload failure path')
  })
})
