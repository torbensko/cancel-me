// Enhanced background script for handling multi-step cancellation

// Cancel subscription with multi-step navigation support
async function cancelSubscriptionEnhanced(serviceId) {
  const service = services[serviceId];
  if (!service) return { success: false, error: 'Service not found' };

  console.log(`[Cancel] Starting cancellation for ${service.name}`);

  return new Promise((resolve) => {
    let cancellationTab = null;
    let cancellationStep = 0;
    let cancellationTimeout = null;

    // Store cancellation state
    chrome.storage.local.set({
      activeCancellation: {
        serviceId: serviceId,
        step: 0,
        startTime: new Date().toISOString()
      }
    });

    // Function to execute cancellation on current tab
    const executeCancellationStep = (tabId) => {
      chrome.tabs.sendMessage(tabId, { action: 'executeCancellation' }, (response) => {
        console.log('[Cancel] Step response:', response);

        if (chrome.runtime.lastError) {
          console.error('[Cancel] Error:', chrome.runtime.lastError);
          cleanup();
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        if (response && response.navigating) {
          // Page will navigate, wait for next page load
          console.log('[Cancel] Navigating to:', response.nextUrl);
          cancellationStep++;
          // Don't cleanup, wait for the page to load
        } else if (response && response.success) {
          // Cancellation completed
          console.log('[Cancel] Cancellation completed successfully');
          cleanup();

          // Track cancellation
          chrome.storage.local.get(['cancellationHistory'], (result) => {
            const history = result.cancellationHistory || [];
            history.push({
              service: service.name,
              serviceId: serviceId,
              timestamp: new Date().toISOString()
            });
            chrome.storage.local.set({ cancellationHistory: history });
          });

          resolve({ success: true, service: service.name });
        } else {
          // Error or no more steps
          console.log('[Cancel] Cancellation failed or incomplete');
          cleanup();
          resolve({ success: false, error: response?.error || 'Cancellation failed' });
        }
      });
    };

    // Cleanup function
    const cleanup = () => {
      if (cancellationTimeout) {
        clearTimeout(cancellationTimeout);
        cancellationTimeout = null;
      }
      chrome.storage.local.remove('activeCancellation');
      chrome.tabs.onUpdated.removeListener(tabUpdateListener);
    };

    // Tab update listener for navigation
    const tabUpdateListener = (tabId, changeInfo, tab) => {
      if (cancellationTab && tabId === cancellationTab.id && changeInfo.status === 'complete') {
        console.log('[Cancel] Page loaded, continuing cancellation at step', cancellationStep);

        // Reset timeout
        if (cancellationTimeout) clearTimeout(cancellationTimeout);
        cancellationTimeout = setTimeout(() => {
          console.log('[Cancel] Timeout waiting for cancellation');
          cleanup();
          resolve({ success: false, error: 'Cancellation timed out' });
        }, 60000);

        // Give page time to fully render
        setTimeout(() => {
          executeCancellationStep(tabId);
        }, 2000);
      }
    };

    // Register tab listener
    chrome.tabs.onUpdated.addListener(tabUpdateListener);

    // Create initial tab
    chrome.tabs.create({ url: service.accountUrl, active: true }, (tab) => {
      cancellationTab = tab;
      console.log('[Cancel] Tab created, waiting for load');

      // Set timeout for entire operation
      cancellationTimeout = setTimeout(() => {
        console.log('[Cancel] Overall timeout');
        cleanup();
        resolve({ success: false, error: 'Cancellation timed out' });
      }, 120000); // 2 minutes total timeout
    });
  });
}

// Check for incomplete cancellations on startup
async function checkIncompleteCancellations() {
  chrome.storage.local.get(['activeCancellation'], (result) => {
    if (result.activeCancellation) {
      const timeSinceStart = Date.now() - new Date(result.activeCancellation.startTime).getTime();

      if (timeSinceStart < 120000) { // Less than 2 minutes
        console.log('[Cancel] Found incomplete cancellation, attempting to resume...');
        // Could implement resume logic here if needed
      } else {
        // Clean up old cancellation state
        chrome.storage.local.remove('activeCancellation');
      }
    }
  });
}

// Export for use in main background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { cancelSubscriptionEnhanced, checkIncompleteCancellations };
}