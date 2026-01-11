// Options page script

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadSubscriptions();
  loadHistory();
  setupEventHandlers();
});

function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {
      autoHighlight: true,
      notifications: true,
      reminderDay: 1
    };

    document.getElementById('autoHighlight').checked = settings.autoHighlight;
    document.getElementById('notifications').checked = settings.notifications;
    document.getElementById('reminderDay').value = settings.reminderDay;
  });
}

function loadSubscriptions() {
  chrome.storage.local.get(['subscriptions'], (result) => {
    const subscriptions = result.subscriptions || [];
    const listEl = document.getElementById('subscriptionList');

    if (subscriptions.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No tracked subscriptions yet</div>';
    } else {
      listEl.innerHTML = '';
      subscriptions.forEach(sub => {
        const item = createSubscriptionItem(sub);
        listEl.appendChild(item);
      });
    }
  });
}

function loadHistory() {
  chrome.storage.local.get(['cancellationHistory'], (result) => {
    const history = result.cancellationHistory || [];
    const listEl = document.getElementById('historyList');

    if (history.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No cancellation history</div>';
    } else {
      listEl.innerHTML = '';
      history.reverse().forEach(entry => {
        const item = createHistoryItem(entry);
        listEl.appendChild(item);
      });
    }
  });
}

function createSubscriptionItem(subscription) {
  const div = document.createElement('div');
  div.className = 'subscription-item';
  div.innerHTML = `
    <div class="subscription-info">
      <div class="subscription-name">${subscription.name}</div>
      <div class="subscription-date">Added: ${new Date(subscription.dateAdded).toLocaleDateString()}</div>
    </div>
    <button class="remove-btn" data-id="${subscription.id}">Remove</button>
  `;

  div.querySelector('.remove-btn').addEventListener('click', (e) => {
    removeSubscription(e.target.dataset.id);
  });

  return div;
}

function createHistoryItem(entry) {
  const div = document.createElement('div');
  div.className = 'history-item';
  div.innerHTML = `
    <div class="subscription-info">
      <div class="subscription-name">${entry.service}</div>
      <div class="history-date">${new Date(entry.timestamp).toLocaleString()}</div>
    </div>
  `;
  return div;
}

function setupEventHandlers() {
  // Save settings
  document.getElementById('saveSettings').addEventListener('click', saveSettings);

  // Add subscription
  document.getElementById('addSubscription').addEventListener('click', () => {
    showAddSubscriptionModal();
  });

  // Clear history
  document.getElementById('clearHistory').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all cancellation history?')) {
      chrome.storage.local.set({ cancellationHistory: [] }, () => {
        loadHistory();
        showSaveStatus('History cleared');
      });
    }
  });

  // Export data
  document.getElementById('exportData').addEventListener('click', exportData);

  // Import data
  document.getElementById('importData').addEventListener('click', () => {
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
            importData(data);
          } catch (error) {
            alert('Invalid file format');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  });

  // Reset all
  document.getElementById('resetAll').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings and data? This cannot be undone.')) {
      chrome.storage.local.clear(() => {
        location.reload();
      });
    }
  });
}

function saveSettings() {
  const settings = {
    autoHighlight: document.getElementById('autoHighlight').checked,
    notifications: document.getElementById('notifications').checked,
    reminderDay: parseInt(document.getElementById('reminderDay').value)
  };

  chrome.storage.local.set({ settings }, () => {
    showSaveStatus('Settings saved!');

    // Update notification schedule if needed
    if (settings.notifications) {
      setupMonthlyReminder(settings.reminderDay);
    } else {
      chrome.alarms.clear('monthlyReminder');
    }
  });
}

function showSaveStatus(message) {
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = message;
  statusEl.classList.add('show');
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

function removeSubscription(id) {
  chrome.storage.local.get(['subscriptions'], (result) => {
    const subscriptions = result.subscriptions || [];
    const updated = subscriptions.filter(sub => sub.id !== id);

    chrome.storage.local.set({ subscriptions: updated }, () => {
      loadSubscriptions();
      showSaveStatus('Subscription removed');
    });
  });
}

function showAddSubscriptionModal() {
  // Create modal HTML
  const modalHtml = `
    <div id="addModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Subscription</h3>
        </div>
        <div class="form-group">
          <label for="serviceName">Service Name</label>
          <select id="serviceName">
            <option value="Netflix">Netflix</option>
            <option value="Hulu">Hulu</option>
            <option value="Disney+">Disney+</option>
            <option value="HBO Max">HBO Max</option>
            <option value="Peacock">Peacock</option>
            <option value="Paramount+">Paramount+</option>
            <option value="Prime Video">Prime Video</option>
            <option value="Spotify">Spotify</option>
            <option value="YouTube Premium">YouTube Premium</option>
            <option value="custom">Other...</option>
          </select>
          <input type="text" id="customName" placeholder="Enter service name" style="display: none; margin-top: 10px;">
        </div>
        <div class="form-group">
          <label for="billingCycle">Billing Cycle</label>
          <select id="billingCycle">
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <div class="form-group">
          <label for="price">Price (optional)</label>
          <input type="number" id="price" step="0.01" placeholder="9.99">
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelAdd">Cancel</button>
          <button class="btn btn-primary" id="confirmAdd">Add</button>
        </div>
      </div>
    </div>
  `;

  // Add modal to page
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer);

  const modal = document.getElementById('addModal');
  modal.classList.add('show');

  // Handle service name selection
  document.getElementById('serviceName').addEventListener('change', (e) => {
    const customInput = document.getElementById('customName');
    if (e.target.value === 'custom') {
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      customInput.style.display = 'none';
    }
  });

  // Handle cancel
  document.getElementById('cancelAdd').addEventListener('click', () => {
    modal.remove();
  });

  // Handle confirm
  document.getElementById('confirmAdd').addEventListener('click', () => {
    const serviceSelect = document.getElementById('serviceName');
    const customName = document.getElementById('customName');
    const name = serviceSelect.value === 'custom' ? customName.value : serviceSelect.value;

    if (!name || (serviceSelect.value === 'custom' && !customName.value)) {
      alert('Please enter a service name');
      return;
    }

    const subscription = {
      id: Date.now().toString(),
      name: name,
      billingCycle: document.getElementById('billingCycle').value,
      price: document.getElementById('price').value || null,
      dateAdded: new Date().toISOString()
    };

    chrome.storage.local.get(['subscriptions'], (result) => {
      const subscriptions = result.subscriptions || [];
      subscriptions.push(subscription);

      chrome.storage.local.set({ subscriptions }, () => {
        loadSubscriptions();
        showSaveStatus('Subscription added');
        modal.remove();
      });
    });
  });
}

function exportData() {
  chrome.storage.local.get(null, (data) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showSaveStatus('Data exported');
  });
}

function importData(data) {
  chrome.storage.local.set(data, () => {
    loadSettings();
    loadSubscriptions();
    loadHistory();
    showSaveStatus('Data imported successfully');
  });
}

function setupMonthlyReminder(dayOfMonth) {
  // Calculate next reminder date
  const now = new Date();
  const nextReminder = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);

  if (nextReminder <= now) {
    nextReminder.setMonth(nextReminder.getMonth() + 1);
  }

  const delayInMinutes = Math.floor((nextReminder - now) / 60000);

  chrome.alarms.create('monthlyReminder', {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 43200 // 30 days
  });
}