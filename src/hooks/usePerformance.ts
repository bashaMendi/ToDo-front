import { useEffect, useRef, useCallback } from 'react';

// Performance metrics
interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  memoryUsage?: number;
}

// Performance monitoring hook
export function usePerformance(componentName: string) {
  const mountTimeRef = useRef<number>(Date.now());
  const renderTimeRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);

  // Measure render time
  const measureRender = useCallback(() => {
    if (typeof window === 'undefined') return () => {};
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      renderTimeRef.current = renderTime;
      updateCountRef.current++;
      lastRenderTimeRef.current = Date.now();

      // Log performance in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        // Example: send to analytics service
        // analytics.track('component_performance', {
        //   component: componentName,
        //   renderTime,
        //   updateCount: updateCountRef.current,
        // });
      }
    };
  }, [componentName]);

  // Get memory usage (if available)
  const getMemoryUsage = useCallback((): number | undefined => {
    if (typeof window === 'undefined') return undefined;
    if ('memory' in performance) {
      const memory = (performance as { memory: { usedJSHeapSize: number } }).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return undefined;
  }, []);

  // Get performance metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    return {
      componentName,
      renderTime: renderTimeRef.current,
      mountTime: Date.now() - mountTimeRef.current,
      updateCount: updateCountRef.current,
      memoryUsage: getMemoryUsage(),
    };
  }, [componentName, getMemoryUsage]);

  // Monitor component lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const cleanup = measureRender();
    
    return () => {
      cleanup();
      
      // Log final metrics on unmount
      if (process.env.NODE_ENV === 'development') {
        const metrics = getMetrics();
        console.log(`📊 ${componentName} final metrics:`, metrics);
      }
    };
  }, [measureRender, getMetrics, componentName]);

  return {
    measureRender,
    getMetrics,
    getMemoryUsage,
  };
}

// Page performance monitoring
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

    // Measure First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        metricsRef.current.firstContentfulPaint = fcpEntry.startTime;
      }
    });

    // Measure Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        metricsRef.current.largestContentfulPaint = lcpEntry.startTime;
      }
    });

    // Measure Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let cls = 0;
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as { hadRecentInput?: boolean; value?: number };
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
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();

      // Log page performance metrics
      const totalTime = performance.now() - startTimeRef.current;
      const metrics = {
        pageName,
        totalTime,
        ...metricsRef.current,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log(`📈 ${pageName} performance:`, metrics);
      }
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

// Network performance monitoring
export function useNetworkPerformance() {
  const networkInfoRef = useRef<{
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Get network information if available
    if ('connection' in navigator) {
      const connection = (navigator as { connection: { 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener: (event: string, handler: () => void) => void;
        removeEventListener: (event: string, handler: () => void) => void;
      } }).connection;
      
      const updateNetworkInfo = () => {
        networkInfoRef.current = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
        };
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  return {
    getNetworkInfo: () => networkInfoRef.current,
  };
}
