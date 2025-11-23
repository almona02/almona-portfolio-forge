
// Performance monitoring setup
// Note: web-vitals v3+ uses onCLS, onINP, etc. instead of getCLS, getFID
// FID was deprecated and replaced with INP (Interaction to Next Paint) in v3+
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  console.log('Performance Metric:', metric);
  
  // Example: Send to Google Analytics
  if (typeof (window as any).gtag !== 'undefined') {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
}

// Performance budget monitoring
const performanceBudget: Record<string, number> = {
  FCP: 1800, // 1.8s
  LCP: 2500, // 2.5s
  INP: 200,  // 200ms (replaces FID)
  CLS: 0.1,  // 0.1
  TTFB: 800  // 800ms
};

function checkPerformanceBudget(metric: any) {
  const budget = performanceBudget[metric.name];
  if (budget && metric.value > budget) {
    console.warn(`Performance budget exceeded for ${metric.name}: ${metric.value} > ${budget}`);
  }
}

// Monitor Core Web Vitals
// web-vitals v3+ API: onCLS, onINP, etc. instead of getCLS, getFID
onCLS((metric) => {
  sendToAnalytics(metric);
  checkPerformanceBudget(metric);
});

onINP((metric) => {
  sendToAnalytics(metric);
  checkPerformanceBudget(metric);
});

onFCP((metric) => {
  sendToAnalytics(metric);
  checkPerformanceBudget(metric);
});

onLCP((metric) => {
  sendToAnalytics(metric);
  checkPerformanceBudget(metric);
});

onTTFB((metric) => {
  sendToAnalytics(metric);
  checkPerformanceBudget(metric);
});
