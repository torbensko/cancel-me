// Improved background service worker with better error handling and multi-step cancellation

// Service configurations
const services = {
  netflix: {
    name: 'Netflix',
    domain: 'netflix.com',
    accountUrl: 'https://www.netflix.com/account',
    cancelUrl: 'https://www.netflix.com/account/membership',  // Updated to membership page
    color: '#E50914',
    enabled: true
  },
  hulu: {
    name: 'Hulu',
    domain: 'hulu.com',
    accountUrl: 'https://secure.hulu.com/account',
    cancelUrl: 'https://secure.hulu.com/account',
    color: '#1CE783',
    enabled: true
  },
  disney: {
    name: 'Disney+',
    domain: 'disneyplus.com',
    accountUrl: 'https://www.disneyplus.com/account',
    cancelUrl: 'https://www.disneyplus.com/account',
    color: '#113CCF',
    enabled: true
  },
  hbo: {
    name: 'HBO Max',
    domain: 'max.com',
    accountUrl: 'https://play.max.com/account',
    cancelUrl: 'https://play.max.com/account',
    color: '#B535F6',
    enabled: true
  },
  peacock: {
    name: 'Peacock',
    domain: 'peacocktv.com',
    accountUrl: 'https://www.peacocktv.com/account',
    cancelUrl: 'https://www.peacocktv.com/account',
    color: '#000000',
    enabled: true
  },
  paramount: {
    name: 'Paramount+',
    domain: 'paramountplus.com',
    accountUrl: 'https://www.paramountplus.com/account',
    cancelUrl: 'https://www.paramountplus.com/account',
    color: '#0064FF',
    enabled: true
  },
  amazon: {
    name: 'Prime Video',
    domain: 'amazon.com',
    accountUrl: 'https://www.amazon.com/gp/primecentral',
    cancelUrl: 'https://www.amazon.com/gp/primecentral',
    color: '#00A8E1',
    enabled: true
  },
  spotify: {
    name: 'Spotify',
    domain: 'spotify.com',
    accountUrl: 'https://www.spotify.com/account/subscription/',
    cancelUrl: 'https://www.spotify.com/account/subscription/',
    color: '#1DB954',
    enabled: true
  },
  youtube: {
    name: 'YouTube Premium',
    domain: 'youtube.com',
    accountUrl: 'https://www.youtube.com/paid_memberships',
    cancelUrl: 'https://www.youtube.com/paid_memberships',
    color: '#FF0000',
    enabled: true
  }
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['serviceSettings', 'subscriptionStatuses'], (result) => {
    const savedSettings = result.serviceSettings || {};
    const statuses = result.subscriptionStatuses || {};

    // Merge saved settings with defaults
    const mergedServices = {};
    for (const [id, service] of Object.entries(services)) {
      mergedServices[id] = {
        ...service,
        enabled: savedSettings[id]?.enabled !== undefined ? savedSettings[id].enabled : true
      };
    }

    chrome.storage.local.set({
      serviceSettings: mergedServices,
      subscriptionStatuses: statuses,
      lastStatusCheck: null,
      settings: {
        autoCheck: true,
        checkInterval: 24,
        confirmBeforeCancel: true,
        notifyOnStatusChange: true
      }
    });
  });
});

// Check subscription status for a single service
async function checkServiceStatus(serviceId) {
  const service = services[serviceId];
  if (!service) return null;

  console.log(`[Status] Checking ${service.name}`);

  return new Promise((resolve) => {
    // Open tab in background
    chrome.tabs.create({ url: service.accountUrl, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('[Status] Error creating tab:', chrome.runtime.lastError);
        resolve({ status: 'error', error: chrome.runtime.lastError.message });
        return;
      }

      let tabClosed = false;
      const checkTimeout = setTimeout(() => {
        if (!tabClosed && tab.id) {
          tabClosed = true;
          chrome.tabs.remove(tab.id).catch(() => {});
        }
        resolve({ status: 'timeout', error: 'Status check timed out' });
      }, 30000);

      // Listen for tab updates
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete' && !tabClosed) {
          // Add delay for page to fully render
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'checkStatus' }, (response) => {
              clearTimeout(checkTimeout);
              tabClosed = true;

              // Close the tab
              chrome.tabs.remove(tab.id).catch(() => {});
              chrome.tabs.onUpdated.removeListener(listener);

              if (chrome.runtime.lastError) {
                console.error('[Status] Message error:', chrome.runtime.lastError);
                resolve({ status: 'error', error: 'Could not communicate with page' });
              } else if (response) {
                // Save status
                chrome.storage.local.get(['subscriptionStatuses'], (result) => {
                  const statuses = result.subscriptionStatuses || {};
                  statuses[serviceId] = {
                    ...response,
                    serviceId,
                    lastChecked: new Date().toISOString()
                  };
                  chrome.storage.local.set({ subscriptionStatuses: statuses });
                });
                resolve(response);
              } else {
                resolve({ status: 'error', error: 'No response from page' });
              }
            });
          }, 2000);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

