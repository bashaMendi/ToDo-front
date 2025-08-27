import { useEffect, useRef, useCallback, useMemo } from 'react';

// ----- Types -----
interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  memoryUsage?: number;
}

// ----- Component performance monitoring -----
export function usePerformance(componentName: string) {
  const mountTimeRef = useRef<number>(Date.now());
  const renderTimeRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);

  // Measures time between the start of a render and its commit.
  // Returns a cleanup function that should be called at commit time.
  const measureRender = useCallback(() => {
    if (typeof window === 'undefined') return () => {};

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      renderTimeRef.current = renderTime;
      updateCountRef.current++;
      lastRenderTimeRef.current = Date.now();

      // Example: send to analytics in production
      // if (process.env.NODE_ENV === 'production') {
      //   analytics.track('component_performance', {
      //     component: componentName,
      //     renderTime,
      //     updateCount: updateCountRef.current,
      //   });
      // }
    };
  }, []);

  // Reads JS heap usage if supported (Chrome only)
  const getMemoryUsage = useCallback((): number | undefined => {
    if (typeof window === 'undefined') return undefined;
    if ('memory' in performance) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return undefined;
  }, []);

  // Returns current metrics snapshot
  const getMetrics = useCallback((): PerformanceMetrics => {
    return {
      componentName,
      renderTime: renderTimeRef.current,
      mountTime: Date.now() - mountTimeRef.current,
      updateCount: updateCountRef.current,
      memoryUsage: getMemoryUsage(),
    };
  }, [componentName, getMemoryUsage]);

  // On mount: prepare measurement. On unmount: log final metrics in dev.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanup = measureRender();

    return () => {
      cleanup();
      // Silent cleanup - no logging in production
    };
  }, [measureRender, getMetrics, componentName]);

  return {
    measureRender,
    getMetrics,
    getMemoryUsage,
  };
}

// ----- Page-level performance monitoring -----
export function usePagePerformance(pageName: string) {
  const startTimeRef = useRef<number>(0);
  const metricsRef = useRef<{
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    cumulativeLayoutShift?: number;
  }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    startTimeRef.current = performance.now();

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        metricsRef.current.firstContentfulPaint = fcpEntry.startTime;
      }
    });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        metricsRef.current.largestContentfulPaint = lcpEntry.startTime;
      }
    });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let cls = 0;
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as unknown as { hadRecentInput?: boolean; value?: number };
        if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
          cls += layoutShiftEntry.value;
        }
      }
      metricsRef.current.cumulativeLayoutShift = cls;
    });

    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // Silent fail for performance observer
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
      // Silent cleanup - no logging in production
    };
  }, [pageName]);

  return {
    getPageMetrics: () => ({
      pageName,
      totalTime: typeof window !== 'undefined' ? performance.now() - startTimeRef.current : 0,
      ...metricsRef.current,
    }),
  };
}

// ----- Network performance monitoring (stable getNetworkInfo) -----
export function useNetworkPerformance() {
  const networkInfoRef = useRef<{
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  }>({});

  // Stable function identity so components can safely include it in deps
  const getNetworkInfo = useCallback(() => networkInfoRef.current, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Cross-browser support
    const nav = navigator as unknown as { connection?: unknown; mozConnection?: unknown; webkitConnection?: unknown };
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection;

    if (!connection) return;

    const updateNetworkInfo = () => {
      const conn = connection as unknown as { effectiveType?: string; downlink?: number; rtt?: number };
      networkInfoRef.current = {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
      };
    };

    updateNetworkInfo();
    (connection as unknown as { addEventListener?: (event: string, handler: () => void) => void }).addEventListener?.('change', updateNetworkInfo);

    return () => {
      (connection as unknown as { removeEventListener?: (event: string, handler: () => void) => void }).removeEventListener?.('change', updateNetworkInfo);
    };
  }, []);

  // Memoize returned object to avoid new identity on each render
  return useMemo(() => ({ getNetworkInfo }), [getNetworkInfo]);
}
