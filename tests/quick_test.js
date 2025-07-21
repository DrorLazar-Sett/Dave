#!/usr/bin/env node

// quick_test.js - Quick test to verify the test environment is set up correctly

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Dave - Digital Assets Viewer Extraordiner - Quick Test Environment Check\n');

// Check 1: Server running
console.log('1. Checking server...');
try {
  execSync('curl -s http://localhost:8080 > /dev/null', { stdio: 'ignore' });
  console.log('   ✅ Server is running on port 8080');
} catch (error) {
  console.log('   ❌ Server is not running!');
  console.log('   Please start the server with: npm start');
  process.exit(1);
}

// Check 2: Test folder exists
console.log('\n2. Checking TestFolder...');
const testFolderPath = '/mnt/c/Users/drorl/Documents/Sett/Tools/HTMLPreviewer/TestFolder';
if (fs.existsSync(testFolderPath)) {
  const files = fs.readdirSync(testFolderPath);
  console.log(`   ✅ TestFolder exists with ${files.length} files`);
  
  // Check for expected file types
  const fileTypes = {
    fbx: files.filter(f => f.endsWith('.fbx')).length,
    glb: files.filter(f => f.endsWith('.glb')).length,
    jpg: files.filter(f => f.match(/\.(jpg|jpeg)$/i)).length,
    png: files.filter(f => f.endsWith('.png')).length,
    mp3: files.filter(f => f.endsWith('.mp3')).length,
    mp4: files.filter(f => f.match(/\.(mp4|mov)$/i)).length
  };
  
  console.log('   File types found:');
  Object.entries(fileTypes).forEach(([type, count]) => {
    if (count > 0) console.log(`     - ${type.toUpperCase()}: ${count}`);
  });
} else {
  console.log('   ❌ TestFolder not found at expected location');
  console.log(`   Expected path: ${testFolderPath}`);
  process.exit(1);
}

// Check 3: Node modules installed
console.log('\n3. Checking dependencies...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('   ✅ Node modules installed');
} else {
  console.log('   ❌ Node modules not installed');
  console.log('   Run: cd tests && npm install');
  process.exit(1);
}

// Check 4: Playwright installed
console.log('\n4. Checking Playwright...');
try {
  execSync('npx playwright --version', { stdio: 'pipe' });
  console.log('   ✅ Playwright is installed');
} catch (error) {
  console.log('   ❌ Playwright not found');
  console.log('   Run: cd tests && npm install');
  process.exit(1);
}

// Check 5: Run a simple test
console.log('\n5. Running simple browser test...');
try {
  const testCode = `
    import { chromium } from '@playwright/test';
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:8080');
    const title = await page.title();
    await browser.close();
    console.log('Page title:', title);
  `;
  
  fs.writeFileSync(path.join(__dirname, 'temp_test.mjs'), testCode);
  const output = execSync('node temp_test.mjs', { cwd: __dirname, encoding: 'utf8' });
  console.log('   ✅ Browser test successful');
  console.log(`   ${output.trim()}`);
  fs.unlinkSync(path.join(__dirname, 'temp_test.mjs'));
} catch (error) {
  console.log('   ⚠️  Browser test failed (this might be normal)');
}

console.log('\n✨ Environment check complete!');
console.log('\nYou can now run the full test suite with:');
console.log('   cd tests && npm test');
console.log('\nOr run individual test suites:');
console.log('   npm run test:file-loading');
console.log('   npm run test:ui');
console.log('   npm run test:keyboard');
console.log('   npm run test:memory');
console.log('   npm run test:errors');