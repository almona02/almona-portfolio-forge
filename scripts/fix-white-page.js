/**
 * Quick fix script for white page issue
 * Run this in browser console to clear service workers
 */

(function() {
  console.log('🔧 Almona Egypt - White Page Fix Script');
  console.log('======================================');
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length === 0) {
        console.log('✅ No service workers registered');
        console.log('💡 If you still see white page, try:');
        console.log('   1. Hard reload: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
        console.log('   2. Clear browser cache');
        console.log('   3. Check console for JavaScript errors');
        return;
      }
      
      console.log(`Found ${registrations.length} service worker(s)`);
      
      Promise.all(
        registrations.map(registration => {
          console.log(`Unregistering: ${registration.scope}`);
          return registration.unregister();
        })
      ).then(() => {
        console.log('✅ All service workers unregistered');
        console.log('🔄 Reloading page...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }).catch(error => {
        console.error('❌ Error unregistering service workers:', error);
      });
    });
  } else {
    console.log('⚠️ Service Workers not supported');
    console.log('💡 White page might be caused by:');
    console.log('   1. JavaScript errors (check console)');
    console.log('   2. Missing root element in index.html');
    console.log('   3. Build/compilation errors');
  }
})();

// Export for easy access
if (typeof window !== 'undefined') {
  (window as any).fixWhitePage = function() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
        console.log('Service workers cleared. Reloading...');
        window.location.reload();
      });
    }
  };
  
  console.log('💡 Run fixWhitePage() to clear service workers and reload');
}

