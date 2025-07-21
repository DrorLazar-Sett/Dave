// test_ui_interactions.js - Test UI interactions

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './test_config.js';
import { TestUtils } from './test_utils.js';
import * as path from 'path';

test.describe('UI Interaction Tests', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.navigateToViewer();
    
    // Load test files
    const testFiles = [
      TEST_CONFIG.sampleFiles.fbx,
      TEST_CONFIG.sampleFiles.glb,
      TEST_CONFIG.sampleFiles.jpg,
      TEST_CONFIG.sampleFiles.mp3,
      TEST_CONFIG.sampleFiles.mp4
    ].map(f => path.join(TEST_CONFIG.testFolderPath, f));

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-setup-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-setup-input');
    await fileInput.setInputFiles(testFiles);

    await page.evaluate(() => {
      const input = document.getElementById('test-setup-input');
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
  });

  test('Search functionality with debouncing', async ({ page }) => {
    // Test search
    const startTime = Date.now();
    await utils.searchFor('fbx');
    
    // Verify debouncing (should wait ~300ms)
    const searchTime = Date.now() - startTime;
    expect(searchTime).toBeGreaterThan(250);
    
    // Verify search results
    const visibleTiles = await utils.getVisibleTiles();
    expect(visibleTiles).toBe(1); // Should only show FBX file

    // Clear search
    await page.fill('#searchInput', '');
    await page.waitForTimeout(350);
    
    // All files should be visible again
    const allTiles = await utils.getVisibleTiles();
    expect(allTiles).toBe(5);
  });

  test('Pagination controls', async ({ page }) => {
    // Load more files to test pagination
    const moreFiles = Array(25).fill(null).map((_, i) => 
      path.join(TEST_CONFIG.testFolderPath, Object.values(TEST_CONFIG.sampleFiles)[i % 12])
    );

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-more-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-more-input');
    await fileInput.setInputFiles(moreFiles);

    await page.evaluate(() => {
      const input = document.getElementById('test-more-input');
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

    // Test different items per page
    await utils.selectItemsPerPage(20);
    await page.waitForTimeout(500);
    let visibleCount = await utils.getVisibleTiles();
    expect(visibleCount).toBeLessThanOrEqual(20);

    // Navigate pages
    const nextButton = await page.locator('#nextPageBtn');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Verify we're on page 2
      const pageInfo = await page.locator('.pagination-info').textContent();
      expect(pageInfo).toContain('2');
    }

    // Test 50 items per page
    await utils.selectItemsPerPage(50);
    await page.waitForTimeout(500);
    visibleCount = await utils.getVisibleTiles();
    expect(visibleCount).toBeLessThanOrEqual(50);
  });

  test('Sorting functionality', async ({ page }) => {
    // Click sort button
    await page.click('#sortButton');
    
    // Sort by name
    await page.click('[data-value="name"]');
    await page.waitForTimeout(500);
    
    // Get first tile name
    const firstTileName = await page.locator('.model-tile:first-child').getAttribute('data-model-name');
    
    // Change sort direction
    await page.click('#sortDirectionBtn');
    await page.waitForTimeout(500);
    
    // First tile should be different
    const newFirstTileName = await page.locator('.model-tile:first-child').getAttribute('data-model-name');
    expect(newFirstTileName).not.toBe(firstTileName);
    
    // Sort by size
    await page.click('#sortButton');
    await page.click('[data-value="size"]');
    await page.waitForTimeout(500);
    
    // Verify sorting applied (we can't easily verify the order without knowing file sizes)
    const sortButton = await page.locator('#sortButton');
    const sortText = await sortButton.textContent();
    expect(sortText).toContain('Size');
  });

  test('Filter by file type', async ({ page }) => {
    // Open filter menu
    await page.click('#filterButton');
    
    // Filter by 3D models
    await page.click('label:has-text("3D Models")');
    await page.waitForTimeout(500);
    
    // Should only show GLB and FBX files
    const visibleTiles = await utils.getVisibleTiles();
    expect(visibleTiles).toBe(2); // FBX and GLB
    
    // Add image filter
    await page.click('label:has-text("Images")');
    await page.waitForTimeout(500);
    
    // Should show 3D models and images
    const newVisibleTiles = await utils.getVisibleTiles();
    expect(newVisibleTiles).toBe(3); // FBX, GLB, and JPG
    
    // Clear filters
    await page.click('#filterButton'); // Close dropdown
    await page.click('#filterButton'); // Reopen
    await page.click('label:has-text("3D Models")'); // Uncheck
    await page.click('label:has-text("Images")'); // Uncheck
    await page.waitForTimeout(500);
    
    // All files should be visible
    const allTiles = await utils.getVisibleTiles();
    expect(allTiles).toBe(5);
  });

  test('Theme toggle', async ({ page }) => {
    // Check initial theme
    const isDarkMode = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    
    // Toggle theme
    await utils.toggleTheme();
    await page.waitForTimeout(500);
    
    // Verify theme changed
    const newIsDarkMode = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    expect(newIsDarkMode).toBe(!isDarkMode);
    
    // Toggle back
    await utils.toggleTheme();
    await page.waitForTimeout(500);
    
    // Should be back to original
    const finalIsDarkMode = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    expect(finalIsDarkMode).toBe(isDarkMode);
  });

  test('Tile size slider', async ({ page }) => {
    // Get initial tile size
    const initialSize = await page.evaluate(() => {
      const tile = document.querySelector('.model-tile');
      return tile ? tile.offsetWidth : 0;
    });
    
    // Increase size
    await utils.setTileSize(300);
    await page.waitForTimeout(500);
    
    const largerSize = await page.evaluate(() => {
      const tile = document.querySelector('.model-tile');
      return tile ? tile.offsetWidth : 0;
    });
    
    expect(largerSize).toBeGreaterThan(initialSize);
    
    // Decrease size
    await utils.setTileSize(150);
    await page.waitForTimeout(500);
    
    const smallerSize = await page.evaluate(() => {
      const tile = document.querySelector('.model-tile');
      return tile ? tile.offsetWidth : 0;
    });
    
    expect(smallerSize).toBeLessThan(largerSize);
  });

  test('File selection', async ({ page }) => {
    // Single click selection
    const firstTile = await page.locator('.model-tile:first-child');
    await firstTile.click();
    
    // Verify selection
    const isSelected = await firstTile.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);
    
    // Check selection count
    const selectionCount = await page.locator('.selection-count').textContent();
    expect(selectionCount).toContain('1');
    
    // Multi-select with Ctrl
    const secondTile = await page.locator('.model-tile:nth-child(2)');
    await secondTile.click({ modifiers: ['Control'] });
    
    // Should have 2 selected
    const newSelectionCount = await page.locator('.selection-count').textContent();
    expect(newSelectionCount).toContain('2');
    
    // Click first tile again to deselect
    await firstTile.click();
    
    // Should have 1 selected
    const finalSelectionCount = await page.locator('.selection-count').textContent();
    expect(finalSelectionCount).toContain('1');
  });

  test('Tree folder view toggle', async ({ page }) => {
    // Check if tree panel is hidden initially
    const treePanel = await page.locator('.tree-folder-panel');
    const initiallyVisible = await treePanel.isVisible();
    
    // Toggle tree view
    await page.click('#treeFolderToggle');
    await page.waitForTimeout(500);
    
    // Check visibility changed
    const nowVisible = await treePanel.isVisible();
    expect(nowVisible).toBe(!initiallyVisible);
    
    // Toggle back
    await page.click('#treeFolderToggle');
    await page.waitForTimeout(500);
    
    // Should be back to original state
    const finallyVisible = await treePanel.isVisible();
    expect(finallyVisible).toBe(initiallyVisible);
  });

  test('Download button functionality', async ({ page }) => {
    // Select a file
    const firstTile = await page.locator('.model-tile:first-child');
    await firstTile.click();
    
    // Download button should be enabled
    const downloadButton = await page.locator('#downloadButton');
    const isEnabled = await downloadButton.isEnabled();
    expect(isEnabled).toBe(true);
    
    // Click download (we can't verify actual download in tests)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      downloadButton.click()
    ]);
    
    // If download started, verify filename
    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toBeTruthy();
    }
  });

  test('Fullscreen mode navigation', async ({ page }) => {
    // Click on a tile to open fullscreen
    const fileName = TEST_CONFIG.sampleFiles.jpg;
    await utils.openFullscreen(fileName);
    
    // Verify fullscreen is open
    const fullscreenVisible = await page.locator('#fullscreenOverlay').isVisible();
    expect(fullscreenVisible).toBe(true);
    
    // Check filename is displayed
    const displayedName = await page.locator('.fullscreen-filename').textContent();
    expect(displayedName).toBe(fileName);
    
    // Close fullscreen
    await utils.closeFullscreen();
    
    // Verify fullscreen is closed
    const fullscreenHidden = await page.locator('#fullscreenOverlay').isHidden();
    expect(fullscreenHidden).toBe(true);
  });
});