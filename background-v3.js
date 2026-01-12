// Simplified background service worker using centralized configuration

// Import services configuration
importScripts('services-config.js');

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    subscriptionStatuses: {},
    lastStatusCheck: null,
    settings: {
      confirmBeforeCancel: true,
      notifyOnStatusChange: true
    }
  });
});

// Check subscription status for a service
async function checkServiceStatus(serviceKey) {
  const service = servicesConfig[serviceKey];
  if (!service) return { status: 'error', error: 'Service not found' };

  console.log(`[Status] Checking ${service.name}`);

  return new Promise((resolve) => {
    // Open tab in background
    chrome.tabs.create({ url: service.active.checkUrl, active: false }, (tab) => {
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

      // Listen for tab complete
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete' && !tabClosed) {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'checkStatus' }, (response) => {
              clearTimeout(checkTimeout);
              tabClosed = true;

              chrome.tabs.remove(tab.id).catch(() => {});
              chrome.tabs.onUpdated.removeListener(listener);

              if (chrome.runtime.lastError) {
                console.error('[Status] Message error:', chrome.runtime.lastError);
                resolve({ status: 'error', error: 'Could not communicate with page' });
              } else if (response) {
                // Save status
                chrome.storage.local.get(['subscriptionStatuses'], (result) => {
                  const statuses = result.subscriptionStatuses || {};
                  statuses[serviceKey] = {
                    ...response,
                    serviceKey,
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

// Cancel a subscription with simplified flow
async function cancelSubscription(serviceKey) {
  const service = servicesConfig[serviceKey];
  if (!service) return { success: false, error: 'Service not found' };

  console.log(`[Cancel] Starting cancellation for ${service.name}`);

  return new Promise((resolve) => {
    let cancellationTab = null;
    let timeoutId = null;
    let clickCount = 0;
    const maxClicks = 5; // Maximum buttons to click in sequence

    // Cleanup
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
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

    // Try to click next cancellation button
    const attemptNextClick = (tabId) => {
      clickCount++;

      if (clickCount > maxClicks) {
        cleanup();
        notify('Cancellation Complete', `Processed ${service.name} cancellation flow`);
        resolve({ success: true, clicks: clickCount - 1 });
        return;
      }

      console.log(`[Cancel] Attempt ${clickCount} for ${service.name}`);

      chrome.tabs.sendMessage(tabId, { action: 'executeCancellation' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Cancel] Error:', chrome.runtime.lastError);
          cleanup();
          notify('Cancellation Error', `Could not process ${service.name}. Please try manually.`, true);
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        console.log('[Cancel] Response:', response);

        if (!response || response.error) {
          // No more buttons found or error - we're likely done
          cleanup();
          if (clickCount > 1) {
            notify('Cancellation Processed', `Completed ${clickCount - 1} step(s) for ${service.name}`);
            resolve({ success: true, clicks: clickCount - 1 });
          } else {
            notify('No Cancel Button', `Could not find cancel button for ${service.name}`, true);
            resolve({ success: false, error: response?.error || 'No cancel button found' });
          }
        } else if (response.navigating) {
          // Page is navigating, wait for next load
          console.log('[Cancel] Page navigating, waiting...');
          // Tab listener will handle continuation
        } else if (response.success) {
          // Clicked a button, try to find another after a delay
          console.log('[Cancel] Click successful, looking for next...');
          setTimeout(() => attemptNextClick(tabId), 3000);
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
          notify('Cancellation Timeout', 'The process took too long. Please complete manually.', true);
          resolve({ success: false, error: 'Timeout' });
        }, 60000);

        // Try to click next button
        setTimeout(() => attemptNextClick(tabId), 2000);
      }
    };

    // Register listener
    chrome.tabs.onUpdated.addListener(tabListener);

    // Create tab with cancellation URL
    const startUrl = service.cancellation?.startUrl || service.active.checkUrl;
    chrome.tabs.create({ url: startUrl, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        cleanup();
        notify('Error', `Could not open ${service.name} page`, true);
        resolve({ success: false, error: 'Could not create tab' });
        return;
      }

      cancellationTab = tab;
      console.log('[Cancel] Opened tab:', startUrl);

      // Set overall timeout
      timeoutId = setTimeout(() => {
        cleanup();
        notify('Cancellation Timeout', 'The process took too long. Please complete manually.', true);
        resolve({ success: false, error: 'Overall timeout' });
      }, 120000); // 2 minutes
    });
  });
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'getServices') {
        // Get stored service settings to determine which are enabled
        const result = await chrome.storage.local.get(['serviceSettings']);
        const serviceSettings = result.serviceSettings || {};

        // Merge service config with enabled states from storage
        const servicesWithEnabled = {};
        for (const [key, service] of Object.entries(servicesConfig)) {
          servicesWithEnabled[key] = {
            ...service,
            enabled: serviceSettings[key]?.enabled !== undefined ? serviceSettings[key].enabled : false
          };
        }
        sendResponse({ services: servicesWithEnabled });
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
        // Only check enabled services
        const settingsResult = await chrome.storage.local.get(['serviceSettings']);
        const serviceSettings = settingsResult.serviceSettings || {};

        const results = {};
        for (const serviceKey of Object.keys(servicesConfig)) {
          // Only check if service is enabled
          if (serviceSettings[serviceKey]?.enabled) {
            results[serviceKey] = await checkServiceStatus(serviceKey);
          }
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

  return true; // Async response
});