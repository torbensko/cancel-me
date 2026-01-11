// Content script that runs on streaming service pages
// Detects subscription management pages and assists with navigation

const serviceConfigs = {
  'netflix.com': {
    name: 'Netflix',
    accountUrl: 'https://www.netflix.com/account',
    cancelPath: '/account',
    cancelSelectors: [
      'button[data-uia="cancel-membership-button"]',
      'a[href*="cancelplan"]',
      '.cancel-membership'
    ]
  },
  'hulu.com': {
    name: 'Hulu',
    accountUrl: 'https://secure.hulu.com/account',
    cancelPath: '/account/cancel',
    cancelSelectors: [
      'button[aria-label*="Cancel"]',
      'a[href*="/cancel"]',
      '.cancel-subscription'
    ]
  },
  'disneyplus.com': {
    name: 'Disney+',
    accountUrl: 'https://www.disneyplus.com/account',
    cancelPath: '/account/subscription',
    cancelSelectors: [
      'button[data-testid="cancel-button"]',
      'a[href*="cancel"]'
    ]
  },
  'max.com': {
    name: 'HBO Max',
    accountUrl: 'https://play.max.com/account',
    cancelPath: '/account/subscription',
    cancelSelectors: [
      'button[aria-label*="Cancel"]',
      'a[href*="cancel-subscription"]'
    ]
  },
  'peacocktv.com': {
    name: 'Peacock',
    accountUrl: 'https://www.peacocktv.com/account',
    cancelPath: '/account/plans',
    cancelSelectors: [
      'button[data-testid="cancel-button"]',
      'a[href*="cancel"]'
    ]
  },
  'paramountplus.com': {
    name: 'Paramount+',
    accountUrl: 'https://www.paramountplus.com/account',
    cancelPath: '/account/subscription',
    cancelSelectors: [
      'button[aria-label*="Cancel"]',
      '.cancel-link'
    ]
  },
  'amazon.com': {
    name: 'Prime Video',
    accountUrl: 'https://www.amazon.com/gp/primecentral',
    cancelPath: '/gp/primecentral',
    cancelSelectors: [
      'a[href*="prime/pipeline/membersignup"]',
      'input[aria-label*="End membership"]'
    ]
  },
  'spotify.com': {
    name: 'Spotify',
    accountUrl: 'https://www.spotify.com/account/subscription/',
    cancelPath: '/account/subscription/cancel',
    cancelSelectors: [
      'button[data-testid="cancel-button"]',
      'a[href*="cancel"]'
    ]
  },
  'youtube.com': {
    name: 'YouTube Premium',
    accountUrl: 'https://www.youtube.com/paid_memberships',
    cancelPath: '/paid_memberships',
    cancelSelectors: [
      'button[aria-label*="Cancel"]',
      'a[href*="cancel"]'
    ]
  }
};

// Detect which service we're on
function detectService() {
  const hostname = window.location.hostname;
  for (const [domain, config] of Object.entries(serviceConfigs)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }
  return null;
}

// Highlight cancellation options on the page
function highlightCancellationOptions() {
  const service = detectService();
  if (!service) return;

  service.cancelSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      // Add visual highlight
      element.style.border = '3px solid #ff0000';
      element.style.backgroundColor = '#ffeeee';
      element.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';

      // Add tooltip
      element.title = 'Subscription cancellation option detected';
    });
  });
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectService') {
    const service = detectService();
    sendResponse({ service: service });
  } else if (request.action === 'navigateToCancel') {
    const service = detectService();
    if (service) {
      window.location.href = service.accountUrl;
    }
    sendResponse({ success: true });
  } else if (request.action === 'highlightOptions') {
    highlightCancellationOptions();
    sendResponse({ success: true });
  } else if (request.action === 'findCancelButton') {
    const service = detectService();
    if (service) {
      for (const selector of service.cancelSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Scroll to element
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight it
          element.style.border = '5px solid #ff0000';
          element.style.animation = 'pulse 2s infinite';

          // Add CSS animation
          if (!document.getElementById('cancel-helper-styles')) {
            const style = document.createElement('style');
            style.id = 'cancel-helper-styles';
            style.textContent = `
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
              }
            `;
            document.head.appendChild(style);
          }

          sendResponse({ found: true, selector: selector });
          return;
        }
      }
    }
    sendResponse({ found: false });
  }
  return true; // Keep message channel open for async response
});

// Auto-detect when on a subscription page
if (window.location.href.includes('account') ||
    window.location.href.includes('subscription') ||
    window.location.href.includes('membership')) {
  setTimeout(() => {
    highlightCancellationOptions();
  }, 2000); // Wait for page to fully load
}