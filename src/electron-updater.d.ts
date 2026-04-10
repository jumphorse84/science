export {};

declare global {
  interface Window {
    scienceUpdater?: {
      onStatus: (callback: (payload: any) => void) => () => void;
      checkForUpdates: () => Promise<{ ok: boolean; reason?: string }>;
      downloadUpdate: () => Promise<{ ok: boolean; reason?: string }>;
      restartToUpdate: () => Promise<{ ok: boolean; reason?: string }>;
    };
    scienceDesktop?: {
      notify: (payload: { title?: string; body?: string }) => Promise<{ ok: boolean }>;
      flashFrame: (enabled: boolean) => Promise<{ ok: boolean }>;
    };
  }
}
