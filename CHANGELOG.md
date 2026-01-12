# Changelog

All notable changes to the Subscription Manager extension will be documented in this file.

## [3.5.1] - 2024-01-12

### Changed
- Cancel button now shows for all services, not just active ones
- Active services have highlighted red cancel button
- Inactive/unknown services have grayed-out cancel button

### Fixed
- Added Apple TV+ color (black) to CSS styles
- Apple TV+ now displays properly in both popup and options

### Improved
- Visual distinction between active and inactive subscriptions
- Better UX with all actions always visible

## [3.5.0] - 2024-01-12

### Changed
- Replaced external Lucide CDN with local SVG icons
- Created icons.js with inline SVG definitions
- Icons now work properly with Chrome extension CSP restrictions

### Fixed
- Icons now display correctly in popup and options pages
- No more Content Security Policy errors from external scripts
- Proper SVG rendering with correct sizing

### Technical
- Removed dependency on external Lucide library
- Direct SVG injection for better performance
- Works offline without CDN dependency

## [3.4.2] - 2024-01-12

### Fixed
- Added Lucide icons library to options page
- Icons now properly initialize on options page
- Initialize icons after dynamically adding content

## [3.4.1] - 2024-01-12

### Fixed
- Options page now dynamically loads services from services-config.js
- Removed hardcoded service list from options-enhanced.js
- Services in "Manage Services" now match exactly what's in services-config.js

### Changed
- Options page requests services from background script
- Single source of truth for available services (services-config.js)
- Adding/removing services from config automatically updates everywhere

## [3.4.0] - 2024-01-12

### Changed
- **BREAKING**: Changed `indicators` array to `presentWhenActive` single string
- All services now use a single selector string instead of array
- Simplified configuration structure for easier maintenance

### Added
- `presentWhenInactive` support for detecting cancelled/paused subscriptions
- Disney+ now has `presentWhenInactive: 'button:contains("Restart Subscription")'`
- Inactive detection takes priority over active detection

### Improved
- Status checking logic now checks inactive indicators first
- More accurate status detection (active/inactive/unknown)
- Cleaner service configuration without unnecessary arrays

## [3.3.0] - 2024-01-12

### Added
- Lucide icons library for modern, consistent icons
- External-link icon for Account button (box with corner arrow)
- Refresh icon for Check Status button
- X-circle icon for Cancel button
- Settings gear icon in header

### Changed
- Replaced all emoji icons with Lucide SVG icons
- Account button now uses external-link icon as requested
- Icons are properly sized and styled
- Better visual consistency across the interface

### Improved
- Button styling to properly align icons and text
- Icon initialization after DOM updates

## [3.2.5] - 2024-01-12

### Fixed
- Fixed Disney+ selector syntax error (missing closing bracket and quote)
- Changed Disney+ selectors to use "starts with" operator (^=) for subscription-specific IDs
- Added fallback selectors for Disney+ cancellation

### Changed
- Disney+ now properly handles dynamic subscription IDs like "D2C:12345"
- Added more robust selectors for Disney+ active status and cancellation

## [3.2.4] - 2024-01-12

### Changed
- Removed URL-based detection for cancellation forms
- Now uses pure element-based detection for reason forms
- Checks if form elements exist rather than checking URLs
- More robust and service-agnostic approach

### Improved
- Only attempts to select reasons if elements are found
- Skips already-selected radio buttons/checkboxes
- Faster initial check (500ms) to detect form presence
- Better logging to show what's happening at each step

## [3.2.3] - 2024-01-12

### Fixed
- Stan cancellation flow now properly handles multi-page process
- Added configurable delay after selecting cancellation reason
- Added "Confirm cancellation" button support for Stan's final step

### Added
- Service-specific `reasonDelay` configuration (defaults to 1000ms)
- "Next" button to default selectors for multi-step forms
- Better debug logging for reason selection process

### Changed
- Stan config now includes all necessary selectors for complete flow
- Improved timing after radio button selection to prevent getting stuck

## [3.2.2] - 2024-01-12

### Fixed
- Popup now shows new services (like Stan) automatically
- Changed default enabled state to true for new services
- Services from services-config.js now appear immediately without needing storage

### Changed
- New services default to enabled unless user explicitly disables them
- Popup dynamically includes all services from services-config.js

## [3.2.1] - 2024-01-12

### Fixed
- Stan now properly appears in "Manage Services" settings
- Options page now merges new services with existing settings
- Added Stan color styling to both popup and options CSS
- New services are automatically added to existing user settings

## [3.2.0] - 2024-01-12

### Added
- Support for Stan (Australian streaming service)
  - Account page: https://my.stan.com.au/account
  - Cancel page: https://my.stan.com.au/cancel
  - Automatic reason selection for cancellation forms
