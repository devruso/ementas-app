(function () {
  try {
    var cleanupFlag = 'ementas:sw-cleanup-v1';

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (registration) {
          registration.unregister();
        });
      });
    }

    if ('caches' in window) {
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) { return caches.delete(key); }));
      });
    }

    localStorage.setItem(cleanupFlag, 'done');
  } catch (error) {
    // Ignore cleanup errors and still force navigation.
  }

  var targetPath = '/disciplinas';
  if (window.location.pathname !== targetPath) {
    window.location.replace(targetPath);
    return;
  }

  window.location.reload();
})();

