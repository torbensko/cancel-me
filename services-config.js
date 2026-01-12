// Service configurations - simplified and easy to maintain
// Each service just needs to specify what makes it unique
// Default selectors will handle common patterns

const servicesConfig = {
  netflix: {
    name: 'Netflix',
    domain: 'netflix.com',
    color: '#E50914',

    // Check if subscription is active
    active: {
      checkUrl: 'https://www.netflix.com/account/membership',
      // If any of these exist, subscription is active
      indicators: [
        '[data-uia="cancel-button"]',
        'button:contains("Cancel membership")'
      ]
    },

    // Cancellation flow
    cancellation: {
      startUrl: 'https://www.netflix.com/cancelplan',
      // Service-specific selectors to try first
      selectors: [
        '[data-uia="cancel-button"]',
        '[data-uia="action-finish-cancellation"]'
      ]
    }
  },

  hulu: {
    name: 'Hulu',
    domain: 'hulu.com',
    color: '#1CE783',

    active: {
      checkUrl: 'https://secure.hulu.com/account',
      indicators: [
        'a[href*="/cancel"]',
        'button:contains("Cancel")',
        '.subscription-info'
      ]
    },

    cancellation: {
      startUrl: 'https://secure.hulu.com/account',
      selectors: [] // Will use default selectors
    }
  },

  disney: {
    name: 'Disney+',
    domain: 'disneyplus.com',
    color: '#113CCF',

    active: {
      checkUrl: 'https://www.disneyplus.com/commerce/account',
      indicators: [
        '[data-testid^="account-item-content-D2C"]',
        'button:contains("Cancel")',
        'a:contains("Cancel")'
      ]
    },

    cancellation: {
      startUrl: 'https://www.disneyplus.com/commerce/account',
      selectors: [
        '[data-testid^="account-item-content-D2C"]',
        'button:contains("Cancel Subscription")',
        'button:contains("Cancel")',
        'a:contains("Cancel subscription")'
      ]
    }
  },

  hbo: {
    name: 'HBO Max',
    domain: 'max.com',
    color: '#B535F6',

    active: {
      checkUrl: 'https://auth.hbomax.com/subscription',
      indicators: [
        'a:contains("Cancel Your Subscription")'
      ]
    },

    cancellation: {
      startUrl: 'https://auth.hbomax.com/cancel-subscription',
      selectors: ['[data-testid="retention-offer-action-footer-continue-button"]']
    }
  },

  peacock: {
    name: 'Peacock',
    domain: 'peacocktv.com',
    color: '#000000',

    active: {
      checkUrl: 'https://www.peacocktv.com/account',
      indicators: [
        'button:contains("Cancel")',
        'a[href*="/cancel"]'
      ]
    },

    cancellation: {
      startUrl: 'https://www.peacocktv.com/account/plans',
      selectors: []
    }
  },

  paramount: {
    name: 'Paramount+',
    domain: 'paramountplus.com',
    color: '#0064FF',

    active: {
      checkUrl: 'https://www.paramountplus.com/account',
      indicators: [
        'button:contains("Cancel")',
        '.cancel-link'
      ]
    },

    cancellation: {
      startUrl: 'https://www.paramountplus.com/account/subscription',
      selectors: []
    }
  },

  amazon: {
    name: 'Prime Video',
    domain: 'amazon.com',
    color: '#00A8E1',

    active: {
      checkUrl: 'https://www.amazon.com/gp/primecentral',
      indicators: [
        'input[aria-label*="End membership"]',
        'a:contains("End Membership")'
      ]
    },

    cancellation: {
      startUrl: 'https://www.amazon.com/gp/primecentral',
      selectors: [
        'input[aria-label*="End membership"]'
      ]
    }
  },

  spotify: {
    name: 'Spotify',
    domain: 'spotify.com',
    color: '#1DB954',

    active: {
      checkUrl: 'https://www.spotify.com/account/subscription/',
      indicators: [
        'button:contains("CANCEL PREMIUM")',
        'a:contains("Cancel")'
      ]
    },

    cancellation: {
      startUrl: 'https://www.spotify.com/account/subscription/',
      selectors: []
    }
  },

  youtube: {
    name: 'YouTube Premium',
    domain: 'youtube.com',
    color: '#FF0000',

    active: {
      checkUrl: 'https://www.youtube.com/paid_memberships',
      indicators: [
        'button:contains("Cancel")',
        'a:contains("Cancel membership")'
      ]
    },

    cancellation: {
      startUrl: 'https://www.youtube.com/paid_memberships',
      selectors: []
    }
  },

  stan: {
    name: 'Stan',
    domain: 'stan.com.au',
    color: '#0098F7',

    active: {
      checkUrl: 'https://my.stan.com.au/account',
      indicators: [
        'button:contains("Cancel my subscription")'
      ]
    },

    cancellation: {
      // skip past the reason screen
      startUrl: 'https://my.stan.com.au/cancel/save?reason=not-needed',
      selectors: [
        'button:contains("Cancel my subscription")',
        'button[type="submit"]:contains("Next")',
        'button:contains("Confirm cancellation")'
      ],
      // TODO not needed, as we skip reason screen - Stan does not allow us to programmatically select reason
      // Specify which radio/checkbox to select before proceeding
      // reasonSelector: 'input[type="radio"][value="not-needed"]',
      // Add delay after selecting reason (in milliseconds)
      // reasonDelay: 1500
    }
  }
};

