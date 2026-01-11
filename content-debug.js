// Enhanced content script with debugging capabilities

// Enable debug mode - set to true to see console logs
const DEBUG_MODE = true;

function debugLog(message, data = null) {
  if (DEBUG_MODE) {
    console.log(`[Subscription Manager] ${message}`, data || '');
  }
}

const serviceConfigs = {
  'netflix.com': {
    name: 'Netflix',
    accountUrl: 'https://www.netflix.com/account',
    membershipUrl: 'https://www.netflix.com/account/membership',
    statusSelectors: {
      active: [
        'button[data-uia="cancel-button"]',
        'button[data-cl-view="cancelMembership"]',
        'button[data-uia="cancel-membership-button"]',
        'a[href*="cancelplan"]',
        'button:contains("Cancel membership")',
        'button:contains("Cancel Membership")',
        '[data-uia="account-overview"] button:contains("Cancel")',
        'a:contains("Cancel Membership")',
        'a:contains("Manage membership")',
        '.account-section-memberbilling',
        '[data-uia="plan-label"]',
        '.planPrice'
      ],
      inactive: [
        'button[data-uia="restart-membership"]',
        'a[href*="restart"]',
        'button:contains("Restart Membership")',
        'a:contains("Restart Your Membership")',
        '.account-section-membership-restart'
      ],
      nextBilling: [
        '[data-uia="nextBillingDate"]',
        '.account-section-memberbilling-nextbilling',
        'div:contains("Next billing date")',
        'span:contains("Next billing")'
      ]
    },
    cancelSequence: [
      // Netflix cancellation is split across pages - handle based on current URL
      {
        pagePattern: '/account/membership',
        selector: 'button[data-uia="cancel-button"], button[data-cl-view="cancelMembership"], button:contains("Cancel membership")',
        action: 'click',
        wait: 2000,
        description: 'Click cancel on membership page'
      },
      {
        pagePattern: '/cancelplan',
        selector: 'button[data-uia="action-finish-cancellation"], button[data-uia="finish-cancellation"], button:contains("Finish cancellation"), button:contains("Finish Cancellation")',
        action: 'click',
        wait: 2000,
        description: 'Click finish on cancel plan page'
      },
      // Handle any additional confirmation if needed
      {
        selector: 'button[data-uia="confirm-cancel"], button:contains("Complete"), button:contains("Confirm")',
        action: 'click',
        optional: true,
        wait: 1000,
        description: 'Confirm cancellation'
      }
    ]
  },
  'hulu.com': {
    name: 'Hulu',
    accountUrl: 'https://secure.hulu.com/account',
    statusSelectors: {
      active: [
        'a[href*="/cancel"]',
        'button:contains("Cancel")',
        'span:contains("Your Next Charge")',
        '.subscription-info'
      ],
      inactive: [
        'button:contains("Reactivate")',
        'a:contains("Subscribe")',
        'button:contains("Start Your Free Trial")'
      ],
      nextBilling: [
        '.next-charge-date',
        'span:contains("Next charge")'
      ]
    },
    cancelSequence: [
      { selector: 'a[href*="/cancel"]', action: 'click' },
      { selector: 'button:contains("Continue to Cancel")', action: 'click', wait: 2000 },
      { selector: 'button:contains("Cancel Subscription")', action: 'click', wait: 1000 }
    ]
  },
  'disneyplus.com': {
    name: 'Disney+',
    accountUrl: 'https://www.disneyplus.com/account',
    statusSelectors: {
      active: [
        'button[data-testid="cancel-button"]',
        'button:contains("Cancel")',
        '[data-testid="subscription-details"]',
        'div:contains("Billing Period")'
      ],
      inactive: [
        'button:contains("Resubscribe")',
        'button:contains("Subscribe")',
        'a:contains("Sign up now")'
      ],
      nextBilling: [
        '.billing-date',
        '[data-testid="next-billing-date"]'
      ]
    },
    cancelSequence: [
      { selector: 'button[data-testid="cancel-button"]', action: 'click' },
      { selector: 'button:contains("Continue Cancellation")', action: 'click', wait: 2000 },
      { selector: 'button:contains("Complete Cancellation")', action: 'click', wait: 1000 }
    ]
  }
  // ... other services remain the same
};

// Detect which service we're on
function detectService() {
  const hostname = window.location.hostname;
  debugLog('Detecting service for hostname:', hostname);

  for (const [domain, config] of Object.entries(serviceConfigs)) {
    if (hostname.includes(domain)) {
      debugLog('Service detected:', config.name);
      return { domain, ...config };
    }
  }

  debugLog('No service detected for this domain');
  return null;
}

