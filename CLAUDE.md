# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dave - Digital Assets Viewer Extraordiner is a client-side web application for viewing and managing digital assets (3D models, images, videos, audio files) in a grid layout. It runs directly in modern browsers without a build process.

## Development Commands

### Running the Application
```bash
# Start the server (port 7777) - From project root
node scripts/server.cjs

# Or use the startup scripts
./scripts/Dave.sh    # Linux/macOS
scripts\Dave.bat     # Windows
```
Access the application at: http://localhost:7777/

### Running Tests
```bash
# Install test dependencies
cd tests
npm install
npx playwright install chromium

# Run all tests
npm test

# Run specific test suites
npm run test:file-loading    # File loading tests
npm run test:ui             # UI interaction tests
npm run test:keyboard       # Keyboard navigation tests
npm run test:memory         # Memory and performance tests
npm run test:errors         # Error handling tests

# Debug/interactive modes
npm run test:watch          # Playwright UI mode
npm run test:debug          # Debug mode
npm run test:headed         # With visible browser
npm run test:report         # View HTML test report
```

**Note**: Tests expect the server to be running on port 8080 (not the default 7777).

## Architecture

### Module Structure
- **Entry Point**: `index.html` - Main HTML file with import maps for Three.js
- **Core Modules**: `src/core/` - Application core (main.js, ui.js, state.js, asset_loading.js)
- **Asset Handlers**: `src/handlers/` - Factory pattern for handling different file types
  - `BaseAssetHandler.js` - Abstract base class
  - Type-specific handlers inherit from base (Image, Video, Audio, Model3D, Font, Document)
  - `AssetHandlerFactory.js` - Creates appropriate handler based on file type
- **Utilities**: `src/utils/` - Reusable functionality (debounce, error handling, keyboard shortcuts, memory management)
- **Shared**: `src/shared/` - Shared modules (filters.js)
- **Workers**: `src/workers/` - Web workers (folder_scanner_worker.js)
- **Viewers**: `src/viewers/` - Specialized viewers (viewer_fbx.js, tree_folder_view.js)
- **Styles**: `src/styles/` - CSS files
- **Assets**: `assets/` - Images and icons
- **Scripts**: `scripts/` - Server and utility scripts
- **Tests**: `tests/` - E2E tests and fixtures
- **Docs**: `docs/` - Documentation files

### Key Design Patterns
- **Factory Pattern**: Asset handlers are created via factory based on file type
- **Inheritance**: All handlers extend BaseAssetHandler
- **ES6 Modules**: No bundling; modules loaded directly
- **Event-Driven**: UI updates via custom events and state management

### External Dependencies
- **Three.js v0.161.0**: 3D model rendering (loaded via CDN)
- **Font Awesome v6.0.0-beta3**: UI icons (loaded via CDN)
- No build tools or bundlers required

### Testing Strategy
- **Playwright**: E2E testing framework
- Tests organized by functionality (file loading, UI, keyboard, memory, errors)
- Single worker configuration for predictable results
- Screenshots/videos captured on failure

### Important Considerations
- No linting or formatting tools configured
- Server runs on port 7777 by default
- Tests require server on port 8080
- No package.json at root (dependencies via CDN)