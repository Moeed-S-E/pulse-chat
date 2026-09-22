import { useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';

export default function HealthKeepAlive() {
  const [isServerAlive, setIsServerAlive] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const res = await apiFetch('/api/health');
        if (res.ok) {
          if (isMounted) setIsServerAlive(true);
        } else {
          if (isMounted) setIsServerAlive(false);
        }
      } catch (err) {
        if (isMounted) setIsServerAlive(false);
        console.warn('[Health Check] Backend health ping failed:', err.message);
      }
    };

    // Initial ping on mount
    checkHealth();

    // Continuously ping backend health endpoint every 15 seconds (15,000 ms)
    const intervalId = setInterval(checkHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