// Enhanced status checking with detailed debugging
async function checkSubscriptionStatus() {
  debugLog('Starting subscription status check');
  debugLog('Current URL:', window.location.href);
  debugLog('Page title:', document.title);

  const service = detectService();
  if (!service) {
    debugLog('No service configuration found');
    return { status: 'unknown', service: null, error: 'Service not detected' };
  }

  let status = 'unknown';
  let nextBilling = null;
  let foundElements = [];
  let missingElements = [];

  // Wait a bit for page to fully load
  await new Promise(resolve => setTimeout(resolve, 2000));

  debugLog('Checking for active subscription indicators...');

  // Check for active subscription indicators
  for (const selector of service.statusSelectors.active) {
    try {
      // Try different selector methods
      let elements = [];

      if (selector.includes(':contains(')) {
        // Handle jQuery-style contains selector
        const searchText = selector.match(/:contains\("([^"]+)"\)/)?.[1];
        if (searchText) {
          const allElements = document.querySelectorAll('*');
          elements = Array.from(allElements).filter(el =>
            el.textContent.includes(searchText) &&
            el.children.length === 0 // Only leaf nodes
          );
          debugLog(`Contains selector "${searchText}" found ${elements.length} matches`);
        }
      } else {
        // Regular CSS selector
        elements = document.querySelectorAll(selector);
        debugLog(`Selector "${selector}" found ${elements.length} matches`);
      }

      if (elements.length > 0) {
        status = 'active';
        foundElements.push({
          selector,
          count: elements.length,
          text: elements[0].textContent?.substring(0, 50)
        });
        debugLog(`✓ Found active indicator with selector: ${selector}`, elements[0]);
        break;
      } else {
        missingElements.push(selector);
      }
    } catch (error) {
      debugLog(`Error with selector "${selector}":`, error);
      missingElements.push(selector);
    }
  }

  // Check for inactive subscription indicators if still unknown
  if (status === 'unknown') {
    debugLog('Checking for inactive subscription indicators...');

    for (const selector of service.statusSelectors.inactive) {
      try {
        let elements = [];

        if (selector.includes(':contains(')) {
          const searchText = selector.match(/:contains\("([^"]+)"\)/)?.[1];
          if (searchText) {
            const allElements = document.querySelectorAll('*');
            elements = Array.from(allElements).filter(el =>
              el.textContent.includes(searchText) &&
              el.children.length === 0
            );
          }
        } else {
          elements = document.querySelectorAll(selector);
        }

        if (elements.length > 0) {
          status = 'inactive';
          foundElements.push({
            selector,
            count: elements.length,
            text: elements[0].textContent?.substring(0, 50)
          });
          debugLog(`✓ Found inactive indicator with selector: ${selector}`, elements[0]);
          break;
        } else {
          missingElements.push(selector);
        }
      } catch (error) {
        debugLog(`Error with selector "${selector}":`, error);
      }
    }
  }

  // Try to get next billing date if active
  if (status === 'active' && service.statusSelectors.nextBilling) {
    debugLog('Looking for billing information...');

    for (const selector of service.statusSelectors.nextBilling) {
      try {
        let elements = [];

        if (selector.includes(':contains(')) {
          const searchText = selector.match(/:contains\("([^"]+)"\)/)?.[1];
          if (searchText) {
            const allElements = document.querySelectorAll('*');
            elements = Array.from(allElements).filter(el =>
              el.textContent.includes(searchText)
            );
          }
        } else {
          elements = document.querySelectorAll(selector);
        }

        if (elements.length > 0) {
          nextBilling = elements[0].textContent.trim();
          debugLog(`✓ Found billing info: ${nextBilling}`);
          break;
        }
      } catch (error) {
        debugLog(`Error getting billing info with selector "${selector}":`, error);
      }
    }
  }

  // Log page analysis for debugging
  if (DEBUG_MODE && status === 'unknown') {
    debugLog('Status unknown - analyzing page content...');

    // Look for any text that might indicate subscription status
    const pageText = document.body.innerText.toLowerCase();
    const activeKeywords = ['cancel', 'membership', 'subscription', 'billing', 'plan', 'next payment'];
    const inactiveKeywords = ['restart', 'rejoin', 'subscribe', 'free trial', 'get started'];

    debugLog('Page contains active keywords:', activeKeywords.filter(kw => pageText.includes(kw)));
    debugLog('Page contains inactive keywords:', inactiveKeywords.filter(kw => pageText.includes(kw)));

    // Log all buttons and links for manual inspection
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t);
    const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim()).filter(t => t && t.length < 50);

    debugLog('All buttons on page:', buttons);
    debugLog('Key links on page:', links.slice(0, 20));
  }

  const result = {
    service: service.name,
    domain: service.domain,
    status,
    nextBilling,
    checked: new Date().toISOString(),
    debug: {
      url: window.location.href,
      foundElements,
      missingElements,
      pageTitle: document.title
    }
  };

  debugLog('Final status check result:', result);
  return result;
}

