# Dave - Digital Assets Viewer Extraordiner Test Suite

This comprehensive test suite ensures all functionality of Dave - Digital Assets Viewer Extraordiner is working correctly.

## Prerequisites

1. **Server Running**: The server must be running on `http://localhost:8080`
   ```bash
   npm start
   ```

2. **Test Folder**: Ensure the TestFolder exists at the expected location with 75 test files

## Installation

```bash
cd tests
npm install
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Individual Test Suites
```bash
npm run test:file-loading    # File loading and drag & drop tests
npm run test:ui              # UI interaction tests
npm run test:keyboard        # Keyboard navigation tests
npm run test:memory          # Memory and performance tests
npm run test:errors          # Error handling tests
```

### Debug Mode
```bash
npm run test:debug           # Run tests with Playwright Inspector
npm run test:headed          # Run tests in headed mode (visible browser)
npm run test:watch           # Run tests in UI mode
```

## Test Coverage

### 1. File Loading Tests (`test_file_loading.js`)
- Single file drag and drop
- Multiple file loading
- File type detection
- Unsupported file rejection
- Folder loading simulation

### 2. UI Interaction Tests (`test_ui_interactions.js`)
- Search functionality with debouncing
- Pagination controls
- Sorting by name, size, date
- File type filtering
- Theme toggle
- Tile size adjustment
- File selection (single and multi-select)
- Tree folder view toggle
- Download functionality
- Fullscreen mode

### 3. Keyboard Navigation Tests (`test_keyboard_navigation.js`)
- Page navigation (arrows, Home, End)
- Search focus (/)
- Theme toggle (T)
- Tree view toggle (B)
- Select all (Ctrl+A)
- Deselect all (Ctrl+D)
- Fullscreen (Enter/Space)
- Grid navigation
- Help modal (?)
- Zoom controls (Ctrl +/- and 0)
- Escape key behavior

### 4. Memory & Performance Tests (`test_memory_performance.js`)
- Memory cleanup on navigation
- FBX viewer disposal
- Blob URL cleanup
- Page load performance
- Search performance
- Thumbnail loading performance
- Fullscreen memory management
- Stress test with all files

### 5. Error Handling Tests (`test_error_handling.js`)
- Corrupted file handling
- Network errors for S3 files
- Memory exhaustion scenarios
- Error notification display
- Multiple error severity levels
- Console error tracking
- Recovery from failures
- S3 authentication errors
- Graceful degradation

## Test Results

After running tests, you'll find:
- **Console Output**: Colored terminal output showing test progress
- **test_report.json**: Detailed JSON report with all test results
- **test-results.json**: Playwright's raw test output
- **playwright-report/**: HTML report (run `npm run test:report` to view)

## Success Criteria

Dave - Digital Assets Viewer Extraordiner is considered working correctly when:
- ✅ All file types load properly
- ✅ UI controls respond correctly
- ✅ Keyboard shortcuts work as expected
- ✅ No memory leaks detected
- ✅ Performance benchmarks are met
- ✅ Errors are handled gracefully
- ✅ Pass rate is above 90%

## Troubleshooting

1. **Server not running**: Start the server with `npm start`
2. **Missing test files**: Ensure TestFolder contains all 75 expected files
3. **Test timeouts**: Increase timeout in package.json if needed
4. **Failed tests**: Check test_report.json for detailed error messages

## Adding New Tests

1. Create a new test file following the naming pattern: `test_[feature].js`
2. Import required modules:
   ```javascript
   import { test, expect } from '@playwright/test';
   import { TEST_CONFIG } from './test_config.js';
   import { TestUtils } from './test_utils.js';
   ```
3. Add the test suite to `TEST_SUITES` in `run_tests.js`
4. Run the new tests to verify they work correctly