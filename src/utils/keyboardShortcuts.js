// keyboardShortcuts.js - Keyboard navigation and shortcuts

export class KeyboardShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.init();
  }

  init() {
    // Add global keyboard event listener
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleKeydown(event) {
    if (!this.enabled) return;
    
    // Don't handle shortcuts when typing in input fields
    if (event.target.matches('input, textarea, [contenteditable]')) {
      return;
    }

    // Build shortcut key string
    const keys = [];
    if (event.ctrlKey) keys.push('Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    if (event.metaKey) keys.push('Meta');
    
    // Add the actual key
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    keys.push(key);
    
    const shortcut = keys.join('+');
    
    // Check if we have a handler for this shortcut
    const handler = this.shortcuts.get(shortcut);
    if (handler) {
      event.preventDefault();
      handler(event);
    }
  }

  register(shortcut, handler, description) {
    this.shortcuts.set(shortcut, handler);
    console.log(`Registered shortcut: ${shortcut} - ${description}`);
  }

  unregister(shortcut) {
    this.shortcuts.delete(shortcut);
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  getShortcuts() {
    return Array.from(this.shortcuts.keys());
  }
}

// Navigation-specific shortcuts
export function setupNavigationShortcuts(shortcutManager, navigationCallbacks) {
  const {
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    focusSearch,
    toggleTheme,
    toggleTreeView,
    selectAll,
    deselectAll,
    openFullscreen,
    closeFullscreen,
    navigateGrid,
    zoomIn,
    zoomOut,
    resetZoom
  } = navigationCallbacks;

  // Page navigation
  shortcutManager.register('ArrowRight', nextPage, 'Next page');
  shortcutManager.register('ArrowLeft', prevPage, 'Previous page');
  shortcutManager.register('Home', firstPage, 'First page');
  shortcutManager.register('End', lastPage, 'Last page');
  shortcutManager.register('PageDown', nextPage, 'Next page');
  shortcutManager.register('PageUp', prevPage, 'Previous page');
  
  // UI shortcuts
  shortcutManager.register('/', focusSearch, 'Focus search');
  shortcutManager.register('Ctrl+/', focusSearch, 'Focus search');
  shortcutManager.register('T', toggleTheme, 'Toggle theme');
  shortcutManager.register('B', toggleTreeView, 'Toggle tree view');
  shortcutManager.register('Ctrl+B', toggleTreeView, 'Toggle tree view');
  
  // Selection shortcuts
  shortcutManager.register('Ctrl+A', selectAll, 'Select all');
  shortcutManager.register('Ctrl+D', deselectAll, 'Deselect all');
  shortcutManager.register('Escape', () => {
    if (document.getElementById('fullscreenOverlay').style.display === 'flex') {
      closeFullscreen();
    } else {
      deselectAll();
    }
  }, 'Close fullscreen or deselect all');
  
  // Fullscreen
  shortcutManager.register('Enter', openFullscreen, 'Open selected in fullscreen');
  shortcutManager.register(' ', openFullscreen, 'Open selected in fullscreen');
  
  // Grid navigation (arrow keys when not on page boundaries)
  shortcutManager.register('ArrowUp', () => navigateGrid('up'), 'Navigate up in grid');
  shortcutManager.register('ArrowDown', () => navigateGrid('down'), 'Navigate down in grid');
  
  // Zoom controls
  shortcutManager.register('Ctrl+=', zoomIn, 'Zoom in');
  shortcutManager.register('Ctrl++', zoomIn, 'Zoom in');
  shortcutManager.register('Ctrl+-', zoomOut, 'Zoom out');
  shortcutManager.register('Ctrl+0', resetZoom, 'Reset zoom');
  
  // Help
  shortcutManager.register('?', showKeyboardHelp, 'Show keyboard shortcuts');
  shortcutManager.register('Shift+/', showKeyboardHelp, 'Show keyboard shortcuts');
}

// Show keyboard shortcuts help
function showKeyboardHelp() {
  const shortcuts = [
    { keys: '←/→', description: 'Previous/Next page' },
    { keys: 'Home/End', description: 'First/Last page' },
    { keys: '↑/↓', description: 'Navigate grid' },
    { keys: '/', description: 'Focus search' },
    { keys: 'T', description: 'Toggle theme' },
    { keys: 'B', description: 'Toggle tree view' },
    { keys: 'Enter/Space', description: 'Open in fullscreen' },
    { keys: 'Escape', description: 'Close fullscreen' },
    { keys: 'Ctrl+A', description: 'Select all' },
    { keys: 'Ctrl+D', description: 'Deselect all' },
    { keys: 'Ctrl+/- /0', description: 'Zoom in/out/reset' },
    { keys: '?', description: 'Show this help' }
  ];

  const helpContent = shortcuts.map(s => 
    `<div class="shortcut-item">
      <span class="shortcut-keys">${s.keys}</span>
      <span class="shortcut-desc">${s.description}</span>
    </div>`
  ).join('');

  // Create help modal
  const modal = document.createElement('div');
  modal.className = 'keyboard-help-modal';
  modal.innerHTML = `
    <div class="keyboard-help-content">
      <h2>Keyboard Shortcuts</h2>
      <div class="shortcuts-list">
        ${helpContent}
      </div>
      <button class="close-help">Close (Esc)</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const closeHelp = () => {
    modal.remove();
  };

  modal.querySelector('.close-help').addEventListener('click', closeHelp);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeHelp();
  });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeHelp();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Grid navigation helper
export class GridNavigator {
  constructor(containerSelector, itemSelector) {
    this.container = document.querySelector(containerSelector);
    this.itemSelector = itemSelector;
    this.currentIndex = -1;
  }

  getItems() {
    return Array.from(this.container.querySelectorAll(this.itemSelector));
  }

  getCurrentItem() {
    const items = this.getItems();
    return items[this.currentIndex] || null;
  }

  setFocus(index) {
    const items = this.getItems();
    
    // Remove previous focus
    items.forEach(item => item.classList.remove('keyboard-focus'));
    
    // Set new focus
    if (index >= 0 && index < items.length) {
      this.currentIndex = index;
      const item = items[index];
      item.classList.add('keyboard-focus');
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return item;
    }
    
    return null;
  }

  navigate(direction) {
    const items = this.getItems();
    if (items.length === 0) return;

    // Get grid dimensions
    const firstItem = items[0];
    const itemWidth = firstItem.offsetWidth;
    const containerWidth = this.container.offsetWidth;
    const itemsPerRow = Math.floor(containerWidth / itemWidth);

    let newIndex = this.currentIndex;

    switch (direction) {
      case 'up':
        newIndex = Math.max(0, this.currentIndex - itemsPerRow);
        break;
      case 'down':
        newIndex = Math.min(items.length - 1, this.currentIndex + itemsPerRow);
        break;
      case 'left':
        newIndex = Math.max(0, this.currentIndex - 1);
        break;
      case 'right':
        newIndex = Math.min(items.length - 1, this.currentIndex + 1);
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = items.length - 1;
        break;
    }

    return this.setFocus(newIndex);
  }

  selectCurrent() {
    const item = this.getCurrentItem();
    if (item) {
      item.click();
      return true;
    }
    return false;
  }
}