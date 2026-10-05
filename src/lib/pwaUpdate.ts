import { toast } from 'sonner';

export function showAppUpdate(updateApp: () => Promise<void>) {
  toast.info('An app update is ready', {
    id: 'app-update',
    description: 'Save your current work before reloading.',
    duration: Infinity,
    action: {
      label: 'Reload after saving',
      onClick: () => {
        void updateApp().catch(() => {
          toast.error('The update could not be activated. Save your work and try reloading again.');
        });
      },
    },
  });
}
