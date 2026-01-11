// Enhanced background service worker with status checking

// Service configurations
const services = {
  netflix: {
    name: 'Netflix',
    domain: 'netflix.com',
    accountUrl: 'https://www.netflix.com/account',
    color: '#E50914',
    enabled: true
  },
  hulu: {
    name: 'Hulu',
    domain: 'hulu.com',
    accountUrl: 'https://secure.hulu.com/account',
    color: '#1CE783',
    enabled: true
  },
  disney: {
    name: 'Disney+',
    domain: 'disneyplus.com',
    accountUrl: 'https://www.disneyplus.com/account',
    color: '#113CCF',
    enabled: true
  },
  hbo: {
    name: 'HBO Max',
    domain: 'max.com',
    accountUrl: 'https://play.max.com/account',
    color: '#B535F6',
    enabled: true
  },
  peacock: {
    name: 'Peacock',
    domain: 'peacocktv.com',
    accountUrl: 'https://www.peacocktv.com/account',
    color: '#000000',
    enabled: true
  },
  paramount: {
    name: 'Paramount+',
    domain: 'paramountplus.com',
    accountUrl: 'https://www.paramountplus.com/account',
    color: '#0064FF',
    enabled: true
  },
  amazon: {
    name: 'Prime Video',
    domain: 'amazon.com',
    accountUrl: 'https://www.amazon.com/gp/primecentral',
    color: '#00A8E1',
    enabled: true
  },
  spotify: {
    name: 'Spotify',
    domain: 'spotify.com',
    accountUrl: 'https://www.spotify.com/account/subscription/',
    color: '#1DB954',
    enabled: true
  },
  youtube: {
    name: 'YouTube Premium',
    domain: 'youtube.com',
    accountUrl: 'https://www.youtube.com/paid_memberships',
    color: '#FF0000',
    enabled: true
  }
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  // Load saved service settings or use defaults
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
        checkInterval: 24, // hours
        confirmBeforeCancel: true,
        notifyOnStatusChange: true
      }
    });
  });
});

// Check status of a single service
async function checkServiceStatus(serviceId) {
  const service = services[serviceId];
  if (!service) return null;

  return new Promise((resolve) => {
    // Open tab for the service
    chrome.tabs.create({ url: service.accountUrl, active: false }, (tab) => {
      // Wait for page to load
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          // Send message to content script to check status
          chrome.tabs.sendMessage(tab.id, { action: 'checkStatus' }, (response) => {
            // Close the tab after checking
            chrome.tabs.remove(tab.id);
            chrome.tabs.onUpdated.removeListener(listener);

            if (response) {
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
              resolve({ status: 'error', error: 'Could not check status' });
            }
          });
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // Timeout after 30 seconds
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.remove(tab.id);
        resolve({ status: 'timeout', error: 'Status check timed out' });
      }, 30000);
    });
  });
}

// Check all enabled services
async function checkAllStatuses() {
  const results = {};

  chrome.storage.local.get(['serviceSettings'], async (result) => {
    const serviceSettings = result.serviceSettings || services;
    const enabledServices = Object.entries(serviceSettings)
      .filter(([_, service]) => service.enabled)
      .map(([id, _]) => id);

    for (const serviceId of enabledServices) {
      results[serviceId] = await checkServiceStatus(serviceId);
    }

    chrome.storage.local.set({
      subscriptionStatuses: results,
      lastStatusCheck: new Date().toISOString()
    });

    return results;
  });
}

// Cancel a subscription
async function cancelSubscription(serviceId) {
  const service = services[serviceId];
  if (!service) return { success: false, error: 'Service not found' };

  return new Promise((resolve) => {
    // Open tab for the service
    chrome.tabs.create({ url: service.accountUrl, active: true }, (tab) => {
      // Wait for page to load
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          // First highlight the cancel button
          chrome.tabs.sendMessage(tab.id, { action: 'highlightCancelButton' }, (response) => {
            if (response && response.success) {
              // Ask for confirmation if enabled
              chrome.storage.local.get(['settings'], (result) => {
                const settings = result.settings || {};

                if (settings.confirmBeforeCancel) {
                  // Send notification to user
                  chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: `Cancel ${service.name}?`,
                    message: 'Click the highlighted button to confirm cancellation',
                    buttons: [{ title: 'Proceed' }, { title: 'Abort' }]
                  }, (notificationId) => {
                    // Handle notification button click
                    chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
                      if (id === notificationId) {
                        if (buttonIndex === 0) {
                          // Proceed with cancellation
                          chrome.tabs.sendMessage(tab.id, { action: 'executeCancellation' }, (cancelResponse) => {
                            resolve(cancelResponse || { success: false, error: 'No response' });
                          });
                        } else {
                          // Abort
                          chrome.tabs.remove(tab.id);
                          resolve({ success: false, aborted: true });
                        }
                      }
                    });
                  });
                } else {
                  // Execute cancellation directly
                  chrome.tabs.sendMessage(tab.id, { action: 'executeCancellation' }, (cancelResponse) => {
                    resolve(cancelResponse || { success: false, error: 'No response' });
                  });
                }
              });
            } else {
              resolve({ success: false, error: 'Could not find cancel button' });
            }
          });
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // Timeout after 60 seconds
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve({ success: false, error: 'Cancellation timed out' });
      }, 60000);
    });
  });
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getServices') {
    chrome.storage.local.get(['serviceSettings'], (result) => {
      sendResponse({ services: result.serviceSettings || services });
    });
  } else if (request.action === 'updateServiceSettings') {
    chrome.storage.local.set({ serviceSettings: request.services }, () => {
      sendResponse({ success: true });
    });
  } else if (request.action === 'getStatuses') {
    chrome.storage.local.get(['subscriptionStatuses', 'lastStatusCheck'], (result) => {
      sendResponse({
        statuses: result.subscriptionStatuses || {},
        lastCheck: result.lastStatusCheck
      });
    });
  } else if (request.action === 'checkStatus') {
    checkServiceStatus(request.serviceId).then(sendResponse);
  } else if (request.action === 'checkAllStatuses') {
    checkAllStatuses().then(sendResponse);
  } else if (request.action === 'cancelSubscription') {
    cancelSubscription(request.serviceId).then(sendResponse);
  } else if (request.action === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse({ settings: result.settings || {} });
    });
  } else if (request.action === 'updateSettings') {
    chrome.storage.local.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
    });
  }

  return true; // Keep message channel open for async response
});

// Set up periodic status check
chrome.alarms.create('statusCheck', {
  periodInMinutes: 1440 // 24 hours
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'statusCheck') {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      if (settings.autoCheck) {
        checkAllStatuses();
      }
    });
  }
});