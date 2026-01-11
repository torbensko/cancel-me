// Service-specific helper functions for cancellation flows
// This module provides detailed guidance for each streaming service

const cancellationFlows = {
  netflix: {
    steps: [
      'Navigate to Account page',
      'Click "Cancel Membership" button',
      'Select reason for cancellation (optional)',
      'Confirm cancellation',
      'Note the last day of service'
    ],
    tips: [
      'Netflix allows you to rejoin anytime with the same preferences',
      'Your viewing history and profiles are saved for 10 months',
      'You can continue watching until the end of your billing period'
    ],
    automationScript: `
      // Wait for page load
      await waitForElement('button[data-uia="cancel-membership-button"]');
      // Highlight cancel button
      highlightElement('button[data-uia="cancel-membership-button"]');
      // Scroll to button
      scrollToElement('button[data-uia="cancel-membership-button"]');
    `
  },

  hulu: {
    steps: [
      'Go to Account page',
      'Click on "Cancel" under Your Subscription',
      'Select "Continue to Cancel"',
      'Choose reason for cancellation',
      'Confirm cancellation'
    ],
    tips: [
      'Hulu may offer you a discounted rate to stay',
      'You can pause your subscription instead of cancelling',
      'Access continues until the end of billing cycle'
    ],
    automationScript: `
      await waitForElement('a[href*="/cancel"]');
      highlightElement('a[href*="/cancel"]');
      scrollToElement('a[href*="/cancel"]');
    `
  },

  disney: {
    steps: [
      'Access Account Settings',
      'Go to Subscription tab',
      'Select "Cancel Subscription"',
      'Follow cancellation prompts',
      'Confirm your choice'
    ],
    tips: [
      'Disney+ often offers bundle deals if you reconsider',
      'Your account remains active until billing period ends',
      'Downloads will expire when subscription ends'
    ],
    automationScript: `
      await waitForElement('button[data-testid="cancel-button"]');
      highlightElement('button[data-testid="cancel-button"]');
      scrollToElement('button[data-testid="cancel-button"]');
    `
  },

  amazon: {
    steps: [
      'Go to Prime membership page',
      'Click "End Membership"',
      'Select "Continue to Cancel"',
      'Choose immediate or end-of-period cancellation',
      'Confirm cancellation'
    ],
    tips: [
      'You can get a refund if you haven\'t used Prime benefits',
      'Consider switching to monthly if you use it occasionally',
      'Prime Video is included with Prime membership'
    ],
    automationScript: `
      await waitForElement('input[aria-label*="End membership"]');
      highlightElement('input[aria-label*="End membership"]');
      scrollToElement('input[aria-label*="End membership"]');
    `
  },

  spotify: {
    steps: [
      'Go to Account Overview',
      'Click "Change Plan"',
      'Select "Cancel Premium"',
      'Keep clicking "Cancel" through retention offers',
      'Confirm final cancellation'
    ],
    tips: [
      'Spotify will show several retention offers',
      'You revert to free tier, not lose account',
      'Playlists and saved music remain accessible'
    ],
    automationScript: `
      await waitForElement('button[data-testid="cancel-button"]');
      highlightElement('button[data-testid="cancel-button"]');
      scrollToElement('button[data-testid="cancel-button"]');
    `
  },

  youtube: {
    steps: [
      'Go to YouTube TV or Premium settings',
      'Select "Deactivate" or "Cancel Membership"',
      'Choose reason for leaving',
      'Confirm cancellation',
      'Note when access ends'
    ],
    tips: [
      'YouTube TV recordings are saved for 21 days after cancellation',
      'Premium downloads expire immediately',
      'You can pause instead of cancel YouTube TV'
    ],
    automationScript: `
      await waitForElement('button[aria-label*="Cancel"]');
      highlightElement('button[aria-label*="Cancel"]');
      scrollToElement('button[aria-label*="Cancel"]');
    `
  },

  peacock: {
    steps: [
      'Navigate to Account page',
      'Click "Change Plan"',
      'Select "Cancel Subscription"',
      'Provide feedback (optional)',
      'Confirm cancellation'
    ],
    tips: [
      'Free tier remains available after cancellation',
      'Premium content access ends at billing cycle',
      'Watch for seasonal promotions when resubscribing'
    ],
    automationScript: `
      await waitForElement('button[data-testid="cancel-button"]');
      highlightElement('button[data-testid="cancel-button"]');
      scrollToElement('button[data-testid="cancel-button"]');
    `
  },

  paramount: {
    steps: [
      'Go to Account Settings',
      'Select "Cancel Subscription"',
      'Choose cancellation reason',
      'Review final date of service',
      'Confirm cancellation'
    ],
    tips: [
      'Paramount+ often offers discounts to stay',
      'Live TV addon must be cancelled separately',
      'Consider the annual plan for better value'
    ],
    automationScript: `
      await waitForElement('button[aria-label*="Cancel"]');
      highlightElement('button[aria-label*="Cancel"]');
      scrollToElement('button[aria-label*="Cancel"]');
    `
  },

  hbo: {
    steps: [
      'Access Max account page',
      'Navigate to Subscription section',
      'Click "Cancel Subscription"',
      'Select reason for cancellation',
      'Confirm your choice'
    ],
    tips: [
      'Max (formerly HBO Max) content varies by region',
      'Downloads expire when subscription ends',
      'Check for bundle deals with other services'
    ],
    automationScript: `
      await waitForElement('a[href*="cancel-subscription"]');
      highlightElement('a[href*="cancel-subscription"]');
      scrollToElement('a[href*="cancel-subscription"]');
    `
  }
};

// Helper functions for automation
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      } else {
        setTimeout(checkElement, 100);
      }
    };

    checkElement();
  });
}

function highlightElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.style.border = '3px solid #ff0000';
    element.style.backgroundColor = '#ffeeee';
    element.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
    element.style.transition = 'all 0.3s ease';

    // Add pulsing animation
    element.style.animation = 'pulse 2s infinite';
  }
}

function scrollToElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}

// Function to guide through cancellation
async function guideCancellation(service) {
  const flow = cancellationFlows[service];
  if (!flow) {
    console.error(`No cancellation flow found for ${service}`);
    return;
  }

  // Create overlay guide
  const guide = document.createElement('div');
  guide.id = 'cancellation-guide';
  guide.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    background: white;
    border: 2px solid #667eea;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    z-index: 999999;
    font-family: -apple-system, sans-serif;
  `;

  guide.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #667eea;">Cancellation Guide</h3>
    <div class="steps">
      ${flow.steps.map((step, i) => `
        <div class="step" style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
          <span style="font-weight: bold; color: #667eea;">${i + 1}.</span> ${step}
        </div>
      `).join('')}
    </div>
    <div class="tips" style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
      <strong style="color: #856404;">Tips:</strong>
      <ul style="margin: 5px 0; padding-left: 20px;">
        ${flow.tips.map(tip => `<li style="font-size: 12px; margin: 3px 0;">${tip}</li>`).join('')}
      </ul>
    </div>
    <button id="close-guide" style="
      margin-top: 15px;
      width: 100%;
      padding: 10px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    ">Close Guide</button>
  `;

  document.body.appendChild(guide);

  // Add close functionality
  document.getElementById('close-guide').addEventListener('click', () => {
    guide.remove();
  });

  // Execute automation script if available
  if (flow.automationScript) {
    try {
      await eval(`(async () => { ${flow.automationScript} })()`);
    } catch (error) {
      console.error('Automation error:', error);
    }
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cancellationFlows,
    guideCancellation,
    waitForElement,
    highlightElement,
    scrollToElement
  };
}