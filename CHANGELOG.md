# Changelog

All notable changes to the Subscription Manager extension will be documented in this file.

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