// Local analytics beacon for Counter.dev
// This bypasses ad blockers by serving from the same domain
(function() {
  // Only track if not on localhost and user hasn't opted out
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      navigator.doNotTrack === '1' || 
      window.doNotTrack === '1') {
    return;
  }

  // Your Counter.dev tracking ID
  const trackingId = 'b3d284cd-1f4f-48d9-900c-c63b1d8fa0ca';
  const utcOffset = '2';
  
  // Create tracking pixel
  const img = new Image();
  img.src = `https://counter.dev/track?id=${trackingId}&utcoffset=${utcOffset}&page=${encodeURIComponent(window.location.pathname)}&ref=${encodeURIComponent(document.referrer)}&screen=${screen.width}x${screen.height}`;
  img.style.display = 'none';
  document.body.appendChild(img);
})();