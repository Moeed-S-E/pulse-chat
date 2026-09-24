import { useEffect } from 'react';
import { apiFetch, warmupServer } from '../../config/api';

export default function HealthKeepAlive() {

  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    // Immediately trigger background server warmup
    warmupServer();

    const checkHealth = async () => {
      if (document.hidden) {
        timerId = setTimeout(checkHealth, 5000);
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per check

        const res = await apiFetch('/api/health', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          if (isMounted) setStatus('online');
          // Server is warm & online -> ping every 15 seconds to prevent idle sleep
          timerId = setTimeout(checkHealth, 15000);
        } else {
          if (isMounted) setStatus('warming');
          // Server starting up -> retry aggressively in 3s
          timerId = setTimeout(checkHealth, 3000);
        }
      } catch {
        console.log('[Server Warmup] Waking up backend server on Render...');
        // Retry aggressively every 3 seconds during cold start
        timerId = setTimeout(checkHealth, 3000);
      }
    };

    checkHealth();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return null;
}
