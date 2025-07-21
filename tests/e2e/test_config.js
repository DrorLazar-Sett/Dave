// test_config.js - Test configuration and constants

export const TEST_CONFIG = {
  // Test folder path
  testFolderPath: '/mnt/c/Users/drorl/Documents/Sett/Tools/HTMLPreviewer/TestFolder',
  
  // Server configuration
  serverUrl: 'http://localhost:7777',
  viewerUrl: 'http://localhost:7777/Digital_Asset_Viewer.html',
  
  // Test timeouts
  defaultTimeout: 30000,
  fileLoadTimeout: 10000,
  
  // Expected file counts by type
  expectedFiles: {
    total: 75,
    '3d': 19,  // GLB + FBX
    'image': 16,
    'video': 9,
    'audio': 7,
    'font': 3,
    'document': 5,
    'other': 16  // PSD, TXT, etc.
  },
  
  // Sample files for specific tests
  sampleFiles: {
    fbx: 'ButlerModel.fbx',
    glb: 'paul.glb',
    jpg: '93_Sea_Museum.jpg',
    png: 'Area_005_Library_full.png',
    svg: 'IQ = 99.svg',
    mp4: 'replicate-prediction-sq1b78rkz1rm80cntwmsf0z0e4.mp4',
    mov: 'intro.mov',
    mp3: 'Multimodal LLMs and Aesthetic Reasoning.mp3',
    ogg: 'KingHelp.ogg',
    ttf: 'GraviolaSoftBold.ttf',
    pdf: 'Mikołaj_Dąbrowski_CV.pdf',
    webp: 'out-1.webp'
  },
  
  // Performance benchmarks
  performance: {
    pageLoadTime: 2000,      // 2 seconds
    thumbnailLoadTime: 1000, // 1 second
    searchResponseTime: 300, // 300ms
    memoryLeakThreshold: 50  // 50MB increase is concerning
  },
  
  // UI elements to test
  uiElements: {
    viewerContainer: '#viewerContainer',
    searchInput: '#searchInput',
    themeToggle: '#themeToggle',
    sizeSlider: '#sizeSlider',
    itemsPerPageBtn: '#itemsPerPageBtn',
    sortButton: '#sortButton',
    filterButton: '#filterButton',
    folderPicker: '#folderPicker',
    treeFolderToggle: '#treeFolderToggle',
    fullscreenOverlay: '#fullscreenOverlay',
    returnButton: '#returnButton'
  }
};

// File type mappings for validation
export const FILE_TYPE_MAP = {
  '.glb': '3d',
  '.fbx': '3d',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.svg': 'image',
  '.webp': 'image',
  '.mp4': 'video',
  '.mov': 'video',
  '.mkv': 'video',
  '.mp3': 'audio',
  '.ogg': 'audio',
  '.ttf': 'font',
  '.pdf': 'document',
  '.psd': 'other',
  '.txt': 'other'
};

// Keyboard shortcuts to test
export const KEYBOARD_SHORTCUTS = {
  nextPage: 'ArrowRight',
  prevPage: 'ArrowLeft',
  firstPage: 'Home',
  lastPage: 'End',
  focusSearch: '/',
  toggleTheme: 't',
  toggleTree: 'b',
  selectAll: 'Control+a',
  deselectAll: 'Control+d',
  openFullscreen: 'Enter',
  closeFullscreen: 'Escape',
  showHelp: '?'
};
