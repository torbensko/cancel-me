// Popup script for the subscription manager

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we're on a subscription service
  chrome.tabs.sendMessage(tab.id, { action: 'detectService' }, (response) => {
    const statusEl = document.querySelector('#currentPage .status-text');
    if (response && response.service) {
      statusEl.textContent = `Detected: ${response.service.name}`;
      statusEl.classList.add('detected');
    } else {
      statusEl.textContent = 'Not on a subscription service page';
    }
  });

  // Load services
  chrome.runtime.sendMessage({ action: 'getServices' }, (response) => {
    const services = response.services;
    const grid = document.getElementById('servicesGrid');

    Object.entries(services).forEach(([id, service]) => {
      const serviceEl = createServiceElement(id, service);
      grid.appendChild(serviceEl);
    });
  });

  // Load tracked subscriptions
  loadTrackedSubscriptions();

  // Set up event handlers
  setupEventHandlers();
});

function createServiceElement(id, service) {
  const div = document.createElement('div');
  div.className = `service-item service-${id}`;
  div.innerHTML = `
    <input type="checkbox" id="service-${id}" value="${id}">
    <label for="service-${id}" class="service-name">${service.name}</label>
  `;

  div.addEventListener('click', (e) => {
    if (e.target.type !== 'checkbox') {
      const checkbox = div.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
    }
    div.classList.toggle('selected', div.querySelector('input').checked);
    updateBulkCancelButton();
  });

  return div;
}

function setupEventHandlers() {
  // Bulk cancel button
  document.getElementById('bulkCancel').addEventListener('click', async () => {
    const selected = getSelectedServices();
    if (selected.length === 0) {
      alert('Please select at least one service to cancel');
      return;
    }

    if (confirm(`This will open ${selected.length} cancellation page(s). Continue?`)) {
      chrome.runtime.sendMessage({
        action: 'bulkCancel',
        services: selected
      }, (response) => {
        if (response.success) {
          // Track the cancellation attempt
          selected.forEach(service => {
            chrome.runtime.sendMessage({
              action: 'trackCancellation',
              service: service
            });
          });
          window.close();
        }
      });
    }
  });

  // Highlight button
  document.getElementById('highlightBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'highlightOptions' }, (response) => {
      if (response && response.success) {
        // Also try to find specific cancel button
        chrome.tabs.sendMessage(tab.id, { action: 'findCancelButton' }, (response) => {
          if (response && response.found) {
            window.close();
          }
        });
      }
    });
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // History button
  document.getElementById('historyBtn').addEventListener('click', () => {
    chrome.storage.local.get(['cancellationHistory'], (result) => {
      const history = result.cancellationHistory || [];
      if (history.length === 0) {
        alert('No cancellation history yet');
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
}

function getSelectedServices() {
  const checkboxes = document.querySelectorAll('.services-grid input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

function updateBulkCancelButton() {
  const selected = getSelectedServices();
  const button = document.getElementById('bulkCancel');

  if (selected.length === 0) {
    button.textContent = 'Select Services to Cancel';
    button.disabled = true;
  } else {
    button.textContent = `Open ${selected.length} Cancellation Page${selected.length > 1 ? 's' : ''}`;
    button.disabled = false;
  }
}

async function loadTrackedSubscriptions() {
  chrome.runtime.sendMessage({ action: 'getSubscriptions' }, (response) => {
    const list = document.getElementById('trackedList');
    const subscriptions = response.subscriptions || [];

    if (subscriptions.length === 0) {
      list.innerHTML = '<div class="empty-state">No tracked subscriptions yet</div>';
    } else {
      list.innerHTML = '';
      subscriptions.forEach(sub => {
        const item = document.createElement('div');
        item.className = 'tracked-item';
        item.innerHTML = `
          <div>
            <div class="name">${sub.name}</div>
            <div class="date">Added: ${new Date(sub.dateAdded).toLocaleDateString()}</div>
          </div>
          <button class="remove" data-id="${sub.id}">×</button>
        `;
        list.appendChild(item);
      });

      // Add remove handlers
      list.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          removeSubscription(e.target.dataset.id);
        });
      });
    }
  });
}

function removeSubscription(id) {
  chrome.runtime.sendMessage({ action: 'getSubscriptions' }, (response) => {
    const subscriptions = response.subscriptions || [];
    const updated = subscriptions.filter(sub => sub.id !== id);

    chrome.runtime.sendMessage({
      action: 'saveSubscriptions',
      subscriptions: updated
    }, () => {
      loadTrackedSubscriptions();
    });
  });
}