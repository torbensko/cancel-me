// Enhanced options page script

const defaultServices = {
  netflix: { name: 'Netflix', enabled: true },
  hulu: { name: 'Hulu', enabled: true },
  disney: { name: 'Disney+', enabled: true },
  hbo: { name: 'HBO Max', enabled: true },
  peacock: { name: 'Peacock', enabled: true },
  paramount: { name: 'Paramount+', enabled: true },
  amazon: { name: 'Prime Video', enabled: true },
  spotify: { name: 'Spotify', enabled: true },
  youtube: { name: 'YouTube Premium', enabled: true }
};

let currentSettings = {};
let currentServices = {};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadServices();
  loadStatusSummary();
  setupEventHandlers();
});

// Load current settings
function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    currentSettings = result.settings || {
      autoCheck: true,
      checkInterval: 24,
      confirmBeforeCancel: true,
      notifyOnStatusChange: true
    };

    // Apply settings to UI
    document.getElementById('autoCheck').checked = currentSettings.autoCheck;
    document.getElementById('confirmCancel').checked = currentSettings.confirmBeforeCancel;
    document.getElementById('notifyChanges').checked = currentSettings.notifyOnStatusChange;
    document.getElementById('checkInterval').value = currentSettings.checkInterval;
  });
}

// Load service toggles
function loadServices() {
  chrome.storage.local.get(['serviceSettings'], (result) => {
    currentServices = result.serviceSettings || defaultServices;
    renderServiceToggles();
  });
}

// Render service toggles
function renderServiceToggles() {
  const container = document.getElementById('serviceToggles');
  container.innerHTML = '';

  Object.entries(currentServices).forEach(([id, service]) => {
    const toggle = createServiceToggle(id, service);
    container.appendChild(toggle);
  });
}

// Create service toggle element
function createServiceToggle(id, service) {
  const div = document.createElement('div');
  div.className = `service-toggle ${!service.enabled ? 'disabled' : ''}`;

  div.innerHTML = `
    <div class="service-icon icon-${id}">${service.name.substring(0, 2).toUpperCase()}</div>
    <label class="service-label" for="service-${id}">
      <span class="service-name">${service.name}</span>
      <input type="checkbox" id="service-${id}" class="toggle-input" ${service.enabled ? 'checked' : ''}>
      <span class="toggle-switch"></span>
    </label>
  `;

  const checkbox = div.querySelector(`#service-${id}`);
  checkbox.addEventListener('change', (e) => {
    currentServices[id].enabled = e.target.checked;
    div.classList.toggle('disabled', !e.target.checked);
  });

  return div;
}

// Load status summary
function loadStatusSummary() {
  chrome.storage.local.get(['subscriptionStatuses'], (result) => {
    const statuses = result.subscriptionStatuses || {};
    const summary = {
      total: 0,
      active: 0,
      inactive: 0,
      unchecked: 0
    };

    // Count enabled services only
    Object.entries(currentServices).forEach(([id, service]) => {
      if (service.enabled) {
        summary.total++;
        const status = statuses[id];
        if (!status || status.status === 'unknown') {
          summary.unchecked++;
        } else if (status.status === 'active') {
          summary.active++;
        } else if (status.status === 'inactive') {
          summary.inactive++;
        }
      }
    });

    renderStatusSummary(summary);
  });
}

// Render status summary
function renderStatusSummary(summary) {
  const container = document.getElementById('statusSummary');
  container.innerHTML = `
    <div class="status-card">
      <div class="status-count">${summary.total}</div>
      <div class="status-label">Total Services</div>
    </div>
    <div class="status-card">
      <div class="status-count" style="color: #ff5252;">${summary.active}</div>
      <div class="status-label">Active</div>
    </div>
    <div class="status-card">
      <div class="status-count" style="color: #4caf50;">${summary.inactive}</div>
      <div class="status-label">Inactive</div>
    </div>
    <div class="status-card">
      <div class="status-count" style="color: #999;">${summary.unchecked}</div>
      <div class="status-label">Not Checked</div>
    </div>
  `;
}

// Save settings
function saveSettings() {
  // Get current values
  currentSettings = {
    autoCheck: document.getElementById('autoCheck').checked,
    checkInterval: parseInt(document.getElementById('checkInterval').value),
    confirmBeforeCancel: document.getElementById('confirmCancel').checked,
    notifyOnStatusChange: document.getElementById('notifyChanges').checked
  };

  // Save to storage
  chrome.storage.local.set({
    settings: currentSettings,
    serviceSettings: currentServices
  }, () => {
    showSaveStatus('Settings saved successfully!');

    // Update alarms if needed
    if (currentSettings.autoCheck) {
      chrome.alarms.create('statusCheck', {
        periodInMinutes: currentSettings.checkInterval * 60
      });
    } else {
      chrome.alarms.clear('statusCheck');
    }
  });
}

// Show save status
function showSaveStatus(message) {
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = message;
  statusEl.classList.add('show');
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

// Setup event handlers
function setupEventHandlers() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Select all/none buttons
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    Object.keys(currentServices).forEach(id => {
      currentServices[id].enabled = true;
      document.getElementById(`service-${id}`).checked = true;
      document.querySelector(`#service-${id}`).closest('.service-toggle').classList.remove('disabled');
    });
  });

  document.getElementById('deselectAllBtn').addEventListener('click', () => {
    Object.keys(currentServices).forEach(id => {
      currentServices[id].enabled = false;
      document.getElementById(`service-${id}`).checked = false;
      document.querySelector(`#service-${id}`).closest('.service-toggle').classList.add('disabled');
    });
  });

  // Check now button
  document.getElementById('checkNowBtn').addEventListener('click', () => {
    const btn = document.getElementById('checkNowBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; display: inline-block;"></div> Checking...';

    chrome.runtime.sendMessage({ action: 'checkAllStatuses' }, (response) => {
      btn.disabled = false;
      btn.textContent = 'Check All Now';
      loadStatusSummary();
      showSaveStatus('Status check complete!');
    });
  });

  // Export button
  document.getElementById('exportBtn').addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
      const exportData = {
        settings: data.settings,
        serviceSettings: data.serviceSettings,
        subscriptionStatuses: data.subscriptionStatuses,
        exportDate: new Date().toISOString()
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `subscription-manager-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      showSaveStatus('Settings exported!');
    });
  });

  // Import button
  document.getElementById('importBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);

            // Import settings
            if (data.settings) {
              currentSettings = data.settings;
              loadSettings();
            }
            if (data.serviceSettings) {
              currentServices = data.serviceSettings;
              renderServiceToggles();
            }

            // Save imported data
            chrome.storage.local.set({
              settings: currentSettings,
              serviceSettings: currentServices,
              subscriptionStatuses: data.subscriptionStatuses || {}
            }, () => {
              loadStatusSummary();
              showSaveStatus('Settings imported successfully!');
            });
          } catch (error) {
            alert('Invalid file format');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  });

  // Clear history button
  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    if (confirm('Clear all cancellation history?')) {
      chrome.storage.local.set({ cancellationHistory: [] }, () => {
        showSaveStatus('History cleared!');
      });
    }
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      chrome.storage.local.clear(() => {
        currentSettings = {
          autoCheck: true,
          checkInterval: 24,
          confirmBeforeCancel: true,
          notifyOnStatusChange: true
        };
        currentServices = defaultServices;
        loadSettings();
        renderServiceToggles();
        loadStatusSummary();
        showSaveStatus('Settings reset to defaults');
      });
    }
  });
}