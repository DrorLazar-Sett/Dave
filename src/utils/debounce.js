// debounce.js - Utility functions for debouncing and throttling

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @param {boolean} immediate - If true, trigger function on leading edge instead of trailing
 * @returns {Function} The debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle
 * @returns {Function} The throttled function
 */
export function throttle(func, wait) {
  let inThrottle;
  let lastTime = 0;
  
  return function executedFunction(...args) {
    const now = Date.now();
    
    if (!inThrottle || now - lastTime >= wait) {
      func.apply(this, args);
      lastTime = now;
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}

/**
 * Creates a throttled function using requestAnimationFrame for smooth animations
 * @param {Function} func - The function to throttle
 * @returns {Function} The throttled function
 */
export function throttleRAF(func) {
  let rafId = null;
  
  return function executedFunction(...args) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, args);
        rafId = null;
      });
    }
  };
}