// Background service worker for the subscription manager extension

// Track subscription services and their status
let subscriptionStatus = {};

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    subscriptions: [],
    lastChecked: null,
    settings: {
      autoHighlight: true,
      notifications: true
    }
  });
});

// Service configurations with their cancellation URLs
const services = {
  netflix: {
    name: 'Netflix',
    domain: 'netflix.com',
    cancelUrl: 'https://www.netflix.com/account',
    color: '#E50914'
  },
  hulu: {
    name: 'Hulu',
    domain: 'hulu.com',
    cancelUrl: 'https://secure.hulu.com/account',
    color: '#1CE783'
  },
  disney: {
    name: 'Disney+',
    domain: 'disneyplus.com',
    cancelUrl: 'https://www.disneyplus.com/account',
    color: '#113CCF'
  },
  hbo: {
    name: 'HBO Max',
    domain: 'max.com',
    cancelUrl: 'https://play.max.com/account',
    color: '#B535F6'
  },
  peacock: {
    name: 'Peacock',
    domain: 'peacocktv.com',
    cancelUrl: 'https://www.peacocktv.com/account',
    color: '#000000'
  },
  paramount: {
    name: 'Paramount+',
    domain: 'paramountplus.com',
    cancelUrl: 'https://www.paramountplus.com/account',
    color: '#0064FF'
  },
  amazon: {
    name: 'Prime Video',
    domain: 'amazon.com',
    cancelUrl: 'https://www.amazon.com/gp/primecentral',
    color: '#00A8E1'
  },
  spotify: {
    name: 'Spotify',
    domain: 'spotify.com',
    cancelUrl: 'https://www.spotify.com/account/subscription/',
    color: '#1DB954'
  },
  youtube: {
    name: 'YouTube Premium',
    domain: 'youtube.com',
    cancelUrl: 'https://www.youtube.com/paid_memberships',
    color: '#FF0000'
  }
};

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getServices') {
    sendResponse({ services: services });
  } else if (request.action === 'openCancelPage') {
    const service = services[request.service];
    if (service) {
      chrome.tabs.create({ url: service.cancelUrl });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Service not found' });
    }
  } else if (request.action === 'bulkCancel') {
    // Open all selected services' cancellation pages
    const selectedServices = request.services || [];
    selectedServices.forEach((serviceId, index) => {
      const service = services[serviceId];
      if (service) {
        // Stagger opening tabs to avoid overwhelming the browser
        setTimeout(() => {
          chrome.tabs.create({ url: service.cancelUrl });
        }, index * 2000); // 2 second delay between each
      }
    });
    sendResponse({ success: true, count: selectedServices.length });
  } else if (request.action === 'saveSubscriptions') {
    chrome.storage.local.set({
      subscriptions: request.subscriptions,
      lastUpdated: new Date().toISOString()
    }, () => {
      sendResponse({ success: true });
    });
  } else if (request.action === 'getSubscriptions') {
    chrome.storage.local.get(['subscriptions', 'lastUpdated'], (result) => {
      sendResponse({
        subscriptions: result.subscriptions || [],
        lastUpdated: result.lastUpdated
      });
    });
  } else if (request.action === 'trackCancellation') {
    // Track when a subscription is cancelled
    const timestamp = new Date().toISOString();
    chrome.storage.local.get(['cancellationHistory'], (result) => {
      const history = result.cancellationHistory || [];
      history.push({
        service: request.service,
        timestamp: timestamp
      });
      chrome.storage.local.set({ cancellationHistory: history }, () => {
        sendResponse({ success: true });
      });
    });
  }
  return true; // Keep message channel open for async response
});

// Create context menu for quick access
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'cancel-subscriptions',
    title: 'Manage Subscriptions',
    contexts: ['page']
  });

  // Create submenu for each service
  Object.entries(services).forEach(([id, service]) => {
    chrome.contextMenus.create({
      id: `cancel-${id}`,
      parentId: 'cancel-subscriptions',
      title: `Cancel ${service.name}`,
      contexts: ['page']
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('cancel-')) {
    const serviceId = info.menuItemId.replace('cancel-', '');
    const service = services[serviceId];
    if (service) {
      chrome.tabs.create({ url: service.cancelUrl });
    }
  }
});

// Function to check if tab is on a subscription service
function checkForSubscriptionService(tab) {
  const url = new URL(tab.url);
  for (const [id, service] of Object.entries(services)) {
    if (url.hostname.includes(service.domain)) {
      // Update badge to show service is detected
      chrome.action.setBadgeText({ text: '!', tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: service.color,
        tabId: tab.id
      });
      return true;
    }
  }
  // Clear badge if not on a service page
  chrome.action.setBadgeText({ text: '', tabId: tab.id });
  return false;
}

// Monitor tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkForSubscriptionService(tab);
  }
});

// Set up monthly reminder (optional)
chrome.alarms.create('monthlyReminder', {
  periodInMinutes: 43200 // 30 days
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'monthlyReminder') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Subscription Review Reminder',
      message: 'Time to review your streaming subscriptions!',
      buttons: [{ title: 'Review Now' }],
      priority: 2
    });
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    chrome.action.openPopup();
  }
});