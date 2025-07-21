// main.js
import * as AssetLoading from './asset_loading.js';
import * as UI from './ui.js';
import FBXViewer from '../viewers/viewer_fbx.js';
import * as TreeFolderView from '../viewers/tree_folder_view.js';
import { KeyboardShortcutManager, setupNavigationShortcuts, GridNavigator } from '../utils/keyboardShortcuts.js';
import { errorHandler } from '../utils/errorHandler.js';
import { memoryManager } from '../utils/memoryManager.js';

// Global debugging configuration
window.APP_DEBUG = {
  enabled: false, // Set to true to enable all debug logging
  // Individual feature flags for more granular control
  modules: {
    ui: false,
    assetLoading: false,
    treeFolderView: false,
  },
  // Debug utility functions
  log: function(module, ...args) {
    if (this.enabled || (module && this.modules[module])) {
      console.log(`[DEBUG:${module || 'main'}]`, ...args);
    }
  },
  // Enable or disable debugging at runtime
  toggle: function(module = null) {
    if (module) {
      this.modules[module] = !this.modules[module];
      console.log(`[DEBUG] ${module} debugging ${this.modules[module] ? 'enabled' : 'disabled'}`);
    } else {
      this.enabled = !this.enabled;
      console.log(`[DEBUG] Global debugging ${this.enabled ? 'enabled' : 'disabled'}`);
    }
  }
};

// Initialize UI and set up event listeners
UI.initializeUI().then(() => {
  // Initialize tree folder view
  TreeFolderView.initTreeFolderView();
  
  // Initial render
  AssetLoading.renderPage(UI.getCurrentPage());
  UI.updatePagination(Math.ceil(AssetLoading.filteredModelFiles.length / UI.getItemsPerPage()));
  UI.updateSelectionCount();
  
  // Initialize keyboard shortcuts
  const shortcutManager = new KeyboardShortcutManager();
  const gridNavigator = new GridNavigator('#viewerContainer', '.model-tile');
  
  // Set up navigation callbacks
  const navigationCallbacks = {
    nextPage: () => {
      const { nextPageBtn } = UI.getUIElements();
      if (nextPageBtn && !nextPageBtn.disabled) {
        nextPageBtn.click();
      }
    },
    prevPage: () => {
      const { prevPageBtn } = UI.getUIElements();
      if (prevPageBtn && !prevPageBtn.disabled) {
        prevPageBtn.click();
      }
    },
    firstPage: () => {
      UI.setCurrentPage(0);
      AssetLoading.renderPage(0);
      UI.updatePagination(Math.ceil(AssetLoading.filteredModelFiles.length / UI.getItemsPerPage()));
    },
    lastPage: () => {
      const lastPageIndex = Math.ceil(AssetLoading.filteredModelFiles.length / UI.getItemsPerPage()) - 1;
      UI.setCurrentPage(lastPageIndex);
      AssetLoading.renderPage(lastPageIndex);
      UI.updatePagination(Math.ceil(AssetLoading.filteredModelFiles.length / UI.getItemsPerPage()));
    },
    focusSearch: () => {
      const { searchInput } = UI.getUIElements();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
    toggleTheme: () => {
      document.getElementById('themeToggle')?.click();
    },
    toggleTreeView: () => {
      document.getElementById('treeFolderToggle')?.click();
    },
    selectAll: () => {
      UI.selectAllFiles();
    },
    deselectAll: () => {
      UI.clearSelection();
    },
    openFullscreen: () => {
      const focusedItem = gridNavigator.getCurrentItem();
      if (focusedItem && focusedItem.model) {
        AssetLoading.showFullscreen(focusedItem.model);
      }
    },
    closeFullscreen: () => {
      document.getElementById('returnButton')?.click();
    },
    navigateGrid: (direction) => {
      const item = gridNavigator.navigate(direction);
      if (item && direction === 'left' && gridNavigator.currentIndex === 0) {
        // At beginning of grid, go to previous page
        navigationCallbacks.prevPage();
      } else if (item && direction === 'right' && 
                 gridNavigator.currentIndex === gridNavigator.getItems().length - 1) {
        // At end of grid, go to next page
        navigationCallbacks.nextPage();
      }
    },
    zoomIn: () => {
      const sizeSlider = document.getElementById('sizeSlider');
      if (sizeSlider) {
        sizeSlider.value = Math.min(parseInt(sizeSlider.value) + 20, 400);
        sizeSlider.dispatchEvent(new Event('input'));
      }
    },
    zoomOut: () => {
      const sizeSlider = document.getElementById('sizeSlider');
      if (sizeSlider) {
        sizeSlider.value = Math.max(parseInt(sizeSlider.value) - 20, 100);
        sizeSlider.dispatchEvent(new Event('input'));
      }
    },
    resetZoom: () => {
      const sizeSlider = document.getElementById('sizeSlider');
      if (sizeSlider) {
        sizeSlider.value = 200;
        sizeSlider.dispatchEvent(new Event('input'));
      }
    }
  };
  
  // Set up shortcuts
  setupNavigationShortcuts(shortcutManager, navigationCallbacks);
  
  // Make shortcut manager available globally for debugging
  window.shortcutManager = shortcutManager;
  window.gridNavigator = gridNavigator;

  console.log("Main script initialized with Tree Folder View and keyboard shortcuts.");
}).catch(error => {
  errorHandler.reportError(error, { phase: 'initialization' });
  console.error('Failed to initialize application:', error);
});
