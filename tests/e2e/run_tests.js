#!/usr/bin/env node

// run_tests.js - Main test runner that executes all test suites and generates a comprehensive report

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test suite configuration
const TEST_SUITES = [
  {
    name: 'File Loading',
    file: 'test_file_loading.js',
    description: 'Tests drag & drop, file type detection, and file handling'
  },
  {
    name: 'UI Interactions',
    file: 'test_ui_interactions.js',
    description: 'Tests search, pagination, sorting, filtering, and theme'
  },
  {
    name: 'Keyboard Navigation',
    file: 'test_keyboard_navigation.js',
    description: 'Tests keyboard shortcuts and navigation'
  },
  {
    name: 'Memory & Performance',
    file: 'test_memory_performance.js',
    description: 'Tests memory cleanup, performance benchmarks, and stress testing'
  },
  {
    name: 'Error Handling',
    file: 'test_error_handling.js',
    description: 'Tests error recovery and graceful degradation'
  }
];

// Test runner class
class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
  }

  printHeader() {
    console.log(colors.cyan + colors.bright + '╔══════════════════════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.cyan + colors.bright + '║   Dave - Digital Assets Viewer Extraordiner Test Suite      ║' + colors.reset);
    console.log(colors.cyan + colors.bright + '╚══════════════════════════════════════════════════════════════╝' + colors.reset);
    console.log();
    console.log(colors.blue + 'Test Configuration:' + colors.reset);
    console.log(`  • Test Folder: ${colors.yellow}/TestFolder${colors.reset}`);
    console.log(`  • Expected Files: ${colors.yellow}75${colors.reset}`);
    console.log(`  • Test Suites: ${colors.yellow}${TEST_SUITES.length}${colors.reset}`);
    console.log();
  }

  async runTestSuite(suite) {
    console.log(colors.blue + colors.bright + `\n▶ Running ${suite.name} Tests` + colors.reset);
    console.log(colors.cyan + `  ${suite.description}` + colors.reset);
    console.log(colors.cyan + '  ' + '─'.repeat(60) + colors.reset);

    const testPath = path.join(__dirname, suite.file);
    
    try {
      // Run the test with Playwright
      const startTime = Date.now();
      const output = execSync(`npx playwright test ${testPath} --reporter=json`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const duration = Date.now() - startTime;
      const results = JSON.parse(output);
      
      // Parse results
      const suiteResult = {
        name: suite.name,
        file: suite.file,
        duration: duration,
        totalTests: results.stats.expected,
        passed: results.stats.expected - results.stats.unexpected - results.stats.skipped,
        failed: results.stats.unexpected,
        skipped: results.stats.skipped,
        tests: []
      };

      // Process individual test results
      for (const suite of results.suites) {
        for (const test of suite.tests || []) {
          const testResult = {
            title: test.title,
            status: test.status,
            duration: test.duration,
            error: test.error
          };
          suiteResult.tests.push(testResult);
          
          // Print test result
          if (test.status === 'passed') {
            console.log(colors.green + `  ✓ ${test.title}` + colors.reset);
          } else if (test.status === 'failed') {
            console.log(colors.red + `  ✗ ${test.title}` + colors.reset);
            if (test.error) {
              console.log(colors.red + `    ${test.error.message}` + colors.reset);
            }
          } else if (test.status === 'skipped') {
            console.log(colors.yellow + `  ○ ${test.title} (skipped)` + colors.reset);
          }
        }
      }

      // Update totals
      this.totalTests += suiteResult.totalTests;
      this.passedTests += suiteResult.passed;
      this.failedTests += suiteResult.failed;
      this.skippedTests += suiteResult.skipped;
      
      this.results.push(suiteResult);
      
      console.log(colors.cyan + `\n  Summary: ${colors.green}${suiteResult.passed} passed${colors.reset}, ${colors.red}${suiteResult.failed} failed${colors.reset}, ${colors.yellow}${suiteResult.skipped} skipped${colors.reset} (${duration}ms)` + colors.reset);
      
    } catch (error) {
      // Handle test execution errors
      const errorMessage = error.stdout || error.message;
      console.log(colors.red + `  ✗ Test suite failed to execute` + colors.reset);
      console.log(colors.red + `    ${errorMessage}` + colors.reset);
      
      this.results.push({
        name: suite.name,
        file: suite.file,
        error: errorMessage,
        failed: true
      });
      
      this.failedTests++;
    }
  }

  async runAllTests() {
    this.printHeader();
    
    // Check if server is running
    console.log(colors.yellow + 'Checking if server is running...' + colors.reset);
    try {
      execSync('curl -s http://localhost:8080 > /dev/null', { stdio: 'ignore' });
      console.log(colors.green + '✓ Server is running on port 8080' + colors.reset);
    } catch (error) {
      console.log(colors.red + '✗ Server is not running!' + colors.reset);
      console.log(colors.yellow + '  Please start the server with: npm start' + colors.reset);
      process.exit(1);
    }

    // Run each test suite
    for (const suite of TEST_SUITES) {
      await this.runTestSuite(suite);
    }

    // Generate summary report
    this.generateReport();
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);
    
    console.log(colors.cyan + colors.bright + '\n\n╔══════════════════════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.cyan + colors.bright + '║                      TEST SUMMARY                            ║' + colors.reset);
    console.log(colors.cyan + colors.bright + '╚══════════════════════════════════════════════════════════════╝' + colors.reset);
    
    console.log('\n' + colors.bright + 'Overall Results:' + colors.reset);
    console.log(`  Total Tests: ${colors.yellow}${this.totalTests}${colors.reset}`);
    console.log(`  Passed: ${colors.green}${this.passedTests}${colors.reset}`);
    console.log(`  Failed: ${colors.red}${this.failedTests}${colors.reset}`);
    console.log(`  Skipped: ${colors.yellow}${this.skippedTests}${colors.reset}`);
    console.log(`  Duration: ${colors.blue}${durationSeconds}s${colors.reset}`);
    
    const passRate = this.totalTests > 0 ? ((this.passedTests / this.totalTests) * 100).toFixed(1) : 0;
    console.log(`  Pass Rate: ${passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red}${passRate}%${colors.reset}`);
    
    console.log('\n' + colors.bright + 'Suite Results:' + colors.reset);
    for (const result of this.results) {
      if (result.failed) {
        console.log(`  ${colors.red}✗ ${result.name}: Failed to execute${colors.reset}`);
      } else {
        const suitePassRate = result.totalTests > 0 ? ((result.passed / result.totalTests) * 100).toFixed(0) : 0;
        const statusColor = suitePassRate >= 90 ? colors.green : suitePassRate >= 70 ? colors.yellow : colors.red;
        console.log(`  ${statusColor}${result.name}: ${suitePassRate}% (${result.passed}/${result.totalTests})${colors.reset}`);
      }
    }
    
    // Write detailed report to file
    this.writeDetailedReport();
    
    // Final status
    console.log('\n' + colors.bright + 'Test Status:' + colors.reset);
    if (this.failedTests === 0 && !this.results.some(r => r.failed)) {
      console.log(colors.green + colors.bright + '✓ All tests passed! Dave - Digital Assets Viewer Extraordiner is working correctly.' + colors.reset);
      process.exit(0);
    } else {
      console.log(colors.red + colors.bright + '✗ Some tests failed. Please review the errors above.' + colors.reset);
      console.log(colors.yellow + `  Detailed report saved to: test_report.json` + colors.reset);
      process.exit(1);
    }
  }

  writeDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        totalTests: this.totalTests,
        passed: this.passedTests,
        failed: this.failedTests,
        skipped: this.skippedTests,
        passRate: this.totalTests > 0 ? ((this.passedTests / this.totalTests) * 100).toFixed(1) : 0
      },
      suites: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        testFolder: '/mnt/c/Users/drorl/Documents/Sett/Tools/HTMLPreviewer/TestFolder'
      }
    };
    
    const reportPath = path.join(__dirname, 'test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();
  
  try {
    await runner.runAllTests();
  } catch (error) {
    console.error(colors.red + 'Fatal error running tests:' + colors.reset, error);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { TestRunner };