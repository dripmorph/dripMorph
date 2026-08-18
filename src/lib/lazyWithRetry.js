import { lazy } from 'react';

/**
 * Enhanced React.lazy that automatically handles chunk loading / dynamic import errors
 * when a new production build is deployed while a client tab is open.
 */
export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('drip_chunk_reload_lock') || 'false'
    );

    try {
      const module = await componentImport();
      window.sessionStorage.removeItem('drip_chunk_reload_lock');
      return module;
    } catch (error) {
      console.warn('[lazyWithRetry] Dynamic import failed:', error);

      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('drip_chunk_reload_lock', 'true');
        window.location.reload();
        return new Promise(() => {});
      }

      // Retry once more after brief delay
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retryModule = await componentImport();
        window.sessionStorage.removeItem('drip_chunk_reload_lock');
        return retryModule;
      } catch (retryErr) {
        console.error('[lazyWithRetry] Retry failed:', retryErr);
        throw retryErr;
      }
    }
  });
}
