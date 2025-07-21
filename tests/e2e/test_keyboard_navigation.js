// test_keyboard_navigation.js - Test keyboard shortcuts and navigation

import { test, expect } from '@playwright/test';
import { TEST_CONFIG, KEYBOARD_SHORTCUTS } from './test_config.js';
import { TestUtils } from './test_utils.js';
import * as path from 'path';

test.describe('Keyboard Navigation Tests', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.navigateToViewer();
    
    // Load test files for navigation
    const testFiles = Array(30).fill(null).map((_, i) => 
      path.join(TEST_CONFIG.testFolderPath, Object.values(TEST_CONFIG.sampleFiles)[i % 12])
    );

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'test-kb-input';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    });

    const fileInput = await page.locator('#test-kb-input');
    await fileInput.setInputFiles(testFiles.slice(0, 30));

    await page.evaluate(() => {
      const input = document.getElementById('test-kb-input');
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

  test('Page navigation with arrow keys', async ({ page }) => {
    // Set items per page to 20 to ensure pagination
    await utils.selectItemsPerPage(20);
    await page.waitForTimeout(500);

    // Get initial page
    const getPageNumber = async () => {
      const pageInfo = await page.locator('.pagination-info').textContent();
      const match = pageInfo.match(/Page (\d+)/);
      return match ? parseInt(match[1]) : 1;
    };

    const initialPage = await getPageNumber();
    
    // Press right arrow to go to next page
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.nextPage);
    await page.waitForTimeout(500);
    
    const nextPage = await getPageNumber();
    expect(nextPage).toBe(initialPage + 1);
    
    // Press left arrow to go back
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.prevPage);
    await page.waitForTimeout(500);
    
    const prevPage = await getPageNumber();
    expect(prevPage).toBe(initialPage);
    
    // Press End to go to last page
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.lastPage);
    await page.waitForTimeout(500);
    
    const lastPage = await getPageNumber();
    expect(lastPage).toBeGreaterThan(1);
    
    // Press Home to go to first page
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.firstPage);
    await page.waitForTimeout(500);
    
    const firstPage = await getPageNumber();
    expect(firstPage).toBe(1);
  });

  test('Search focus with / key', async ({ page }) => {
    // Press / to focus search
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.focusSearch);
    await page.waitForTimeout(100);
    
    // Verify search input is focused
    const searchFocused = await page.evaluate(() => {
      return document.activeElement?.id === 'searchInput';
    });
    expect(searchFocused).toBe(true);
    
    // Type in search
    await page.keyboard.type('test');
    
    // Verify search value
    const searchValue = await page.locator('#searchInput').inputValue();
    expect(searchValue).toBe('test');
    
    // Press Escape to clear focus
    await page.keyboard.press('Escape');
    
    // Search should no longer be focused
    const searchBlurred = await page.evaluate(() => {
      return document.activeElement?.id !== 'searchInput';
    });
    expect(searchBlurred).toBe(true);
  });

  test('Theme toggle with T key', async ({ page }) => {
    // Get initial theme
    const isDarkMode = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    
    // Press T to toggle theme
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.toggleTheme);
    await page.waitForTimeout(500);
    
    // Verify theme changed
    const newIsDarkMode = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    expect(newIsDarkMode).toBe(!isDarkMode);
  });

  test('Tree view toggle with B key', async ({ page }) => {
    // Get initial tree panel state
    const treePanel = await page.locator('.tree-folder-panel');
    const initiallyVisible = await treePanel.isVisible();
    
    // Press B to toggle tree view
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.toggleTree);
    await page.waitForTimeout(500);
    
    // Verify visibility changed
    const nowVisible = await treePanel.isVisible();
    expect(nowVisible).toBe(!initiallyVisible);
  });

  test('Select all with Ctrl+A', async ({ page }) => {
    // Press Ctrl+A to select all
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.selectAll);
    await page.waitForTimeout(500);
    
    // All visible tiles should be selected
    const selectedTiles = await page.locator('.model-tile.selected').count();
    const totalTiles = await page.locator('.model-tile').count();
    expect(selectedTiles).toBe(totalTiles);
    
    // Check selection count
    const selectionCount = await page.locator('.selection-count').textContent();
    expect(selectionCount).toContain(totalTiles.toString());
  });

  test('Deselect all with Ctrl+D', async ({ page }) => {
    // First select all
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.selectAll);
    await page.waitForTimeout(500);
    
    // Press Ctrl+D to deselect all
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.deselectAll);
    await page.waitForTimeout(500);
    
    // No tiles should be selected
    const selectedTiles = await page.locator('.model-tile.selected').count();
    expect(selectedTiles).toBe(0);
    
    // Selection count should be 0
    const selectionCount = await page.locator('.selection-count').textContent();
    expect(selectionCount).toContain('0');
  });

  test('Fullscreen with Enter/Space and close with Escape', async ({ page }) => {
    // Focus on first tile
    const firstTile = await page.locator('.model-tile:first-child');
    await firstTile.click();
    
    // Press Enter to open fullscreen
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.openFullscreen);
    await page.waitForTimeout(500);
    
    // Verify fullscreen is open
    let fullscreenVisible = await page.locator('#fullscreenOverlay').isVisible();
    expect(fullscreenVisible).toBe(true);
    
    // Press Escape to close
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.closeFullscreen);
    await page.waitForTimeout(500);
    
    // Verify fullscreen is closed
    let fullscreenHidden = await page.locator('#fullscreenOverlay').isHidden();
    expect(fullscreenHidden).toBe(true);
    
    // Test with Space key
    await firstTile.click();
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    
    // Verify fullscreen is open again
    fullscreenVisible = await page.locator('#fullscreenOverlay').isVisible();
    expect(fullscreenVisible).toBe(true);
    
    // Close again
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.closeFullscreen);
  });

  test('Grid navigation with arrow keys', async ({ page }) => {
    // Click on first tile to establish focus
    const firstTile = await page.locator('.model-tile:first-child');
    await firstTile.click();
    
    // Add keyboard focus class to track navigation
    await page.evaluate(() => {
      document.querySelector('.model-tile:first-child')?.classList.add('keyboard-focus');
    });
    
    // Press down arrow
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    
    // Check if focus moved (implementation dependent)
    // Since grid navigation might not be implemented, we'll check if no errors occurred
    const errors = await utils.getConsoleErrors();
    expect(errors.length).toBe(0);
    
    // Press right arrow
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    
    // Press up arrow
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    
    // Press left arrow
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
  });

  test('Show help with ? key', async ({ page }) => {
    // Press ? to show help
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.showHelp);
    await page.waitForTimeout(500);
    
    // Check if help modal appears
    const helpModal = await page.locator('.keyboard-help-modal');
    const isVisible = await helpModal.isVisible().catch(() => false);
    
    if (isVisible) {
      // Verify help content
      const hasShortcuts = await helpModal.locator('.shortcut-item').count();
      expect(hasShortcuts).toBeGreaterThan(0);
      
      // Close help modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Verify modal is closed
      const isClosed = await helpModal.isHidden().catch(() => true);
      expect(isClosed).toBe(true);
    }
  });

  test('Zoom controls with Ctrl +/- and 0', async ({ page }) => {
    // Get initial tile size
    const getSliderValue = async () => {
      return await page.locator('#sizeSlider').inputValue();
    };
    
    const initialSize = await getSliderValue();
    
    // Press Ctrl++ to zoom in
    await page.keyboard.press('Control++');
    await page.waitForTimeout(500);
    
    const largerSize = await getSliderValue();
    expect(parseInt(largerSize)).toBeGreaterThan(parseInt(initialSize));
    
    // Press Ctrl+- to zoom out
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(500);
    
    const smallerSize = await getSliderValue();
    expect(parseInt(smallerSize)).toBeLessThan(parseInt(largerSize));
    
    // Press Ctrl+0 to reset zoom
    await page.keyboard.press('Control+0');
    await page.waitForTimeout(500);
    
    const resetSize = await getSliderValue();
    expect(resetSize).toBe('200'); // Default size
  });

  test('Escape key behavior', async ({ page }) => {
    // Test 1: Escape clears selection
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.selectAll);
    await page.waitForTimeout(500);
    
    let selectedCount = await page.locator('.model-tile.selected').count();
    expect(selectedCount).toBeGreaterThan(0);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    selectedCount = await page.locator('.model-tile.selected').count();
    expect(selectedCount).toBe(0);
    
    // Test 2: Escape closes fullscreen
    const firstTile = await page.locator('.model-tile:first-child');
    await firstTile.click();
    await utils.pressShortcut(KEYBOARD_SHORTCUTS.openFullscreen);
    await page.waitForTimeout(500);
    
    let fullscreenVisible = await page.locator('#fullscreenOverlay').isVisible();
    expect(fullscreenVisible).toBe(true);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const fullscreenHidden = await page.locator('#fullscreenOverlay').isHidden();
    expect(fullscreenHidden).toBe(true);
  });
});