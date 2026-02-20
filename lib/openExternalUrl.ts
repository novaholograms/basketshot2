export function openExternalUrl(url: string): void {
  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}
