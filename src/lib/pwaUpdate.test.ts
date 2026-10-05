import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { showAppUpdate } from './pwaUpdate';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

function chooseReload() {
  const options = vi.mocked(toast.info).mock.calls[0][1] as {action: {onClick: () => void}};
  options.action.onClick();
}

describe('user-controlled app updates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not reload unsaved work when an update arrives', () => {
    const update = vi.fn().mockResolvedValue(undefined);
    showAppUpdate(update);
    expect(update).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('An app update is ready', expect.objectContaining({
      description: 'Save your current work before reloading.', duration: Infinity,
    }));
  });

  it('activates the update only when the user chooses to reload', () => {
    const update = vi.fn().mockResolvedValue(undefined);
    showAppUpdate(update);
    chooseReload();
    expect(update).toHaveBeenCalledOnce();
  });

  it('reports failed activation rather than claiming an update succeeded', async () => {
    showAppUpdate(vi.fn().mockRejectedValue(new Error('activation failed')));
    chooseReload();
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
  });
});
