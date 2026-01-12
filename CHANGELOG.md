# Changelog

All notable changes to the Subscription Manager extension will be documented in this file.

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