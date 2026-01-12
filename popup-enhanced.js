// Enhanced popup script with status checking and cancellation

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize icons
  initializeIcons();

  loadServices();
  loadLastCheckTime();
  setupEventHandlers();
});

// Initialize icon placeholders with SVGs
function initializeIcons() {
  if (window.appIcons) {
    // Settings icon
    const settingsIcon = document.querySelector('.icon-settings');
    if (settingsIcon) {
      settingsIcon.innerHTML = window.appIcons.settings;
    }
  }
}

// Load services and their statuses
async function loadServices() {
  // Get services and statuses from storage
  chrome.runtime.sendMessage({ action: 'getServices' }, (response) => {
    const services = response.services;

    chrome.runtime.sendMessage({ action: 'getStatuses' }, (statusResponse) => {
      const statuses = statusResponse.statuses || {};
      const container = document.getElementById('servicesList');
      container.innerHTML = '';

      let hasActiveServices = false;

      // Sort services by name
      const sortedServices = Object.entries(services)
        .filter(([_, service]) => service.enabled)
        .sort((a, b) => a[1].name.localeCompare(b[1].name));

      if (sortedServices.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>No services enabled</p>
            <p>Click the settings icon to manage services</p>
          </div>
        `;
        return;
      }

      sortedServices.forEach(([id, service]) => {
        const status = statuses[id] || { status: 'unknown' };
        const serviceEl = createServiceElement(id, service, status);
        container.appendChild(serviceEl);

        if (status.status === 'active') {
          hasActiveServices = true;
        }
      });

      // Show/hide cancel all button
      const cancelAllBtn = document.getElementById('cancelAllActiveBtn');
      cancelAllBtn.style.display = hasActiveServices ? 'block' : 'none';
    });
  });
}

// Create service element
function createServiceElement(id, service, status) {
  const div = document.createElement('div');
  div.className = 'service-item';
  div.id = `service-${id}`;

  const statusClass = `status-${status.status || 'unknown'}`;
  const statusText = formatStatus(status.status);
  const logoClass = `service-${id}`;

  let billingInfo = '';
  if (status.nextBilling && status.status === 'active') {
    billingInfo = `<span class="next-billing">Next: ${status.nextBilling}</span>`;
  }

  const externalIcon = window.appIcons ? window.appIcons.externalLink : '';
  const refreshIcon = window.appIcons ? window.appIcons.refreshCw : '';
  const cancelIcon = window.appIcons ? window.appIcons.xCircle : '';

  div.innerHTML = `
    <div class="service-logo ${logoClass}">${service.name.substring(0, 2).toUpperCase()}</div>
    <div class="service-info">
      <div class="service-name">${service.name}</div>
      <div class="service-status">
        <span class="status-badge ${statusClass}">${statusText}</span>
        ${billingInfo}
      </div>
    </div>
    <div class="service-actions">
      <button class="btn-action btn-account" data-service="${id}" data-url="${service.active?.checkUrl || ''}" title="View Account">
        ${externalIcon}
      </button>
      <button class="btn-action btn-check" data-service="${id}" title="Check Status">
        ${refreshIcon}
      </button>
      ${status.status === 'active' ? `
        <button class="btn-action btn-cancel" data-service="${id}" title="Cancel Subscription">
          ${cancelIcon}
          <span>Cancel</span>
        </button>
      ` : ''}
    </div>
  `;

  // Add event listeners
  const accountBtn = div.querySelector('.btn-account');
  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      const url = accountBtn.dataset.url;
      if (url) {
        chrome.tabs.create({ url: url, active: true });
      }
    });
  }

  const checkBtn = div.querySelector('.btn-check');
  if (checkBtn) {
    checkBtn.addEventListener('click', () => checkServiceStatus(id));
  }

  const cancelBtn = div.querySelector('.btn-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => showCancelConfirmation(id, service.name));
  }

  return div;
}

// Format status text
function formatStatus(status) {
  switch (status) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'checking': return 'Checking...';
    case 'error': return 'Error';
    case 'timeout': return 'Timeout';
    default: return 'Not Checked';
  }
}

// Load last check time
function loadLastCheckTime() {
  chrome.runtime.sendMessage({ action: 'getStatuses' }, (response) => {
    const lastCheckEl = document.getElementById('lastCheck');
    if (response.lastCheck) {
      const date = new Date(response.lastCheck);
      const timeAgo = getTimeAgo(date);
      lastCheckEl.textContent = `Last check: ${timeAgo}`;
    } else {
      lastCheckEl.textContent = 'Never checked';
    }
  });
}

// Get time ago string
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Check status of a single service
async function checkServiceStatus(serviceId) {
  const serviceEl = document.getElementById(`service-${serviceId}`);
  const statusBadge = serviceEl.querySelector('.status-badge');
  const originalText = statusBadge.textContent;

  statusBadge.textContent = 'Checking...';
  statusBadge.className = 'status-badge status-checking';

  chrome.runtime.sendMessage({
    action: 'checkStatus',
    serviceId: serviceId
  }, (response) => {
    if (response) {
      // Store debug info if present
      if (response.debug) {
        chrome.storage.local.get(['subscriptionStatuses'], (result) => {
          const statuses = result.subscriptionStatuses || {};
          statuses[serviceId] = response;
          chrome.storage.local.set({ subscriptionStatuses: statuses });
        });
      }

      // Update UI
      const newStatusClass = `status-${response.status || 'unknown'}`;
      statusBadge.className = `status-badge ${newStatusClass}`;
      statusBadge.textContent = formatStatus(response.status);

      // Update billing info if present
      const billingEl = serviceEl.querySelector('.next-billing');
      if (response.nextBilling && response.status === 'active') {
        if (billingEl) {
          billingEl.textContent = `Next: ${response.nextBilling}`;
        } else {
          statusBadge.insertAdjacentHTML('afterend',
            `<span class="next-billing">Next: ${response.nextBilling}</span>`
          );
        }
      } else if (billingEl) {
        billingEl.remove();
      }

      // Update cancel button
      const actionsDiv = serviceEl.querySelector('.service-actions');
      const cancelBtn = actionsDiv.querySelector('.btn-cancel');
      if (response.status === 'active' && !cancelBtn) {
        actionsDiv.insertAdjacentHTML('beforeend', `
          <button class="btn-action btn-cancel" data-service="${serviceId}" title="Cancel Subscription">
            Cancel
          </button>
        `);
        actionsDiv.querySelector('.btn-cancel').addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'getServices' }, (serviceResponse) => {
            const service = serviceResponse.services[serviceId];
            showCancelConfirmation(serviceId, service.name);
          });
        });
      } else if (response.status !== 'active' && cancelBtn) {
        cancelBtn.remove();
      }
    } else {
      statusBadge.className = 'status-badge status-error';
      statusBadge.textContent = 'Error';
    }
  });
}

// Check all services
async function checkAllServices() {
  const loading = document.getElementById('loading');
  const servicesList = document.getElementById('servicesList');

  loading.style.display = 'block';
  servicesList.style.display = 'none';

  chrome.runtime.sendMessage({ action: 'checkAllStatuses' }, (response) => {
    loading.style.display = 'none';
    servicesList.style.display = 'block';

    // Reload the services list with updated statuses
    loadServices();
    loadLastCheckTime();
  });
}

// Show cancel confirmation modal
function showCancelConfirmation(serviceId, serviceName) {
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">Cancel ${serviceName}?</div>
      <div class="modal-message">
        This will navigate to the cancellation page and highlight the cancel button.
        You'll need to confirm the cancellation on the service's website.
      </div>
      <div class="modal-buttons">
        <button class="modal-cancel">Cancel</button>
        <button class="modal-confirm">Proceed</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 10);

  // Handle buttons
  modal.querySelector('.modal-cancel').addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  });

  modal.querySelector('.modal-confirm').addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
    cancelSubscription(serviceId);
  });
}

// Cancel subscription
async function cancelSubscription(serviceId) {
  const serviceEl = document.getElementById(`service-${serviceId}`);
  const cancelBtn = serviceEl.querySelector('.btn-cancel');

  if (cancelBtn) {
    cancelBtn.textContent = 'Canceling...';
    cancelBtn.disabled = true;
  }

  chrome.runtime.sendMessage({
    action: 'cancelSubscription',
    serviceId: serviceId
  }, (response) => {
    if (response && response.success) {
      // Update status to show cancellation
      const statusBadge = serviceEl.querySelector('.status-badge');
      statusBadge.className = 'status-badge status-inactive';
      statusBadge.textContent = 'Cancelled';

      if (cancelBtn) {
        cancelBtn.remove();
      }

      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Subscription Cancelled',
        message: `Successfully initiated cancellation for ${serviceId}`
      });
    } else {
      if (cancelBtn) {
        cancelBtn.textContent = 'Cancel';
        cancelBtn.disabled = false;
      }

      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Cancellation Failed',
        message: response?.error || 'Could not cancel subscription'
      });
    }
  });
}

// Setup event handlers
function setupEventHandlers() {
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Check all button
  document.getElementById('checkAllBtn').addEventListener('click', checkAllServices);

  // Cancel all button
  document.getElementById('cancelAllActiveBtn').addEventListener('click', async () => {
    if (confirm('This will attempt to cancel ALL active subscriptions. Are you sure?')) {
      chrome.runtime.sendMessage({ action: 'getStatuses' }, (response) => {
        const activeServices = Object.entries(response.statuses || {})
          .filter(([_, status]) => status.status === 'active')
          .map(([id, _]) => id);

        activeServices.forEach((serviceId, index) => {
          setTimeout(() => {
            cancelSubscription(serviceId);
          }, index * 3000); // 3 second delay between each
        });
      });
    }
  });

  // Footer links
  document.getElementById('openSettings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('viewHistory').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.storage.local.get(['cancellationHistory'], (result) => {
      const history = result.cancellationHistory || [];
      if (history.length === 0) {
        alert('No cancellation history');
      } else {
        const historyText = history
          .slice(-10)
          .reverse()
          .map(item => `${item.service}: ${new Date(item.timestamp).toLocaleDateString()}`)
          .join('\n');
        alert(`Recent Cancellations:\n\n${historyText}`);
      }
    });
  });

  // Debug toggle
  document.getElementById('toggleDebug').addEventListener('click', (e) => {
    e.preventDefault();
    const debugPanel = document.getElementById('debugPanel');
    const isVisible = debugPanel.style.display !== 'none';

    if (isVisible) {
      debugPanel.style.display = 'none';
    } else {
      debugPanel.style.display = 'block';
      loadDebugInfo();
    }
  });

  // Refresh debug info
  document.getElementById('refreshDebug').addEventListener('click', () => {
    loadDebugInfo();
  });
}

// Load debug information
async function loadDebugInfo() {
  const debugContent = document.getElementById('debugContent');
  debugContent.innerHTML = '<div class="debug-item">Loading debug info...</div>';

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Get stored statuses
  chrome.storage.local.get(['subscriptionStatuses', 'lastStatusCheck'], (result) => {
    const statuses = result.subscriptionStatuses || {};
    let debugHtml = '';

    // Show current tab info
    debugHtml += `
      <div class="debug-item">
        <span class="debug-label">Current Tab:</span>
        <span class="debug-value">${tab.url}</span>
      </div>
    `;

    // Show last check time
    debugHtml += `
      <div class="debug-item">
        <span class="debug-label">Last Check:</span>
        <span class="debug-value">${result.lastStatusCheck || 'Never'}</span>
      </div>
    `;

    // Try to get debug info from content script if on a service page
    chrome.tabs.sendMessage(tab.id, { action: 'getDebugInfo' }, (response) => {
      if (response) {
        debugHtml += `
          <div class="debug-item">
            <span class="debug-label">Page Title:</span>
            <span class="debug-value">${response.title}</span>
          </div>
        `;

        if (response.buttons && response.buttons.length > 0) {
          debugHtml += `
            <div class="debug-item">
              <span class="debug-label">Buttons Found:</span>
              <span class="debug-value">${response.buttons.slice(0, 5).map(b => b.text).join(', ')}</span>
            </div>
          `;
        }

        if (response.links && response.links.length > 0) {
          debugHtml += `
            <div class="debug-item">
              <span class="debug-label">Account Links:</span>
              <span class="debug-value">${response.links.slice(0, 3).map(l => l.text).join(', ')}</span>
            </div>
          `;
        }
      }

      // Show status for each service
      Object.entries(statuses).forEach(([serviceId, status]) => {
        if (status.debug) {
          debugHtml += `
            <div class="debug-item">
              <span class="debug-label">${status.service} Debug:</span>
              <div class="debug-value">
                Status: <span class="${status.status === 'active' ? 'debug-success' : 'debug-error'}">${status.status}</span><br>
                URL: ${status.debug.url}<br>
                Found: ${status.debug.foundElements?.length || 0} indicators<br>
                Missing: ${status.debug.missingElements?.length || 0} selectors
              </div>
            </div>
          `;
        }
      });

      debugContent.innerHTML = debugHtml || '<div class="debug-item">No debug information available</div>';
    });
  });
}