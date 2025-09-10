'use client';

import React, { useState, useEffect } from 'react';
import { getErrorStats } from '@/lib/error-handler';
import { useNetworkPerformance } from '@/hooks/usePerformance';

interface PerformanceDashboardProps {
  isVisible?: boolean;
}

interface NetworkInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

type PerfWithMemory = Performance & { memory?: { usedJSHeapSize: number } };

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  // Show the dashboard automatically in development
  isVisible = process.env.NODE_ENV === 'development',
}) => {
  const [mounted, setMounted] = useState(false);

  const [errorStats, setErrorStats] = useState<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }>({
    total: 0,
    byType: {},
    bySeverity: {},
  });

  const { getNetworkInfo } = useNetworkPerformance();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({});
  const [memoryUsage, setMemoryUsage] = useState<number | undefined>();

  // Ensure client-only rendering (avoid SSR mismatches)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Periodically refresh metrics. Dependencies are stable, so no render loop.
  useEffect(() => {
    if (!mounted || !isVisible) return;

    const update = () => {
      setErrorStats(getErrorStats());
      setNetworkInfo(getNetworkInfo());

      const mem = (performance as PerfWithMemory).memory?.usedJSHeapSize;
      if (mem) setMemoryUsage(mem / 1024 / 1024); // MB
    };

    update(); // Initial run
    const id = window.setInterval(update, 5000);
    return () => clearInterval(id);
  }, [mounted, isVisible, getNetworkInfo]);

  // Hide until mounted or when not visible
  if (!mounted || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="mb-2 font-bold text-yellow-400">Performance Dashboard</div>

      {/* Error stats */}
      <div className="mb-2">
        <div className="text-red-400">Errors: {errorStats.total}</div>
        {Object.entries(errorStats.bySeverity).map(([severity, count]) =>
          (count as number) > 0 ? (
            <div key={severity} className="ml-2 text-gray-300">
              {severity}: {count as number}
            </div>
          ) : null
        )}
      </div>

      {/* Network info */}
      {networkInfo.effectiveType && (
        <div className="mb-2">
          <div className="text-blue-400">Network: {networkInfo.effectiveType}</div>
          {networkInfo.downlink !== undefined && (
            <div className="ml-2 text-gray-300">Speed: {networkInfo.downlink} Mbps</div>
          )}
          {networkInfo.rtt !== undefined && (
            <div className="ml-2 text-gray-300">RTT: {networkInfo.rtt}ms</div>
          )}
        </div>
      )}

      {/* Memory usage */}
      {memoryUsage !== undefined && (
        <div className="mb-2">
          <div className="text-green-400">Memory: {memoryUsage.toFixed(1)} MB</div>
        </div>
      )}

      {/* Simple performance values (static approximation for FPS) */}
      <div className="text-gray-300">
        <div>FPS: {Math.round(1000 / 16)}</div>
        <div>Load Time: {typeof window !== 'undefined' ? performance.now().toFixed(0) : '0'}ms</div>
      </div>
    </div>
  );
};
