// Platform layer for getting a backup file in and out of the app.
//
// No Capacitor plugins are required. On iOS the WKWebView exposes the Web Share
// API, which opens the native share sheet and lets the user drop the file into
// Files / iCloud Drive / AirDrop. `<a download>` does not work inside WKWebView,
// so it is only the desktop-browser fallback.

export type ExportOutcome = 'shared' | 'downloaded' | 'cancelled';

const BACKUP_MIME = 'application/json';

const isAbortError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError';

const downloadViaAnchor = (contents: string, fileName: string): ExportOutcome => {
  const blob = new Blob([contents], { type: BACKUP_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
};

export const exportBackupFile = async (
  contents: string,
  fileName: string
): Promise<ExportOutcome> => {
  const shareApi = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (typeof File === 'function' && shareApi.share && shareApi.canShare) {
    const file = new File([contents], fileName, { type: BACKUP_MIME });
    if (shareApi.canShare({ files: [file] })) {
      try {
        await shareApi.share({ files: [file], title: fileName });
        return 'shared';
      } catch (err) {
        if (isAbortError(err)) return 'cancelled';
        // Any other share failure falls through to the download path.
        console.warn('[IronLog] Share sheet failed, falling back to download', err);
      }
    }
  }

  return downloadViaAnchor(contents, fileName);
};

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('無法讀取檔案'));
    reader.readAsText(file);
  });
