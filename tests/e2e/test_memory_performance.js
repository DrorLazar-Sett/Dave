// test_memory_performance.js - Test memory management and performance

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './test_config.js';
import { TestUtils } from './test_utils.js';
import * as path from 'path';

test.describe('Memory and Performance Tests', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.navigateToViewer();
  });

  test('Memory cleanup on page navigation', async ({ page }) => {
    // Load files
    const testFiles = Array(40).fill(null).map((_, i) => 
      path.join(TEST_CONFIG.testFolderPath, Object.values(TEST_CONFIG.sampleFiles)[i % 12])
    );

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-mem-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-mem-input');
    await fileInput.setInputFiles(testFiles);

    await page.evaluate(() => {
      const input = document.getElementById('test-mem-input');
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

    await page.waitForTimeout(3000);

    // Set to 20 items per page
    await utils.selectItemsPerPage(20);
    await page.waitForTimeout(1000);

    // Get initial memory usage
    const initialMemory = await utils.getMemoryUsage();
    
    // Navigate through pages multiple times
    for (let i = 0; i < 5; i++) {
      // Go to next page
      const nextBtn = await page.locator('#nextPageBtn');
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
      }
      
      // Go back to previous page
      const prevBtn = await page.locator('#prevPageBtn');
      if (await prevBtn.isEnabled()) {
        await prevBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Check memory after navigation
    const finalMemory = await utils.getMemoryUsage();
    
    if (initialMemory && finalMemory) {
      const hasLeak = await utils.checkForMemoryLeaks(initialMemory, finalMemory);
      expect(hasLeak).toBe(false);
    }
  });

  test('FBX viewer disposal', async ({ page }) => {
    // Load FBX files
    const fbxFiles = ['ButlerModel.fbx', 'Fence.fbx', 'KateNew2.fbx'].map(
      f => path.join(TEST_CONFIG.testFolderPath, f)
    );

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-fbx-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-fbx-input');
    await fileInput.setInputFiles(fbxFiles);

    await page.evaluate(() => {
      const input = document.getElementById('test-fbx-input');
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

    await page.waitForTimeout(3000);

    // Check active FBX viewers count
    const initialViewerCount = await page.evaluate(() => {
      return window.memoryManager?.activeFbxViewers?.size || 0;
    });

    // Navigate away to trigger cleanup
    await utils.selectItemsPerPage(1); // Show only 1 item
    await page.waitForTimeout(2000);

    // Check viewer count after navigation
    const finalViewerCount = await page.evaluate(() => {
      return window.memoryManager?.activeFbxViewers?.size || 0;
    });

    // Should have fewer viewers after pagination
    expect(finalViewerCount).toBeLessThanOrEqual(1);
  });

  test('Blob URL cleanup', async ({ page }) => {
    // Load image files that create blob URLs
    const imageFiles = ['93_Sea_Museum.jpg', 'Background.jpg', 'Spin.png'].map(
      f => path.join(TEST_CONFIG.testFolderPath, f)
    );

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-blob-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-blob-input');
    await fileInput.setInputFiles(imageFiles);

    await page.evaluate(() => {
      const input = document.getElementById('test-blob-input');
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

    await page.waitForTimeout(3000);

    // Check blob URL count
    const initialBlobCount = await page.evaluate(() => {
      return window.memoryManager?.blobUrls?.size || 0;
    });

    // Clear all files
    await page.evaluate(() => {
      window.modelFiles = [];
      window.filteredModelFiles = [];
      if (window.assetLoading?.renderPage) {
        window.assetLoading.renderPage(0);
      }
    });

    await page.waitForTimeout(2000);

    // Check blob URLs were cleaned up
    const finalBlobCount = await page.evaluate(() => {
      return window.memoryManager?.blobUrls?.size || 0;
    });

    expect(finalBlobCount).toBeLessThan(initialBlobCount);
  });

  test('Page load performance', async ({ page }) => {
    const loadTime = await utils.measurePageLoadTime();
    
    // Should load within benchmark time
    expect(loadTime).toBeLessThan(TEST_CONFIG.performance.pageLoadTime);
  });

  test('Search performance with many files', async ({ page }) => {
    // Load many files
    const manyFiles = Array(50).fill(null).map((_, i) => 
      path.join(TEST_CONFIG.testFolderPath, Object.values(TEST_CONFIG.sampleFiles)[i % 12])
    );

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-search-perf-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-search-perf-input');
    await fileInput.setInputFiles(manyFiles);

    await page.evaluate(() => {
      const input = document.getElementById('test-search-perf-input');
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

    await page.waitForTimeout(3000);

    // Measure search response time
    const searchTime = await utils.measureSearchResponseTime('fbx');
    
    // Should respond within benchmark time
    expect(searchTime).toBeLessThan(TEST_CONFIG.performance.searchResponseTime + 100); // +100ms buffer
  });

  test('Thumbnail loading performance', async ({ page }) => {
    // Load image files
    const imageFiles = [
      '93_Sea_Museum.jpg',
      'Background.jpg', 
      'Spin.png',
      'Area_005_Library_full.png'
    ].map(f => path.join(TEST_CONFIG.testFolderPath, f));

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-thumb-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-thumb-input');
    await fileInput.setInputFiles(imageFiles);

    const startTime = Date.now();

    await page.evaluate(() => {
      const input = document.getElementById('test-thumb-input');
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

    // Wait for thumbnails to load
    await page.waitForFunction(() => {
      const tiles = document.querySelectorAll('.model-tile');
      const loadedThumbnails = Array.from(tiles).filter(tile => {
        const placeholder = tile.querySelector('.placeholder');
        return !placeholder || placeholder.style.display === 'none';
      });
      return loadedThumbnails.length === tiles.length;
    }, { timeout: 5000 });

    const loadTime = Date.now() - startTime;
    
    // Thumbnails should load within benchmark
    expect(loadTime).toBeLessThan(TEST_CONFIG.performance.thumbnailLoadTime * 2); // Allow 2x time for multiple files
  });

  test('Fullscreen memory cleanup', async ({ page }) => {
    // Load mixed content
    const mixedFiles = [
      'ButlerModel.fbx',
      'paul.glb',
      '93_Sea_Museum.jpg',
      'Multimodal LLMs and Aesthetic Reasoning.mp3'
    ].map(f => path.join(TEST_CONFIG.testFolderPath, f));

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-fullscreen-mem-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-fullscreen-mem-input');
    await fileInput.setInputFiles(mixedFiles);

    await page.evaluate(() => {
      const input = document.getElementById('test-fullscreen-mem-input');
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

    await page.waitForTimeout(3000);

    // Get initial memory
    const initialMemory = await utils.getMemoryUsage();

    // Open and close fullscreen multiple times
    for (const fileName of ['ButlerModel.fbx', 'paul.glb', '93_Sea_Museum.jpg']) {
      await utils.openFullscreen(fileName);
      await page.waitForTimeout(1000);
      await utils.closeFullscreen();
      await page.waitForTimeout(500);
    }

    // Force garbage collection
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    await page.waitForTimeout(2000);

    // Check memory after fullscreen operations
    const finalMemory = await utils.getMemoryUsage();

    if (initialMemory && finalMemory) {
      const hasLeak = await utils.checkForMemoryLeaks(initialMemory, finalMemory);
      expect(hasLeak).toBe(false);
    }
  });

  test('Stress test with all files', async ({ page }) => {
    test.slow(); // Mark as slow test

    // Get all files from TestFolder
    const allFiles = [
      '0 (1).glb', '93_Sea_Museum.jpg', 'Area_005_Library_full.png',
      'ButlerModel.fbx', 'Background.jpg', 'Fence.fbx',
      'GraviolaSoftBold.ttf', 'KingHelp.ogg', 'intro.mov',
      'Multimodal LLMs and Aesthetic Reasoning.mp3', 'paul.glb',
      'RobotoBold.ttf', 'Running.fbx', 'Running.glb',
      'SPIN.svg', 'ScreenRecording_02-03-2025 19-12-40_1.MP4',
      'WhatsApp Image 2025-07-02 at 10.59.08.jpeg'
    ].map(f => path.join(TEST_CONFIG.testFolderPath, f));

    const startTime = Date.now();

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-stress-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-stress-input');
    await fileInput.setInputFiles(allFiles);

    await page.evaluate(() => {
      const input = document.getElementById('test-stress-input');
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

    // Wait for initial load
    await page.waitForTimeout(5000);

    const loadTime = Date.now() - startTime;

    // Check that files loaded
    const tileCount = await utils.getTileCount();
    expect(tileCount).toBeGreaterThan(0);

    // Perform various operations
    await utils.searchFor('fbx');
    await page.waitForTimeout(500);
    
    await utils.selectItemsPerPage(50);
    await page.waitForTimeout(500);
    
    await utils.toggleTheme();
    await page.waitForTimeout(500);

    // Check for errors
    const errorCheck = await utils.checkForErrors();
    expect(errorCheck.hasErrors).toBe(false);
  });
});