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

// Enhanced element finding with Shadow DOM and attribute search support
async function findElement(selectors, timeout = 5000) {
  if (!Array.isArray(selectors)) {
    selectors = [selectors];
  }

  const startTime = Date.now();

  // For Apple TV+, use a longer timeout and special handling
  const service = detectService();
  if (service && service.key === 'appletv') {
    timeout = Math.max(timeout, 10000); // Minimum 10 seconds for Apple TV+
    debugLog('Using extended timeout for Apple TV+');
  }

  // Helper to search in Shadow DOM
  function searchInShadowDOM(selector, root = document) {
    // First try regular query
    let element = root.querySelector(selector);
    if (element) return element;

    // Search through all elements that might have shadow roots
    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        element = searchInShadowDOM(selector, el.shadowRoot);
        if (element) return element;
      }
    }
    return null;
  }

  // Helper for attribute-based search (more robust for dynamic content)
  function findByAttribute(attrName, attrValue, tagName = '*') {
    // Try exact match first
    const exactMatch = document.querySelector(`${tagName}[${attrName}="${attrValue}"]`);
    if (exactMatch) return exactMatch;

    // Try manual attribute search (works even when querySelector fails)
    const elements = document.getElementsByTagName(tagName);
    for (let el of elements) {
      if (el.getAttribute(attrName) === attrValue) {
        debugLog(`Found element via getAttribute: ${attrName}="${attrValue}"`);
        return el;
      }
    }

    // Search in Shadow DOM
    const shadowHosts = document.querySelectorAll('*');
    for (const host of shadowHosts) {
      if (host.shadowRoot) {
        const shadowElements = host.shadowRoot.querySelectorAll(tagName);
        for (let el of shadowElements) {
          if (el.getAttribute(attrName) === attrValue) {
            debugLog(`Found element in Shadow DOM: ${attrName}="${attrValue}"`);
            return el;
          }
        }
      }
    }

    return null;
  }

  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        let element = null;

        // Special handling for data-test attributes (Apple TV+ case)
        if (selector.includes('[data-test=') || selector.includes('[data-test^=')) {
          const match = selector.match(/(\w+)?\[data-test[\^]?="?([^"\]]+)"?\]/);
          if (match) {
            const [, tagName, attrValue] = match;
            debugLog(`Searching for data-test="${attrValue}" in ${tagName || '*'} elements`);
            element = findByAttribute('data-test', attrValue, tagName || '*');
          }
        }

        // Handle :contains() pseudo-selector
        else if (selector.includes(':contains(')) {
          const match = selector.match(/(.*?):contains\(["']?([^"')]+)["']?\)/);
          if (match) {
            const [, baseSelector, text] = match;
            const elements = document.querySelectorAll(baseSelector || '*');
            // Find ALL matching elements, then take the last one
            // This helps with modals which are typically appended later in DOM
            const matchingElements = Array.from(elements).filter(el => {
              // Normalize whitespace for better matching
              const normalizedText = el.textContent?.replace(/\s+/g, ' ').trim();
              return normalizedText && normalizedText.includes(text);
            });
            // Take the last matching element (likely the modal button)
            element = matchingElements.length > 0 ? matchingElements[matchingElements.length - 1] : null;

            if (element && matchingElements.length > 1) {
              debugLog(`Found ${matchingElements.length} matching elements for "${text}", using the last one`);
            }

            // Also check Shadow DOM for text content
            if (!element) {
              const shadowHosts = document.querySelectorAll('*');
              let shadowMatches = [];
              for (const host of shadowHosts) {
                if (host.shadowRoot) {
                  const shadowElements = host.shadowRoot.querySelectorAll(baseSelector || '*');
                  const matches = Array.from(shadowElements).filter(el => {
                    const normalizedText = el.textContent?.replace(/\s+/g, ' ').trim();
                    return normalizedText && normalizedText.includes(text);
                  });
                  shadowMatches = shadowMatches.concat(matches);
                }
              }
              // Take the last shadow DOM match if any found
              if (shadowMatches.length > 0) {
                element = shadowMatches[shadowMatches.length - 1];
                if (shadowMatches.length > 1) {
                  debugLog(`Found ${shadowMatches.length} Shadow DOM elements for "${text}", using the last one`);
                }
              }
            }
          }
        }

        // Try regular selector with Shadow DOM support
        else {
          element = searchInShadowDOM(selector);
        }

        // Check in iframes as last resort
        if (!element) {
          const iframes = document.querySelectorAll('iframe');
          for (const iframe of iframes) {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (iframeDoc) {
                element = iframeDoc.querySelector(selector);
                if (element) {
                  debugLog(`Found element in iframe: ${selector}`);
                  break;
                }
              }
            } catch (e) {
              // Cross-origin iframe, skip
            }
          }
        }

        if (element) {
          debugLog(`Found element with selector: ${selector}`);
          return element;
        }
      } catch (e) {
        debugLog(`Selector error for "${selector}": ${e.message}`);
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

  // Check for inactive indicators first (takes priority)
  if (service.active && service.active.presentWhenInactive) {
    const inactiveElement = await findElement([service.active.presentWhenInactive], 3000);
    if (inactiveElement) {
      debugLog('Found inactive subscription indicator');
      return {
        service: service.name,
        status: 'inactive',
        checked: new Date().toISOString()
      };
    }
  }

  // Look for active subscription indicators
  if (service.active && service.active.presentWhenActive) {
    const activeElement = await findElement([service.active.presentWhenActive], 3000);
    if (activeElement) {
      debugLog('Found active subscription indicator');
      return {
        service: service.name,
        status: 'active',
        checked: new Date().toISOString()
      };
    }
  }

  // If no indicators found, might be inactive or unknown
  debugLog('No subscription indicators found');
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

  // Only check for reason forms if the service explicitly defines a reasonSelector
  if (service.cancellation?.reasonSelector) {
    debugLog('Service has explicit reason selector, checking for form...');

    const reasonSelectors = [service.cancellation.reasonSelector];

    // Try to find and select a reason
    let reasonSelected = false;
    for (const selector of reasonSelectors) {
      try {
        const reasonElement = await findElement([selector], 500); // Quick check for existence
        if (reasonElement && (reasonElement.type === 'radio' || reasonElement.type === 'checkbox')) {
          debugLog(`Found reason form with selector: ${selector}`);

          // Only select if not already selected
          if (!reasonElement.checked) {
            reasonElement.checked = true;
            reasonElement.click(); // Trigger any change events
            debugLog('Selected cancellation reason');
            reasonSelected = true;

            // Use service-specific delay or default to 1000ms
            const delay = service.cancellation?.reasonDelay || 1000;
            debugLog(`Waiting ${delay}ms for form to update...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            debugLog('Reason already selected');
          }
          break;
        }
      } catch (e) {
        // Element doesn't exist, continue
      }
    }

    if (reasonSelected) {
      debugLog('Reason selected, proceeding to find action buttons');
    }
  } else {
    debugLog('No explicit reason selector defined, proceeding directly to action buttons');
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

      // Check if we navigated or if a modal appeared (Apple TV+ uses modals)
      const urlBefore = window.location.href;

      // For Apple TV+, wait longer for modals to appear
      const waitTime = service && service.key === 'appletv' ? 3000 : 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));

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