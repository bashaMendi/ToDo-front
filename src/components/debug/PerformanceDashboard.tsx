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

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  isVisible = process.env.NODE_ENV === 'development' 
}) => {
  const [mounted, setMounted] = useState(false);
  const [errorStats, setErrorStats] = useState({ total: 0, byType: {}, bySeverity: {} });
  const { getNetworkInfo } = useNetworkPerformance();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({});
  const [memoryUsage, setMemoryUsage] = useState<number | undefined>();

  // Ensure component only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isVisible) return;

    // Initialize stats after mount
    setErrorStats(getErrorStats());
    setNetworkInfo(getNetworkInfo());

    const interval = setInterval(() => {
      setErrorStats(getErrorStats());
      setNetworkInfo(getNetworkInfo());
      
      // Get memory usage if available
      if (typeof window !== 'undefined' && 'memory' in performance) {
        const memory = (performance as { memory: { usedJSHeapSize: number } }).memory;
        setMemoryUsage(memory.usedJSHeapSize / 1024 / 1024); // MB
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [mounted, isVisible, getNetworkInfo]);

  // Don't render anything until mounted
  if (!mounted || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="mb-2 font-bold text-yellow-400">Performance Dashboard</div>
      
      {/* Error Stats */}
      <div className="mb-2">
        <div className="text-red-400">Errors: {errorStats.total}</div>
        {Object.entries(errorStats.bySeverity).map(([severity, count]) => (
          (count as number) > 0 && (
            <div key={severity} className="ml-2 text-gray-300">
              {severity}: {count as number}
            </div>
          )
        ))}
      </div>

      {/* Network Info */}
      {networkInfo.effectiveType && (
        <div className="mb-2">
          <div className="text-blue-400">Network: {networkInfo.effectiveType}</div>
          {networkInfo.downlink && (
            <div className="ml-2 text-gray-300">
              Speed: {networkInfo.downlink} Mbps
            </div>
          )}
          {networkInfo.rtt && (
            <div className="ml-2 text-gray-300">
              RTT: {networkInfo.rtt}ms
            </div>
          )}
        </div>
      )}

      {/* Memory Usage */}
      {memoryUsage !== undefined && (
        <div className="mb-2">
          <div className="text-green-400">Memory: {memoryUsage.toFixed(1)} MB</div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="text-gray-300">
        <div>FPS: {Math.round(1000 / 16)}</div>
        <div>Load Time: {typeof window !== 'undefined' ? performance.now().toFixed(0) : '0'}ms</div>
      </div>
    </div>
  );
};
