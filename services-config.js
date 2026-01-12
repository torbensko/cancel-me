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
      checkUrl: 'https://www.disneyplus.com/account',
      indicators: [
        'button[data-testid="cancel-button"]',
        'button:contains("Cancel")',
        '[data-testid="subscription-details"]'
      ]
    },

    cancellation: {
      startUrl: 'https://www.disneyplus.com/account/subscription',
      selectors: [
        '[data-testid="cancel-button"]'
      ]
    }
  },

  hbo: {
    name: 'HBO Max',
    domain: 'max.com',
    color: '#B535F6',

    active: {
      checkUrl: 'https://play.max.com/account',
      indicators: [
        'a[href*="cancel-subscription"]',
        'button:contains("Cancel")'
      ]
    },

    cancellation: {
      startUrl: 'https://play.max.com/account',
      selectors: []
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
  }
};

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
  module.exports = { servicesConfig, defaultCancelSelectors };
} else if (typeof self !== 'undefined') {
  // Service worker context
  self.servicesConfig = servicesConfig;
  self.defaultCancelSelectors = defaultCancelSelectors;
} else if (typeof window !== 'undefined') {
  // Browser window context (content scripts)
  window.servicesConfig = servicesConfig;
  window.defaultCancelSelectors = defaultCancelSelectors;
}