// Cancel a subscription with improved flow
async function cancelSubscription(serviceId) {
  const service = services[serviceId];
  if (!service) return { success: false, error: 'Service not found' };

  console.log(`[Cancel] Starting cancellation for ${service.name}`);

  return new Promise((resolve) => {
    let cancellationTab = null;
    let timeoutId = null;
    let navigationCount = 0;
    const maxNavigations = 3;

    // Cleanup function
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      chrome.tabs.onUpdated.removeListener(tabListener);
    };

    // Show notification
    const notify = (title, message, isError = false) => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: isError ? 2 : 1
      });
    };

    // Try to execute cancellation
    const attemptCancellation = (tabId) => {
      // Send cancellation request to content script
      chrome.tabs.sendMessage(tabId, { action: 'executeCancellation' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Cancel] Runtime error:', chrome.runtime.lastError);

          // Try to inject content script if it's not loaded
          chrome.tabs.executeScript(tabId, {
            file: 'content-debug.js'
          }, () => {
            if (chrome.runtime.lastError) {
              cleanup();
              notify('Cancellation Error', `Could not access ${service.name} page. Make sure you're logged in.`, true);
              resolve({ success: false, error: 'Could not inject script' });
            } else {
              // Retry after injection
              setTimeout(() => attemptCancellation(tabId), 1000);
            }
          });
          return;
        }

        console.log('[Cancel] Response:', response);

        if (!response) {
          cleanup();
          notify('Cancellation Error', `No response from ${service.name}. Please try manually.`, true);
          resolve({ success: false, error: 'No response' });
        } else if (response.navigating) {
          // Page is navigating, wait for next load
          navigationCount++;
          if (navigationCount > maxNavigations) {
            cleanup();
            notify('Cancellation Error', 'Too many redirects. Please complete manually.', true);
            resolve({ success: false, error: 'Too many redirects' });
          }
          // Let tab listener handle next page load
        } else if (response.success) {
          cleanup();
          notify('Subscription Cancelled', `Successfully initiated cancellation for ${service.name}`);

          // Save to history
          chrome.storage.local.get(['cancellationHistory'], (result) => {
            const history = result.cancellationHistory || [];
            history.push({
              service: service.name,
              serviceId: serviceId,
              timestamp: new Date().toISOString()
            });
            chrome.storage.local.set({ cancellationHistory: history });
          });

          resolve({ success: true });
        } else {
          cleanup();
          const errorMsg = response.error || 'Unknown error';

          if (errorMsg.includes('Element not found') || errorMsg.includes('selector')) {
            notify('Cannot Find Cancel Button', `The cancel button wasn't found on ${service.name}. The site may have changed.`, true);
          } else {
            notify('Cancellation Failed', `Could not cancel ${service.name}: ${errorMsg}`, true);
          }

          resolve({ success: false, error: errorMsg });
        }
      });
    };

    // Tab update listener
    const tabListener = (tabId, changeInfo, tab) => {
      if (cancellationTab && tabId === cancellationTab.id && changeInfo.status === 'complete') {
        console.log('[Cancel] Page loaded:', tab.url);

        // Reset timeout
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          cleanup();
          notify('Cancellation Timeout', 'The cancellation process took too long. Please complete manually.', true);
          resolve({ success: false, error: 'Timeout' });
        }, 60000);

        // Attempt cancellation after page loads
        setTimeout(() => attemptCancellation(tabId), 2000);
      }
    };

    // Register listener
    chrome.tabs.onUpdated.addListener(tabListener);

    // Create tab with the cancel URL (membership page for Netflix)
    chrome.tabs.create({ url: service.cancelUrl || service.accountUrl, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        cleanup();
        notify('Error', `Could not open ${service.name} page`, true);
        resolve({ success: false, error: 'Could not create tab' });
        return;
      }

      cancellationTab = tab;
      console.log('[Cancel] Opened tab:', service.cancelUrl || service.accountUrl);

      // Set overall timeout
      timeoutId = setTimeout(() => {
        cleanup();
        notify('Cancellation Timeout', 'The cancellation process took too long. Please complete manually.', true);
        resolve({ success: false, error: 'Overall timeout' });
      }, 120000); // 2 minutes
    });
  });
}

// Message handler with proper async handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async responses properly
  (async () => {
    try {
      if (request.action === 'getServices') {
        const result = await chrome.storage.local.get(['serviceSettings']);
        sendResponse({ services: result.serviceSettings || services });
      } else if (request.action === 'updateServiceSettings') {
        await chrome.storage.local.set({ serviceSettings: request.services });
        sendResponse({ success: true });
      } else if (request.action === 'getStatuses') {
        const result = await chrome.storage.local.get(['subscriptionStatuses', 'lastStatusCheck']);
        sendResponse({
          statuses: result.subscriptionStatuses || {},
          lastCheck: result.lastStatusCheck
        });
      } else if (request.action === 'checkStatus') {
        const response = await checkServiceStatus(request.serviceId);
        sendResponse(response);
      } else if (request.action === 'checkAllStatuses') {
        const result = await chrome.storage.local.get(['serviceSettings']);
        const serviceSettings = result.serviceSettings || services;
        const enabledServices = Object.entries(serviceSettings)
          .filter(([_, service]) => service.enabled)
          .map(([id, _]) => id);

        const results = {};
        for (const serviceId of enabledServices) {
          results[serviceId] = await checkServiceStatus(serviceId);
        }

        await chrome.storage.local.set({
          subscriptionStatuses: results,
          lastStatusCheck: new Date().toISOString()
        });

        sendResponse(results);
      } else if (request.action === 'cancelSubscription') {
        const response = await cancelSubscription(request.serviceId);
        sendResponse(response);
      } else if (request.action === 'getSettings') {
        const result = await chrome.storage.local.get(['settings']);
        sendResponse({ settings: result.settings || {} });
      } else if (request.action === 'updateSettings') {
        await chrome.storage.local.set({ settings: request.settings });
        sendResponse({ success: true });
      } else {
        sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
});