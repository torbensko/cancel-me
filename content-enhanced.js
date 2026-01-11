// Enhanced content script with status detection and automated cancellation

const serviceConfigs = {
  'netflix.com': {
    name: 'Netflix',
    accountUrl: 'https://www.netflix.com/account',
    statusSelectors: {
      active: ['button[data-uia="cancel-membership-button"]', 'a[href*="cancelplan"]'],
      inactive: ['button[data-uia="restart-membership"]', 'a[href*="restart"]'],
      nextBilling: '[data-uia="nextBillingDate"]'
    },
    cancelSequence: [
      { selector: 'button[data-uia="cancel-membership-button"]', action: 'click' },
      { selector: 'button[data-uia="confirm-cancel"]', action: 'click', wait: 2000 },
      { selector: 'button:contains("Finish Cancellation")', action: 'click', wait: 1000 }
    ]
  },
  'hulu.com': {
    name: 'Hulu',
    accountUrl: 'https://secure.hulu.com/account',
    statusSelectors: {
      active: ['a[href*="/cancel"]', 'button:contains("Cancel")'],
      inactive: ['button:contains("Reactivate")', 'a:contains("Subscribe")'],
      nextBilling: '.next-charge-date'
    },
    cancelSequence: [
      { selector: 'a[href*="/cancel"]', action: 'click' },
      { selector: 'button:contains("Continue to Cancel")', action: 'click', wait: 2000 },
      { selector: 'select.cancel-reason', action: 'select', value: 'Too expensive', wait: 500 },
      { selector: 'button:contains("Cancel Subscription")', action: 'click', wait: 1000 }
    ]
  },
  'disneyplus.com': {
    name: 'Disney+',
    accountUrl: 'https://www.disneyplus.com/account',
    statusSelectors: {
      active: ['button[data-testid="cancel-button"]', 'button:contains("Cancel")'],
      inactive: ['button:contains("Resubscribe")', 'button:contains("Subscribe")'],
      nextBilling: '.billing-date'
    },
    cancelSequence: [
      { selector: 'button[data-testid="cancel-button"]', action: 'click' },
      { selector: 'button:contains("Continue Cancellation")', action: 'click', wait: 2000 },
      { selector: 'button:contains("Complete Cancellation")', action: 'click', wait: 1000 }
    ]
  },
  'max.com': {
    name: 'HBO Max',
    accountUrl: 'https://play.max.com/account',
    statusSelectors: {
      active: ['a[href*="cancel-subscription"]', 'button:contains("Cancel")'],
      inactive: ['button:contains("Reactivate")', 'a:contains("Subscribe")'],
      nextBilling: '.next-payment'
    },
    cancelSequence: [
      { selector: 'a[href*="cancel-subscription"]', action: 'click' },
      { selector: 'button:contains("Cancel Subscription")', action: 'click', wait: 2000 },
      { selector: 'button:contains("Confirm Cancellation")', action: 'click', wait: 1000 }
    ]
  },
  'peacocktv.com': {
    name: 'Peacock',
    accountUrl: 'https://www.peacocktv.com/account',
    statusSelectors: {
      active: ['button:contains("Cancel")', 'a[href*="/cancel"]'],
      inactive: ['button:contains("Upgrade")', 'a:contains("Subscribe")'],
      nextBilling: '.billing-cycle'
    },
    cancelSequence: [
      { selector: 'button:contains("Change Plan")', action: 'click' },
      { selector: 'button:contains("Cancel Subscription")', action: 'click', wait: 2000 },
      { selector: 'button:contains("Confirm")', action: 'click', wait: 1000 }
    ]
  },
  'paramountplus.com': {
    name: 'Paramount+',
    accountUrl: 'https://www.paramountplus.com/account',
    statusSelectors: {
      active: ['button:contains("Cancel")', '.cancel-link'],
      inactive: ['button:contains("Restart")', 'a:contains("Subscribe")'],
      nextBilling: '.next-charge'
    },
    cancelSequence: [
      { selector: '.cancel-link', action: 'click' },
      { selector: 'button:contains("Continue")', action: 'click', wait: 2000 },
      { selector: 'button:contains("Cancel Subscription")', action: 'click', wait: 1000 }
    ]
  },
  'amazon.com': {
    name: 'Prime Video',
    accountUrl: 'https://www.amazon.com/gp/primecentral',
    statusSelectors: {
      active: ['input[aria-label*="End membership"]', 'a:contains("End Membership")'],
      inactive: ['a:contains("Join Prime")', 'button:contains("Try Prime")'],
      nextBilling: '.next-payment-date'
    },
    cancelSequence: [
      { selector: 'a:contains("End Membership")', action: 'click' },
      { selector: 'input[aria-label*="End membership"]', action: 'click', wait: 2000 },
      { selector: 'input:contains("Continue")', action: 'click', wait: 1000 },
      { selector: 'button:contains("End")', action: 'click', wait: 1000 }
    ]
  },
  'spotify.com': {
    name: 'Spotify',
    accountUrl: 'https://www.spotify.com/account/subscription/',
    statusSelectors: {
      active: ['button:contains("CANCEL PREMIUM")', 'a:contains("Cancel")'],
      inactive: ['button:contains("GET PREMIUM")', 'a:contains("Upgrade")'],
      nextBilling: '.recurring-date'
    },
    cancelSequence: [
      { selector: 'button:contains("CANCEL PREMIUM")', action: 'click' },
      { selector: 'button:contains("YES, CANCEL")', action: 'click', wait: 2000 },
      { selector: 'button:contains("CONTINUE TO CANCEL")', action: 'click', wait: 1000 },
      { selector: 'button:contains("CANCEL SUBSCRIPTION")', action: 'click', wait: 1000 }
    ]
  },
  'youtube.com': {
    name: 'YouTube Premium',
    accountUrl: 'https://www.youtube.com/paid_memberships',
    statusSelectors: {
      active: ['button:contains("Cancel")', 'a:contains("Cancel membership")'],
      inactive: ['button:contains("Try it free")', 'a:contains("Get Premium")'],
      nextBilling: '.next-payment'
    },
    cancelSequence: [
      { selector: 'a:contains("Cancel membership")', action: 'click' },
      { selector: 'button:contains("Cancel membership")', action: 'click', wait: 2000 },
      { selector: 'button:contains("Yes, cancel")', action: 'click', wait: 1000 }
    ]
  }
};