// Default selectors for cancellation reasons
// Common patterns for "why are you leaving" forms
const defaultReasonSelectors = [
  // Common values for "not needed" or "too expensive"
  'input[type="radio"][value*="not-needed"]',
  'input[type="radio"][value*="not_needed"]',
  'input[type="radio"][value*="no-longer"]',
  'input[type="radio"][value*="expensive"]',
  'input[type="radio"][value*="cost"]',
  'input[type="radio"][value*="other"]',
  // First radio button as fallback
  'input[type="radio"]:first-of-type',
  // Checkbox versions
  'input[type="checkbox"][value*="not-needed"]',
  'input[type="checkbox"][value*="other"]'
];

// Default selectors that will be tried if service-specific ones don't work
// These are common patterns across most services
const defaultCancelSelectors = [
  // Generic cancel buttons/links
  'button:contains("Cancel")',
  'button:contains("cancel")',
  'a:contains("Cancel")',
  'a:contains("cancel")',

  // Finish/Complete cancellation
  'button:contains("Finish cancellation")',
  'button:contains("Finish Cancellation")',
  'button:contains("Complete cancellation")',
  'button:contains("Complete Cancellation")',
  'button:contains("Confirm cancellation")',
  'button:contains("Confirm Cancellation")',

  // Confirm/Continue
  'button:contains("Confirm")',
  'button:contains("Continue")',
  'button:contains("Next")',
  'button:contains("Yes")',
  'button:contains("Proceed")',

  // End/Terminate
  'button:contains("End")',
  'button:contains("Terminate")',
  'button:contains("Stop")',

  // Generic data attributes that might be used
  '[data-action*="cancel"]',
  '[data-testid*="cancel"]',
  '[aria-label*="Cancel"]',
  '[aria-label*="cancel"]'
];

// Export for use in other scripts
// Service workers don't have window object, so we use different export strategies
if (typeof module !== 'undefined' && module.exports) {
  // Node.js style export
  module.exports = { servicesConfig, defaultCancelSelectors, defaultReasonSelectors };
} else if (typeof self !== 'undefined') {
  // Service worker context
  self.servicesConfig = servicesConfig;
  self.defaultCancelSelectors = defaultCancelSelectors;
  self.defaultReasonSelectors = defaultReasonSelectors;
} else if (typeof window !== 'undefined') {
  // Browser window context (content scripts)
  window.servicesConfig = servicesConfig;
  window.defaultCancelSelectors = defaultCancelSelectors;
  window.defaultReasonSelectors = defaultReasonSelectors;
}