// Wait for element with timeout and debugging
function waitForElement(selector, timeout = 10000) {
  debugLog(`Waiting for element: ${selector}`);

  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      let element = null;

      try {
        if (selector.includes(':contains(')) {
          const searchText = selector.match(/:contains\("([^"]+)"\)/)?.[1];
          if (searchText) {
            const allElements = document.querySelectorAll('*');
            const found = Array.from(allElements).find(el =>
              el.textContent.includes(searchText) &&
              el.children.length === 0
            );
            element = found;
          }
        } else {
          element = document.querySelector(selector);
        }
      } catch (error) {
        debugLog(`Error finding element: ${error}`);
      }

      if (element) {
        debugLog(`✓ Element found: ${selector}`);
        clearInterval(checkInterval);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        debugLog(`✗ Element not found (timeout): ${selector}`);
        clearInterval(checkInterval);
        resolve(null);
      }
    }, 500);
  });
}

// Execute cancellation sequence with debugging
async function executeCancellation() {
  const service = detectService();
  if (!service || !service.cancelSequence) {
    debugLog('No cancellation sequence available');
    return { success: false, error: 'Service not supported or no cancellation sequence defined' };
  }

  debugLog(`Starting cancellation for ${service.name}`);
  debugLog(`Current URL: ${window.location.href}`);

  let stepExecuted = false;

  for (const step of service.cancelSequence) {
    // Skip steps that don't match current page pattern
    if (step.pagePattern) {
      if (!window.location.href.includes(step.pagePattern)) {
        debugLog(`Skipping step (not on ${step.pagePattern}):`, step.description || step.selector);
        continue;
      }
      debugLog(`Page pattern matched (${step.pagePattern}), executing step:`, step.description || step.selector);
    }

    debugLog(`Executing step:`, step);

    // Handle navigation action
    if (step.action === 'navigate' && step.url) {
      debugLog(`Navigating to: ${step.url}`);
      if (window.location.href !== step.url) {
        window.location.href = step.url;
        // Navigation will reload the page, so return here
        return { success: true, navigating: true, nextUrl: step.url };
      }
      debugLog('Already on target URL, continuing...');
      continue;
    }

    // Handle element-based actions
    if (step.selector) {
      const element = await waitForElement(step.selector, step.wait || 5000);

      if (!element && step.optional) {
        debugLog(`Optional element not found, skipping: ${step.selector}`);
        continue;
      }

      if (!element) {
        debugLog(`Element not found: ${step.selector}`);
        continue;
      }

      if (step.action === 'click') {
        // Force click if specified (for hidden/collapsed elements)
        if (step.forceClick) {
          debugLog(`Force clicking (may be hidden): ${step.selector}`);
          try {
            // Try regular click first
            element.click();
          } catch (e) {
            // If regular click fails, try programmatic click
            debugLog('Regular click failed, trying programmatic click');
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            element.dispatchEvent(clickEvent);
          }
        } else {
          element.click();
        }
        debugLog(`✓ Clicked: ${step.selector}`);
        stepExecuted = true;
      } else if (step.action === 'select' && step.value) {
        element.value = step.value;
        element.dispatchEvent(new Event('change'));
        debugLog(`✓ Selected ${step.value} in: ${step.selector}`);
        stepExecuted = true;
      }
    }

    if (step.wait) {
      debugLog(`Waiting ${step.wait}ms before next step...`);
      await new Promise(resolve => setTimeout(resolve, step.wait));
    }
  }

  // Check if we executed any steps or if we're done
  if (!stepExecuted) {
    debugLog('No steps executed on this page - cancellation may be complete or on wrong page');
    // If we're on /cancelplan and no steps executed, we might be done
    if (window.location.href.includes('/cancelplan') || window.location.href.includes('/account')) {
      return { success: true, service: service.name, message: 'Cancellation process completed' };
    }
    return { success: false, error: 'No applicable steps found for current page' };
  }

  return { success: true, service: service.name };
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('Received message:', request.action);

  if (request.action === 'checkStatus') {
    checkSubscriptionStatus().then(sendResponse);
  } else if (request.action === 'executeCancellation') {
    executeCancellation().then(sendResponse);
  } else if (request.action === 'detectService') {
    const service = detectService();
    sendResponse({ service });
  } else if (request.action === 'getDebugInfo') {
    // Return current page debug information
    const debugInfo = {
      url: window.location.href,
      title: document.title,
      bodyText: document.body.innerText.substring(0, 500),
      buttons: Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        classes: b.className,
        dataAttributes: Object.keys(b.dataset)
      })).filter(b => b.text),
      links: Array.from(document.querySelectorAll('a[href*="account"], a[href*="cancel"], a[href*="subscription"]')).map(a => ({
        text: a.textContent.trim(),
        href: a.href
      }))
    };
    sendResponse(debugInfo);
  }

  return true;
});

// Log when script loads
debugLog('Content script loaded on:', window.location.href);