// Detect which service we're on
function detectService() {
  const hostname = window.location.hostname;
  for (const [domain, config] of Object.entries(serviceConfigs)) {
    if (hostname.includes(domain)) {
      return { domain, ...config };
    }
  }
  return null;
}

// Check subscription status on current page
async function checkSubscriptionStatus() {
  const service = detectService();
  if (!service) return { status: 'unknown', service: null };

  let status = 'unknown';
  let nextBilling = null;

  // Check for active subscription indicators
  for (const selector of service.statusSelectors.active) {
    const element = document.querySelector(selector);
    if (element) {
      status = 'active';
      break;
    }
  }

  // Check for inactive subscription indicators
  if (status === 'unknown') {
    for (const selector of service.statusSelectors.inactive) {
      const element = document.querySelector(selector);
      if (element) {
        status = 'inactive';
        break;
      }
    }
  }

  // Try to get next billing date if active
  if (status === 'active' && service.statusSelectors.nextBilling) {
    const billingElement = document.querySelector(service.statusSelectors.nextBilling);
    if (billingElement) {
      nextBilling = billingElement.textContent.trim();
    }
  }

  return {
    service: service.name,
    domain: service.domain,
    status,
    nextBilling,
    checked: new Date().toISOString()
  };
}

// Wait for element with timeout
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(checkInterval);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(null);
      }
    }, 500);
  });
}

// Execute cancellation sequence
async function executeCancellation() {
  const service = detectService();
  if (!service || !service.cancelSequence) {
    return { success: false, error: 'Service not supported or no cancellation sequence defined' };
  }

  console.log(`Starting cancellation for ${service.name}`);

  for (const step of service.cancelSequence) {
    console.log(`Executing step: ${step.selector}`);

    // Wait for element
    const element = await waitForElement(step.selector, step.wait || 5000);

    if (!element) {
      console.log(`Element not found: ${step.selector}`);
      continue; // Skip to next step if element not found
    }

    // Execute action
    if (step.action === 'click') {
      element.click();
      console.log(`Clicked: ${step.selector}`);
    } else if (step.action === 'select' && step.value) {
      element.value = step.value;
      element.dispatchEvent(new Event('change'));
      console.log(`Selected ${step.value} in: ${step.selector}`);
    }

    // Wait if specified
    if (step.wait) {
      await new Promise(resolve => setTimeout(resolve, step.wait));
    }
  }

  return { success: true, service: service.name };
}

// Navigate to account page
async function navigateToAccount() {
  const service = detectService();
  if (!service) return { success: false, error: 'Service not detected' };

  if (window.location.href !== service.accountUrl) {
    window.location.href = service.accountUrl;
    return { success: true, navigating: true, url: service.accountUrl };
  }

  return { success: true, alreadyThere: true };
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkStatus') {
    checkSubscriptionStatus().then(sendResponse);
  } else if (request.action === 'navigateToAccount') {
    navigateToAccount().then(sendResponse);
  } else if (request.action === 'executeCancellation') {
    executeCancellation().then(sendResponse);
  } else if (request.action === 'detectService') {
    const service = detectService();
    sendResponse({ service });
  } else if (request.action === 'highlightCancelButton') {
    const service = detectService();
    if (service && service.cancelSequence[0]) {
      const element = document.querySelector(service.cancelSequence[0].selector);
      if (element) {
        element.style.border = '3px solid #ff0000';
        element.style.backgroundColor = '#ffeeee';
        element.style.animation = 'pulse 2s infinite';

        // Add animation styles
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

        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        sendResponse({ success: true, highlighted: true });
      } else {
        sendResponse({ success: false, error: 'Cancel button not found' });
      }
    } else {
      sendResponse({ success: false, error: 'Service not detected' });
    }
  }

  return true; // Keep channel open for async response
});