- New cancellation reason handling system
  - Services can specify `reasonSelector` in their config
  - Default reason selectors for common patterns (not-needed, expensive, etc.)
  - Automatically selects first available reason if specified

### Changed
- Content script now checks for and selects cancellation reasons before clicking submit
- Added defaultReasonSelectors array for common reason form patterns
- Enhanced cancellation flow to handle multi-step forms with reason selection

## [3.1.0] - 2024-01-12

### Added
- New "Account" button (📊) for each service in the popup
- Account button opens the service's account page using active.checkUrl
- Styled account button with blue theme to differentiate from other actions

### Changed
- Reordered buttons: Account, Check Status, then Cancel (when active)
- Each service now has quick access to their account management page

## [3.0.4] - 2024-01-12

### Fixed
- Fixed "servicesConfig has already been declared" error in content script
- Content script now properly references window.servicesConfig global
- Removed duplicate variable declarations that caused conflicts
- Fixed reference to window.defaultCancelSelectors

## [3.0.3] - 2024-01-12

### Fixed
- Popup now only shows services that are enabled in settings
- Background script respects stored serviceSettings for enabled states
- Check all statuses only processes enabled services
- Changed default enabled state to false (only show explicitly enabled services)

## [3.0.2] - 2024-01-12

### Fixed
- Fixed services not appearing in popup due to missing 'enabled' field
- Background script now adds 'enabled: true' to all services for compatibility
- Services list now properly displays with the simplified configuration

## [3.0.1] - 2024-01-12

### Fixed
- Fixed "window is not defined" error in service worker context
- Updated exports in services-config.js to use `self` for service workers
- Improved config loading in content script with fallback handling
- Service worker now properly loads configuration without window reference

## [3.0.0] - 2024-01-12

### Changed (BREAKING)
- **Major refactoring**: Simplified entire codebase for easier maintenance
- Created centralized `services-config.js` for all service configurations
- Simplified configuration structure - each service only needs unique selectors
- Introduced default text-based selectors that work across most services
- Cancellation now tries service-specific selectors first, then falls back to defaults
- Removed complex page pattern matching in favor of simple sequential clicking

### Added
- Default cancel button patterns that work with text like "Cancel", "Finish", "Confirm", etc.
- Smart detection that tries multiple selector types
- Simplified content script that's easier to debug
- Better separation of concerns with dedicated config file

### Improved
- Much easier to add new services - just add to services-config.js
- Reduced code duplication across services
- More maintainable and readable code structure
- Better fallback behavior when service-specific selectors fail

## [2.0.2] - 2024-01-12

### Fixed
- Fixed Netflix cancellation loop caused by navigation to /cancelplan page
- Added page pattern matching to only execute relevant steps on each page
- Steps now skip if not on the correct page (membership vs cancelplan)
- Added tracking to detect when no steps executed (indicates completion)
- Improved debug logging to show current URL and page matching

### Changed
- Netflix cancellation now properly handles two-page flow:
  1. Click "Cancel membership" on /account/membership page
  2. Click "Finish cancellation" on /cancelplan page
- Each step now has descriptive labels for better debugging

## [2.0.1] - 2024-01-12

### Fixed
- Netflix cancellation loop - now properly clicks "Finish cancellation" button in expanded section
- Added force click capability for hidden elements in collapsed sections
- Updated Netflix selectors to include `data-uia="action-finish-cancellation"`
- Increased wait time after initial cancel button click to allow section to expand

## [2.0.0] - 2024-01-12

### Added
- One-click cancellation functionality for all supported services
- Debug panel in popup for troubleshooting issues
- User-visible error notifications via Chrome notifications
- Version-based service worker naming (background-v2.js)
- Direct navigation to Netflix membership page for cancellation
- Retry logic for failed cancellation attempts
- Proper async message handling to prevent runtime errors

### Changed
- Netflix cancellation now navigates directly to membership page
- Improved error handling with specific error messages
- Enhanced status checking with better timeout management
- Updated all file names to use versioned naming convention

### Fixed
- "Unchecked runtime.lastError" async message handling errors
- Tab ID errors when tabs close unexpectedly
- Netflix cancel button detection with updated selectors
- Multi-step navigation flow for services requiring page changes

### Services Supported
- Netflix (with direct membership page navigation)
- Hulu
- Disney+
- HBO Max / Max
- Peacock
- Paramount+
- Amazon Prime Video
- Spotify
- YouTube Premium

## [1.0.0] - 2024-01-12 (Initial Release)

### Added
- Basic extension structure with popup interface
- Service status checking functionality
- Manual navigation to cancellation pages
- Settings page for service management
- Subscription tracking and history