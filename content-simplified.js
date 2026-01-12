// Simplified content script using centralized service configuration

// Enable debug mode
const DEBUG_MODE = true;

function debugLog(message, data = null) {
  if (DEBUG_MODE) {
    console.log(`[Subscription Manager] ${message}`, data || '');
  }
}

// Load services configuration
// The config is already loaded via the manifest as a separate script
// Just reference the globals that services-config.js created
if (typeof window.servicesConfig === 'undefined') {
  debugLog('Waiting for config to load...');
  // If config hasn't loaded yet, wait a moment
  setTimeout(() => {
    if (typeof window.servicesConfig !== 'undefined') {
      debugLog('Config loaded:', Object.keys(window.servicesConfig).length + ' services');
    } else {
      debugLog('Warning: Config failed to load');
    }
  }, 100);
}

// Detect which service we're on
function detectService() {
  const hostname = window.location.hostname;
  debugLog('Detecting service for hostname:', hostname);

  // Use window.servicesConfig to avoid reference errors
  const config = window.servicesConfig || {};
  for (const [key, serviceConfig] of Object.entries(config)) {
    if (hostname.includes(serviceConfig.domain)) {
      debugLog('Service detected:', serviceConfig.name);
      return { key, ...serviceConfig };
    }
  }

  debugLog('No service detected for this domain');
  return null;
}

// Check if element exists using various selector types
async function findElement(selectors, timeout = 5000) {
  if (!Array.isArray(selectors)) {
    selectors = [selectors];
  }

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        let element = null;

        // Handle :contains() pseudo-selector
        if (selector.includes(':contains(')) {
          const match = selector.match(/(.*?):contains\(["']?([^"')]+)["']?\)/);
          if (match) {
            const [, baseSelector, text] = match;
            const elements = document.querySelectorAll(baseSelector || '*');
            element = Array.from(elements).find(el =>
              el.textContent && el.textContent.includes(text)
            );
          }
        } else {
          // Regular CSS selector
          element = document.querySelector(selector);
        }

        if (element) {
          debugLog(`Found element with selector: ${selector}`);
          return element;
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }

    // Wait a bit before trying again
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  debugLog('No element found for selectors:', selectors);
  return null;
}

// Check subscription status
async function checkSubscriptionStatus() {
  const service = detectService();
  if (!service) {
    return { status: 'unknown', error: 'Service not detected' };
  }

  debugLog(`Checking status for ${service.name}`);

  // Wait for page to stabilize
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Look for active subscription indicators
  if (service.active && service.active.indicators) {
    const activeElement = await findElement(service.active.indicators, 3000);
    if (activeElement) {
      debugLog('Found active subscription indicator');
      return {
        service: service.name,
        status: 'active',
        checked: new Date().toISOString()
      };
    }
  }

  // If no active indicators found, might be inactive or unknown
  debugLog('No active subscription indicators found');
  return {
    service: service.name,
    status: 'unknown',
    checked: new Date().toISOString()
  };
}

// Execute cancellation with simplified flow
async function executeCancellation() {
  const service = detectService();
  if (!service) {
    return { success: false, error: 'Service not detected' };
  }

  debugLog(`Starting cancellation for ${service.name}`);
  debugLog(`Current URL: ${window.location.href}`);

  // Check if we need to select a cancellation reason first
  if (service.cancellation?.reasonSelector || window.location.href.includes('/cancel')) {
    debugLog('Checking for cancellation reason form...');

    // Build list of reason selectors to try
    const reasonSelectors = [
      ...(service.cancellation?.reasonSelector ? [service.cancellation.reasonSelector] : []),
      ...(window.defaultReasonSelectors || [])
    ];

    // Try to find and select a reason
    for (const selector of reasonSelectors) {
      try {
        const reasonElement = await findElement([selector], 1000);
        if (reasonElement && (reasonElement.type === 'radio' || reasonElement.type === 'checkbox')) {
          debugLog(`Found reason selector: ${selector}`);
          reasonElement.checked = true;
          reasonElement.click(); // Trigger any change events
          debugLog('Selected cancellation reason');

          // Small delay to let form update
          await new Promise(resolve => setTimeout(resolve, 500));
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
  }

  // Build list of selectors to try
  // Service-specific first, then defaults
  const selectorsToTry = [
    ...(service.cancellation?.selectors || []),
    ...(window.defaultCancelSelectors || [])
  ];

  debugLog(`Will try ${selectorsToTry.length} selectors`);

  // Try to find and click a cancellation-related button
  const element = await findElement(selectorsToTry, 5000);

  if (element) {
    debugLog(`Found cancellation element: ${element.textContent?.substring(0, 50)}`);

    try {
      // Scroll to element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight it
      element.style.border = '3px solid #ff0000';
      element.style.backgroundColor = '#ffeeee';

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click it
      element.click();
      debugLog('Clicked cancellation element');

      // Check if we navigated
      const urlBefore = window.location.href;
      await new Promise(resolve => setTimeout(resolve, 2000));
      const urlAfter = window.location.href;

      if (urlBefore !== urlAfter) {
        debugLog('Page navigated after click');
        return { success: true, navigating: true };
      }

      return { success: true, message: 'Clicked cancellation button' };
    } catch (error) {
      debugLog('Error clicking element:', error);
      return { success: false, error: error.message };
    }
  }

  // No cancellation element found
  // Check if we might be done (on a confirmation page)
  if (window.location.href.includes('confirm') ||
      window.location.href.includes('success') ||
      window.location.href.includes('complete')) {
    debugLog('Appears to be on confirmation page');
    return { success: true, message: 'Cancellation may be complete' };
  }

  return { success: false, error: 'No cancellation button found' };
}

// Navigate to cancellation start page
async function navigateToCancellation() {
  const service = detectService();
  if (!service || !service.cancellation?.startUrl) {
    return { success: false, error: 'No cancellation URL configured' };
  }

  if (window.location.href !== service.cancellation.startUrl) {
    debugLog(`Navigating to cancellation page: ${service.cancellation.startUrl}`);
    window.location.href = service.cancellation.startUrl;
    return { success: true, navigating: true };
  }

  return { success: true, alreadyThere: true };
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('Received message:', request.action);

  (async () => {
    try {
      if (request.action === 'checkStatus') {
        const result = await checkSubscriptionStatus();
        sendResponse(result);
      } else if (request.action === 'executeCancellation') {
        const result = await executeCancellation();
        sendResponse(result);
      } else if (request.action === 'navigateToCancellation') {
        const result = await navigateToCancellation();
        sendResponse(result);
      } else if (request.action === 'detectService') {
        const service = detectService();
        sendResponse({ service });
      } else if (request.action === 'injectConfig') {
        // Receive config from background script
        servicesConfig = request.servicesConfig;
        defaultCancelSelectors = request.defaultCancelSelectors;
        sendResponse({ success: true });
      } else {
        sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      debugLog('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // Async response
});

// Log when script loads
debugLog('Content script loaded on:', window.location.href);