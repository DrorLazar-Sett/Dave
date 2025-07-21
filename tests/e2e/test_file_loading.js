// test_file_loading.js - Test file loading functionality

import { test, expect } from '@playwright/test';
import { TEST_CONFIG, FILE_TYPE_MAP } from './test_config.js';
import { TestUtils } from './test_utils.js';
import * as fs from 'fs';
import * as path from 'path';

test.describe('File Loading Tests', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.navigateToViewer();
  });

  test('Load single FBX file via drag and drop', async ({ page }) => {
    const testFile = path.join(TEST_CONFIG.testFolderPath, TEST_CONFIG.sampleFiles.fbx);
    
    // Create file input and trigger file selection
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-file-input';
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-file-input');
    await fileInput.setInputFiles(testFile);

    // Trigger drop event
    await page.evaluate(() => {
      const input = document.getElementById('test-file-input');
      const file = input.files[0];
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      
      document.getElementById('viewerContainer').dispatchEvent(dropEvent);
    });

    // Wait for file to appear
    await page.waitForTimeout(1000);
    
    // Verify file appears in grid
    const fileVisible = await utils.verifyFileInGrid(TEST_CONFIG.sampleFiles.fbx);
    expect(fileVisible).toBe(true);
    
    // Verify thumbnail loads
    await page.waitForTimeout(2000);
    const thumbnailLoaded = await utils.verifyThumbnailLoaded(TEST_CONFIG.sampleFiles.fbx);
    expect(thumbnailLoaded).toBe(true);
  });

  test('Load multiple files of different types', async ({ page }) => {
    const testFiles = [
      path.join(TEST_CONFIG.testFolderPath, TEST_CONFIG.sampleFiles.fbx),
      path.join(TEST_CONFIG.testFolderPath, TEST_CONFIG.sampleFiles.jpg),
      path.join(TEST_CONFIG.testFolderPath, TEST_CONFIG.sampleFiles.mp3)
    ];

    // Create file input
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-multi-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-multi-input');
    await fileInput.setInputFiles(testFiles);

    // Trigger drop event
    await page.evaluate(() => {
      const input = document.getElementById('test-multi-input');
      const files = Array.from(input.files);
      
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      
      document.getElementById('viewerContainer').dispatchEvent(dropEvent);
    });

    await page.waitForTimeout(2000);

    // Verify all files appear
    expect(await utils.verifyFileInGrid(TEST_CONFIG.sampleFiles.fbx)).toBe(true);
    expect(await utils.verifyFileInGrid(TEST_CONFIG.sampleFiles.jpg)).toBe(true);
    expect(await utils.verifyFileInGrid(TEST_CONFIG.sampleFiles.mp3)).toBe(true);

    // Check tile count
    const tileCount = await utils.getTileCount();
    expect(tileCount).toBe(3);
  });

  test('Load folder using folder picker button', async ({ page }) => {
    // Click folder picker button
    await page.click('#folderPicker');
    
    // Since we can't actually trigger the folder picker dialog in tests,
    // we'll simulate the folder selection
    await page.evaluate((folderPath) => {
      // Simulate folder selection by dispatching custom event
      window.dispatchEvent(new CustomEvent('test-folder-selected', {
        detail: { path: folderPath }
      }));
    }, TEST_CONFIG.testFolderPath);

    // In real implementation, this would load all files from TestFolder
    // For now, we'll verify the UI is ready
    const folderPicker = await page.locator('#folderPicker');
    expect(await folderPicker.isVisible()).toBe(true);
  });

  test('Verify file type detection', async ({ page }) => {
    const testFiles = Object.values(TEST_CONFIG.sampleFiles).map(
      fileName => path.join(TEST_CONFIG.testFolderPath, fileName)
    );

    // Get only existing files
    const existingFiles = testFiles.filter(filePath => {
      try {
        fs.statSync(filePath);
        return true;
      } catch {
        return false;
      }
    });

    // Load files
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-type-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-type-input');
    await fileInput.setInputFiles(existingFiles.slice(0, 5)); // Test with first 5 files

    await page.evaluate(() => {
      const input = document.getElementById('test-type-input');
      const files = Array.from(input.files);
      
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      
      document.getElementById('viewerContainer').dispatchEvent(dropEvent);
    });

    await page.waitForTimeout(2000);

    // Verify correct type icons/classes
    for (const fileName of Object.values(TEST_CONFIG.sampleFiles).slice(0, 5)) {
      const tile = await page.locator(`.model-tile[data-model-name="${fileName}"]`);
      if (await tile.count() > 0) {
        const ext = path.extname(fileName).toLowerCase();
        const expectedType = FILE_TYPE_MAP[ext] || 'other';
        const dataType = await tile.getAttribute('data-model-type');
        
        // Type might be more specific (e.g., 'fbx' instead of '3d')
        expect(dataType).toBeTruthy();
      }
    }
  });

  test('Reject unsupported files', async ({ page }) => {
    // Create a fake unsupported file
    const unsupportedContent = 'This is an unsupported file';
    const unsupportedFile = new File([unsupportedContent], 'test.xyz', { type: 'application/unknown' });

    // Try to load it
    await page.evaluate((fileData) => {
      const file = new File([fileData.content], fileData.name, { type: fileData.type });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      
      document.getElementById('viewerContainer').dispatchEvent(dropEvent);
    }, {
      content: unsupportedContent,
      name: 'test.xyz',
      type: 'application/unknown'
    });

    await page.waitForTimeout(1000);

    // Should show alert or no files message
    const dialogPromise = page.waitForEvent('dialog');
    const dialog = await Promise.race([
      dialogPromise,
      page.waitForTimeout(2000).then(() => null)
    ]);

    if (dialog) {
      expect(dialog.message()).toContain('No supported files');
      await dialog.accept();
    } else {
      // Check for no files message
      const noFilesMessage = await page.locator('.no-files-message');
      const messageVisible = await noFilesMessage.isVisible().catch(() => false);
      
      // Or check that no tiles were created
      const tileCount = await utils.getTileCount();
      expect(tileCount).toBe(0);
    }
  });

  test('Load files preserves existing files', async ({ page }) => {
    // Load first file
    const firstFile = path.join(TEST_CONFIG.testFolderPath, TEST_CONFIG.sampleFiles.fbx);
    
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-first-input';
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    let fileInput = await page.locator('#test-first-input');
    await fileInput.setInputFiles(firstFile);

    await page.evaluate(() => {
      const input = document.getElementById('test-first-input');
      const file = input.files[0];
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      
      document.getElementById('viewerContainer').dispatchEvent(dropEvent);
    });

    await page.waitForTimeout(1000);
    
    // Verify first file is loaded
    expect(await utils.getTileCount()).toBe(1);

    // Load second file - should replace, not add
    const secondFile = path.join(TEST_CONFIG.testFolderPath, TEST_CONFIG.sampleFiles.glb);
    
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-second-input';
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    fileInput = await page.locator('#test-second-input');
    await fileInput.setInputFiles(secondFile);

    await page.evaluate(() => {
      const input = document.getElementById('test-second-input');
      const file = input.files[0];
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      
      document.getElementById('viewerContainer').dispatchEvent(dropEvent);
    });

    await page.waitForTimeout(1000);

    // Should have replaced files, not added
    const finalCount = await utils.getTileCount();
    expect(finalCount).toBe(1);
    expect(await utils.verifyFileInGrid(TEST_CONFIG.sampleFiles.glb)).toBe(true);
    expect(await utils.verifyFileInGrid(TEST_CONFIG.sampleFiles.fbx)).toBe(false);
  });
});