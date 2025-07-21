import os
import zipfile

def create_digital_asset_viewer_zip():
    """
    Creates the digital_asset_viewer_optimized.zip file containing all necessary HTML, CSS, and JS files.
    """

    folder_name = "DigitalAssetViewerFiles"
    zip_file_name = "digital_asset_viewer_optimized.zip"

    # Ensure the folder exists, create it if not
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    # File contents (paste the content of each file here as string literals)
    html_content = """<!DOCTYPE html>
<html lang="en" class="dark-mode">
<head>
  <meta charset="UTF-8" />
  <title>3D Models, Video, Audio &amp; Image Grid Preview</title>

  <!-- Import map MUST be first - Defines module imports for Three.js and its addons -->
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.161.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.161.0/examples/jsm/"
      }
    }
  </script>

  <!-- Three.js modules - Import and expose Three.js components globally for FBX viewer -->
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
    window.THREE = THREE;
    window.FBXLoader = FBXLoader;
    window.OrbitControls = OrbitControls;
  </script>

  <!-- Model Viewer component - Google's web component for 3D model visualization -->
  <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>

  <!-- Font Awesome - Icon library for UI elements -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

  <link rel="stylesheet" href="styles.css"> </head>
<body class="dark-mode">
  <!-- Top bar with header and all UI controls -->
  <div id="topBar">
    <h1>Dave - Digital Assets Viewer Extraordiner</h1>
    <div class="fileControls">
      <input type="text" id="folderPath" class="folder-input" placeholder="Enter folder path">
      <button id="folderPicker" class="btn" title="Pick a folder">
        <i class="fa fa-folder-open"></i>
      </button>
      <button id="subfolderToggle" class="btn" title="Toggle load subfolders">Subfolders: Off</button>
      <button id="prevPage" class="btn prevPage" disabled>
        <i class="fa fa-chevron-left"></i>
      </button>
      <span id="pageInfo" class="pageInfo">Page 0 of 0</span>
      <button id="nextPage" class="btn nextPage" disabled>
        <i class="fa fa-chevron-right"></i>
      </button>
      <div class="dropdown">
        <button class="btn dropdown-btn">20 Items <i class="fa fa-chevron-down"></i></button>
        <div class="dropdown-content">
          <label data-value="20" class="items-option active"><i class="fa fa-check"></i>20 Items</label>
          <label data-value="50" class="items-option"><i class="fa fa-check"></i>50 Items</label>
          <label data-value="100" class="items-option"><i class="fa fa-check"></i>100 Items</label>
          <label data-value="150" class="items-option"><i class="fa fa-check"></i>150 Items</label>
        </div>
      </div>
    </div>
    <div class="controls-group">
      <div class="dropdown">
        <button id="selectionDropdown" class="btn dropdown-btn">0 Selected <i class="fa fa-chevron-down"></i></button>
        <div class="dropdown-content">
          <label class="selection-option" onclick="downloadSelected()">
            <i class="fa fa-download"></i>
            <span>Download Selected</span>
          </label>
          <label class="selection-option" onclick="clearSelection()">
            <i class="fa fa-times"></i>
            <span>Clear Selection</span>
          </label>
        </div>
      </div>
      <div class="dropdown">
        <button class="btn dropdown-btn">Sort <i class="fa fa-chevron-down"></i></button>
        <div class="dropdown-content">
          <label data-value="name" class="sort-option active"><i class="fa fa-check"></i>Sort by Name</label>
          <label data-value="size" class="sort-option"><i class="fa fa-check"></i>Sort by Size</label>
          <label data-value="type" class="sort-option"><i class="fa fa-check"></i>Sort by Type</label>
          <label data-value="date" class="sort-option"><i class="fa fa-check"></i>Sort by Date</label>
          <div class="dropdown-divider"></div>
          <label class="sort-direction">
            <i class="fa fa-sort-up"></i>
            <span>Ascending</span>
          </label>
        </div>
      </div>
      <div class="dropdown">
        <button class="btn dropdown-btn">Type <i class="fa fa-chevron-down"></i></button>
        <div class="dropdown-content">
          <label><input type="checkbox" id="filter-fbx" checked><span>FBX</span></label>
          <label><input type="checkbox" id="filter-glb" checked><span>GLB</span></label>
          <label><input type="checkbox" id="filter-video" checked><span>Video</span></label>
          <label><input type="checkbox" id="filter-audio" checked><span>Audio</span></label>
          <label><input type="checkbox" id="filter-image" checked><span>Images</span></label>
        </div>
      </div>
      <button id="darkModeToggle" class="btn" title="Toggle dark mode">
        <i class="fa fa-moon"></i>
      </button>
    </div>
  </div>

  <div id="viewerContainer"></div>

  <!-- Fullscreen overlay -->
  <div id="fullscreenOverlay">
    <button id="returnButton" title="Return to grid">
      <i class="fa fa-arrow-left"></i>
    </button>
    <div id="fullscreenContent">
      <div id="fullscreenViewer"></div>
      <video id="fullscreenVideo" controls style="display:none;"></video>
    </div>
  </div>

  <script type="module" src="main.js"></script>
</body>
</html>
"""

    css_content = """/* styles.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: "Segoe UI", Roboto, sans-serif;
  background-color: #121212;
  color: #fff;
  margin: 0;
  transition: background-color 0.4s, color 0.4s;
}
/* Sticky top bar - Contains header, folder controls, and filter options */
#topBar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: inherit;
  padding: 10px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  border-bottom: 1px solid #444;
  gap: 20px;
}
#topBar h1 {
  margin: 0;
  font-size: 1.5rem;
  white-space: nowrap;
}
.controls-group {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: flex-end;
}
.fileControls {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}
/* Input field styles */
.folder-input {
  background-color: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px;
  margin-right: 10px;
  width: 300px;
  font-size: 1rem;
}
body:not(.dark-mode) .folder-input {
  background-color: #fff;
  color: #333;
  border-color: #ccc;
}
/* Common button styles - Consistent styling for all interactive buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s, color 0.3s;
}
.btn:hover {
  background-color: #444;
}
/* Pagination controls - Styling for page navigation buttons */
.prevPage, .nextPage {
  padding: 6px 10px;
}
/* Filter toggles - Custom styled checkboxes as toggle buttons for content filtering */
.checkbox-group {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}
.checkbox-group label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background-color: #333;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}
/* Hide default checkbox appearance */
.checkbox-group label input {
  display: none;
}
/* Use :has() to style checked state (supported in modern browsers) */
.checkbox-group label:has(input:checked) {
  background-color: #555;
  color: #fff;
}

/* Dropdown menu styles */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.dropdown-content {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background-color: #333;
  min-width: 160px;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.dropdown:hover .dropdown-content {
  display: block;
}

.dropdown-content label {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s;
  color: #fff;
  position: relative;
}

.dropdown-content label:hover {
  background-color: #444;
}

/* Type filter styles */
.dropdown-content label input[type="checkbox"] {
  display: none;
}

.dropdown-content label span {
  position: relative;
  padding-left: 28px;
}

.dropdown-content label span:before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border: 2px solid #666;
  border-radius: 4px;
  transition: all 0.3s;
}

.dropdown-content label:hover span:before {
  border-color: #888;
}

.dropdown-content label input[type="checkbox"]:checked + span:before {
  background-color: #744caf;
  border-color: #9f41fd;
}

.dropdown-content label input[type="checkbox"]:checked + span:after {
  content: '\\f00c';
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  font-size: 12px;
}

/* Sort and items options styles */
.dropdown-content .sort-option,
.dropdown-content .items-option {
  padding-left: 36px;
}

.dropdown-content .sort-option i,
.dropdown-content .items-option i {
  position: absolute;
  left: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.dropdown-content .sort-option.active i,
.dropdown-content .items-option.active i {
  opacity: 1;
  color: #9b77ff;
}

.dropdown-divider {
  height: 1px;
  background-color: #555;
  margin: 8px 0;
}

.dropdown-content .sort-direction {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

.dropdown-content .sort-direction i {
  transition: transform 0.3s;
}

.dropdown-content .sort-direction.desc i {
  transform: rotate(180deg);
}

/* Light theme styles for dropdown */
body:not(.dark-mode) .dropdown-btn {
  background-color: #fff;
  color: #333;
  border-color: #ccc;
}

body:not(.dark-mode) .dropdown-content {
  background-color: #fff;
  border-color: #ccc;
}

body:not(.dark-mode) .dropdown-content label {
  color: #333;
}

body:not(.dark-mode) .dropdown-content label:hover {
  background-color: #f0f0f0;
}

/* Dropdown menu - Styling for items per page selector */
select {
  background: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
}

/* Main content grid - Responsive layout for displaying asset previews */
#viewerContainer {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding: 20px;
  margin-top: 60px; /* leave room for fixed header */

}

.model-tile {
  border: 1px solid #444;
  border-radius: 6px;
  background: #2a2a2a;
  text-align: center;
  padding: 12px;
  transition: background 0.3s, transform 0.2s, border-color 0.3s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  position: relative;
  min-height: 220px; /* Height for tile + name */
  cursor: pointer;
}

.model-tile.selected {
  border-color: #9b77ff;
  box-shadow: 0 0 0 2px #9b77ff;
}

.selection-indicator {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #666;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all 0.3s;
}

.model-tile.selected .selection-indicator {
  background: #9b77ff;
  border-color: #fff;
}

.placeholder {
  width: 200px;
  height: 160px;
  background: #3a3a3a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 0.9rem;
}
.model-tile:hover {
  background: #333;
  transform: translateY(-2px);
}
.model-name, .video-name {
  font-size: 0.9rem;
  margin-top: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.file-info {
  font-size: 0.8rem;
  color: #888;
  margin-top: 4px;
  text-align: left;
}
.sort-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sort-select {
  background: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}
.sort-direction-btn {
  background: #333;
  border: 1px solid #555;
  color: white;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
}
body:not(.dark-mode) .sort-select,
body:not(.dark-mode) .sort-direction-btn {
  background: #fff;
  color: #333;
  border-color: #ccc;
}
/* All preview tiles fixed to 200x180px */
model-viewer, .three-viewer, .video-preview {
  border-radius: 4px;
  width: 200px;
  height: 180px;
  background-color: #3a3a3a;
  --poster-color: transparent;
  position: relative;
}
.video-preview {
  position: relative;
}
.video-preview video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.scrub-bar-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}
.scrub-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 0;
  background: rgba(255, 255, 255, 0.2);
  pointer-events: none;
}
.time-marker {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(200, 200, 200, 0.8);
  padding: 2px 4px;
  font-size: 12px;
  color: black;
  transform: translateX(50%);
  border-radius: 2px;
}
/* Audio preview tiles - Custom styling for audio file previews with controls */
.audio-tile {

  display: flex;
  flex-direction: column;
  height: 180px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  overflow: hidden;
}
.audio-header {
  background-color: #333;
  color: #fff;
  padding: 8px;
  text-align: center;
  font-size: 1.2rem;
  border-bottom: 1px solid #555;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.audio-controls {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2a2a2a;
  padding: 1px;
}
.audio-controls audio {
  width: 100%;
  background: transparent;
}
/* Make native dark-mode audio controls appear white */
body.dark-mode .audio-controls audio::-webkit-media-controls-panel {
  background-color: #9c9c9c !important;
  filter: invert(1) hue-rotate(180deg);
}
/* Image preview tiles - Styling for image thumbnails and full-size views */
.image-preview img {
  width: 100%;
  height: 180px;
  object-fit: contain;
  border-radius: 4px;
}
/* Fullscreen view - Overlay and controls for expanded asset viewing */
.fullscreen-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  border: none;
  color: white;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
}
#fullscreenOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.9);
  z-index: 1000;
  display: none;
}
#fullscreenContent {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

#fullscreenViewer, #fullscreenVideo {
  pointer-events: auto;
}
#fullscreenVideo {
  display: block;
  width: 50%;
  height: auto;
  max-width: 50%;
  max-height: 100%;
  object-fit: contain;
  margin: auto;
}
#fullscreenViewer {
  width: 50%;
  height: 75%;
}
#returnButton {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0,0,0,0.6);
  border: none;
  color: white;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1001;
}
/* Drag and drop styles */
#viewerContainer {
  min-height: calc(100vh - 80px); /* Full viewport height minus header */
  position: relative;
}

#viewerContainer.drag-over::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.15);
  border: 3px dashed #888;
  pointer-events: none;
  z-index: 10;
}

#viewerContainer.drag-over::after {
  content: 'Drop files here';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: #888;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 20px 40px;
  border-radius: 8px;
  pointer-events: none;
  z-index: 11;
}

/* Light theme styles - Color scheme overrides for light mode */
body:not(.dark-mode) {
  background-color: #f0f0f0;
  color: #000;
}
body:not(.dark-mode) .btn {
  background-color: #fff;
  color: #333;
  border-color: #ccc;
}
body:not(.dark-mode) .model-tile {
  background: #fff;
  border-color: #ccc;
}
body:not(.dark-mode) model-viewer,
body:not(.dark-mode) .three-viewer,
body:not(.dark-mode) .video-preview {
  background-color: #cfcfcf;
}
body:not(.dark-mode) .audio-tile {
  background-color: #fff;
  border: 1px solid #ccc;
}
body:not(.dark-mode) .audio-header {
  background-color: #ddd;
  color: #000;
  border-bottom: 1px solid #ccc;
}
body:not(.dark-mode) .audio-controls {
  background-color: #fff;
}
body:not(.dark-mode) .audio-controls audio::-webkit-media-controls-panel {
  background-color: #e0e0e0 !important;
  filter: none;
}
"""

    main_js_content = """// main.js
import * as AssetLoading from './asset_loading.js';
import * as UI from './ui.js';
import FBXViewer from './viewer_fbx.js';
import * as THREE from 'three'; // Make sure THREE is available if needed globally

// Initialize event listeners and application start

// Folder picker button event listener (moved here to connect UI with asset loading)
AssetLoading.folderPickerButton.addEventListener("click", async () => {
  console.log("Folder picker button clicked (main.js)");
  try {
    await AssetLoading.handleFolderSelection();
  } catch (error) {
    console.error("Error in folderPicker click:", error);
    alert(`Error: ${error.message}`);
  }
});

// Folder path input Enter key listener (moved here to connect UI with asset loading)
AssetLoading.folderPathInput.addEventListener("keypress", async (event) => {
  if (event.key === "Enter") {
    console.log("Enter key pressed in folder input (main.js)");
    await AssetLoading.handleFolderSelection();
  }
});

// Subfolder toggle - trigger reload if needed (example, adjust logic as necessary)
UI.subfolderToggle.addEventListener("click", async () => {
  UI.loadSubfolders = !UI.loadSubfolders;
  UI.subfolderToggle.textContent = UI.loadSubfolders ? "Subfolders: On" : "Subfolders: Off";
  if (AssetLoading.lastDirectoryHandle) {
    await AssetLoading.handleFolderPick(AssetLoading.lastDirectoryHandle); // Reload files from last directory
  }
});

// Selection dropdown actions
const selectionOptions = document.querySelectorAll('.selection-option');
selectionOptions.forEach(option => {
  if (option.textContent.includes('Download Selected')) {
    option.addEventListener('click', () => {
      UI.downloadSelected(AssetLoading.modelFiles); // Pass modelFiles for download
    });
  } else if (option.textContent.includes('Clear Selection')) {
    option.addEventListener('click', () => {
      UI.clearSelection(AssetLoading.renderPage); // Pass renderPage callback to refresh tiles
    });
  }
});


// Initial render (you might want to load a default folder or show a welcome message initially)
AssetLoading.renderPage(UI.currentPage);
UI.updatePagination(Math.ceil(AssetLoading.filteredModelFiles.length / UI.itemsPerPage));
UI.updateSelectionCount(); // Initialize selection count to 0

console.log("Main script initialized.");
"""

    ui_js_content = """// ui.js
import { renderPage } from './asset_loading.js'; // Example import, adjust as needed

const darkModeToggle = document.getElementById("darkModeToggle");
const subfolderToggle = document.getElementById("subfolderToggle");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const returnButton = document.getElementById('returnButton');
const fullscreenVideo = document.getElementById('fullscreenVideo');
const fullscreenViewer = document.getElementById('fullscreenViewer');
const selectionDropdown = document.getElementById('selectionDropdown');

let currentPage = 0;
let itemsPerPage = 20;
let loadSubfolders = false;
let currentSort = { field: 'name', direction: 'asc' };
let selectedFiles = new Set();

// Function to update pagination display
function updatePagination(totalPages) {
  pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 0;
  nextPageBtn.disabled = currentPage >= totalPages - 1;
}

// Function to exit fullscreen
function exitFullscreen(currentFullscreenViewer) {
  fullscreenOverlay.style.display = 'none';
  if (currentFullscreenViewer) {
    if (currentFullscreenViewer === fullscreenVideo) {
      fullscreenVideo.pause();
      fullscreenVideo.currentTime = 0;
    } else if (currentFullscreenViewer.cleanup) {
      currentFullscreenViewer.cleanup();
    }
    return null; // Return null to indicate no current viewer
  }
  return null; // Return null if no viewer to begin with
}

// Function to update selection count in UI
function updateSelectionCount() {
  const count = selectedFiles.size;
  selectionDropdown.innerHTML =
    `${count} Selected <i class="fa fa-chevron-down"></i>`;
}

function clearSelection(renderCallback) {
  selectedFiles.clear();
  updateSelectionCount();
  if (renderCallback) renderCallback(currentPage); // Re-render current page to update tile selections
}

async function downloadSelected(modelFiles) {
  if (selectedFiles.size === 0) return;

  for (const fileName of selectedFiles) {
    const model = modelFiles.find(m => m.name === fileName);
    if (model) {
      const blob = new Blob([await model.file.arrayBuffer()]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = model.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}


// Theme toggle handler
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Subfolder toggle handler
subfolderToggle.addEventListener("click", () => {
  loadSubfolders = !loadSubfolders;
  subfolderToggle.textContent = loadSubfolders ? "Subfolders: On" : "Subfolders: Off";
  // Need to trigger file reload here based on new subfolder setting if needed
});


prevPageBtn.addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    //renderPage(currentPage); // Render page will be handled in asset_loading or main.js
    //updatePagination(); // Update pagination will be handled here
  }
  // Trigger page render from main or asset_loading
});

nextPageBtn.addEventListener("click", () => {
  // const maxPage = Math.ceil(filteredModelFiles.length / itemsPerPage) - 1; // totalPages will come from asset_loading
  // if (currentPage < maxPage) {
  //   currentPage++;
  //   //renderPage(currentPage); // Render page will be handled in asset_loading or main.js
  //   //updatePagination(); // Update pagination will be handled here
  // }
   // Trigger page render from main or asset_loading
});

returnButton.addEventListener('click', () => {
  exitFullscreen(); // exitFullscreen will be handled here
});

document.addEventListener('keydown', function(event) {
  if (fullscreenOverlay.style.display === 'block' && event.key === 'Escape') {
    exitFullscreen(); // exitFullscreen will be handled here
  }
});

// Add click handler to close fullscreen when clicking outside content
fullscreenOverlay.addEventListener('click', function(event) {
  // Check if click was directly on the overlay (not its children)
  if (event.target === fullscreenOverlay) {
    exitFullscreen(); // exitFullscreen will be handled here
  }
});

// Selection management function for UI interaction (tile click) - to be called from tile rendering
function toggleSelectionUI(fileName, renderCallback) {
  if (selectedFiles.has(fileName)) {
    selectedFiles.delete(fileName);
  } else {
    selectedFiles.add(fileName);
  }
  updateSelectionCount();
  if (renderCallback) renderCallback(currentPage); // Re-render current page to update tile selections
}


export {
  updatePagination,
  exitFullscreen,
  updateSelectionCount,
  clearSelection,
  downloadSelected,
  toggleSelectionUI,
  currentPage,
  itemsPerPage,
  loadSubfolders,
  currentSort,
  selectedFiles,
  prevPageBtn,
  nextPageBtn,
  subfolderToggle // Export subfolderToggle for potential state updates in asset_loading
};
"""

    asset_loading_js_content = """// asset_loading.js
import FBXViewer from './viewer_fbx.js';
import * as UI from './ui.js'; // Import UI module
import * as THREE from 'three'; // Import three here as well, if needed for model loading in this module

const folderPickerButton = document.getElementById("folderPicker");
const folderPathInput = document.getElementById("folderPath");
const viewerContainer = document.getElementById("viewerContainer");
const filterFBX = document.getElementById('filter-fbx');
const filterGLB = document.getElementById('filter-glb');
const filterVideo = document.getElementById('filter-video');
const filterAudio = document.getElementById('filter-audio');
const filterImage = document.getElementById('filter-image');
const itemsOptions = document.querySelectorAll('.items-option');
const itemsBtn = document.querySelector('.dropdown-btn');
const sortOptions = document.querySelectorAll('.sort-option');
const sortDirectionBtn = document.querySelector('.sort-direction');

let modelFiles = [];
let filteredModelFiles = [];
let lastDirectoryHandle = null;
let currentFullscreenViewer = null;

// Intersection Observer setup for lazy loading
const observerOptions = {
  root: null,
  rootMargin: '50px',
  threshold: 0.1
};

const tileObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const tile = entry.target;
      loadTileContent(tile);
      observer.unobserve(tile);
    }
  });
}, observerOptions);


// Format file size in a human-readable format
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date in a readable format
function formatDate(date) {
  return new Date(date).toLocaleString();
}

function formatTime(seconds) {
  // Time formatting utility - Converts seconds to HH:MM:SS format for video/audio display
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function createPlaceholder(type) {
  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder';
  placeholder.innerHTML = `<i class="fa fa-spinner fa-spin"></i><br>Loading ${type}...`;
  return placeholder;
}


// Sort files based on current sort settings
function sortFiles() {
  filteredModelFiles.sort((a, b) => {
    let comparison = 0;
    switch (UI.currentSort.field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.file.size - b.file.size;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'date':
        comparison = a.file.lastModified - b.file.lastModified;
        break;
    }
    return UI.currentSort.direction === 'asc' ? comparison : -comparison;
  });
}

// File retrieval function - Recursively collects files from selected directory
async function getFilesFromDirectory(dirHandle, recursive) {
  let files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "file") {
      files.push({ name, handle });
    } else if (handle.kind === "directory" && recursive) {
      const subFiles = await getFilesFromDirectory(handle, true);
      files = files.concat(subFiles);
    }
  }
  return files;
}

// Filter management - Updates displayed assets based on active file type filters
function updateFilteredModelFiles() {
  filteredModelFiles = modelFiles.filter(item => {
    if (item.type === 'fbx' && !filterFBX.checked) return false;
    if (item.type === 'glb' && !filterGLB.checked) return false;
    if (item.type === 'video' && !filterVideo.checked) return false;
    if (item.type === 'audio' && !filterAudio.checked) return false;
    if (item.type === 'image' && !filterImage.checked) return false;
    return true;
  });
}


async function handleFolderPick(dirHandle) {
  // Folder processing - Handles the selected directory and processes its contents
  console.log("Starting folder processing");
  modelFiles = [];
  viewerContainer.innerHTML = "";
  try {
    let fileEntries = [];
    if (UI.loadSubfolders) {
      console.log("Loading files with subfolders");
      fileEntries = await getFilesFromDirectory(dirHandle, true);
    } else {
      console.log("Loading files from root directory only");
      for await (const [name, handle] of dirHandle.entries()) {
        fileEntries.push({ name, handle });
      }
    }
    console.log(`Found ${fileEntries.length} total files`);
    for (const {name, handle} of fileEntries) {
      const lowerCaseName = name.toLowerCase();
      if (
        lowerCaseName.endsWith(".glb") || lowerCaseName.endsWith(".fbx") ||
        lowerCaseName.endsWith(".mp4") || lowerCaseName.endsWith(".webm") ||
        lowerCaseName.endsWith(".ogg") || lowerCaseName.endsWith(".mp3") ||
        lowerCaseName.endsWith(".wav") ||
        lowerCaseName.endsWith(".jpg") || lowerCaseName.endsWith(".jpeg") ||
        lowerCaseName.endsWith(".png") || lowerCaseName.endsWith(".gif")
      ) {
        console.log(`Processing file: ${name}`);
        const file = await handle.getFile();
        let type = "other";
        if (lowerCaseName.endsWith(".glb")) { type = "glb"; }
        else if (lowerCaseName.endsWith(".fbx")) { type = "fbx"; }
        else if (lowerCaseName.endsWith(".mp4") || lowerCaseName.endsWith(".webm") || lowerCaseName.endsWith(".ogg")) { type = "video"; }
        else if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".wav")) { type = "audio"; }
        else if (
          lowerCaseName.endsWith(".jpg") || lowerCaseName.endsWith(".jpeg") ||
          lowerCaseName.endsWith(".png") || lowerCaseName.endsWith(".gif")
        ) { type = "image"; }
        modelFiles.push({ name, file, type });
        console.log(`Added ${type} file: ${name}`);
      }
    }
    console.log(`Processed ${modelFiles.length} supported files`);
    modelFiles.sort((a, b) => a.name.localeCompare(b.name));
    console.log("Files sorted alphabetically");
    updateFilteredModelFiles();
    console.log(`Filtered to ${filteredModelFiles.length} files based on current filters`);
    UI.currentPage = 0;
    updatePagination();
    renderPage(UI.currentPage);
    console.log("Initial page rendered");
  } catch (error) {
    console.error("Error in handleFolderPick:", error);
    alert(`Error: ${error.message}\\n\\nFailed to access folder contents. Ensure you have permission.`);
  }
}

async function loadTileContent(tile) {
  const model = tile.model;
  const placeholder = tile.querySelector('.placeholder');

  try {
    if (model.type === "glb") {
      const mv = document.createElement("model-viewer");
      mv.src = URL.createObjectURL(model.file);
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("auto-rotate", "");
      mv.setAttribute("environment-image", "neutral");
      mv.setAttribute("animation-name", "*");
      placeholder.replaceWith(mv);

    } else if (model.type === "fbx") {
      const viewerDiv = document.createElement("div");
      viewerDiv.className = "three-viewer";
      placeholder.replaceWith(viewerDiv);
      const viewer = new FBXViewer(viewerDiv);
      viewer.loadModel(URL.createObjectURL(model.file));

    } else if (model.type === "video") {
      const videoPreview = document.createElement("div");
      videoPreview.className = "video-preview";
      const video = document.createElement("video");
      video.src = URL.createObjectURL(model.file);
      video.muted = true;
      videoPreview.appendChild(video);

      const scrubBarContainer = document.createElement("div");
      scrubBarContainer.className = "scrub-bar-container";
      const scrubBar = document.createElement("div");
      scrubBar.className = "scrub-bar";
      scrubBarContainer.appendChild(scrubBar);
      const timeMarker = document.createElement("div");
      timeMarker.className = "time-marker";
      scrubBar.appendChild(timeMarker);
      videoPreview.appendChild(scrubBarContainer);

      let isDragging = false;

      scrubBarContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateVideoTime(e);
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        updateVideoTime(e);
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      function updateVideoTime(e) {
        if (!video.duration) return;
        const rect = scrubBarContainer.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const newTime = percentage * video.duration;
        video.currentTime = newTime;
        scrubBar.style.width = `${percentage * 100}%`;
        timeMarker.textContent = formatTime(newTime);
        timeMarker.style.left = `${percentage * 100}%`;
      }

      scrubBarContainer.addEventListener('mousemove', updateVideoTime);

      placeholder.replaceWith(videoPreview);

    } else if (model.type === "audio") {
      const audioTile = document.createElement("div");
      audioTile.className = "audio-tile";
      const audioHeader = document.createElement("div");
      audioHeader.className = "audio-header";
      const ext = model.name.split('.').pop().toUpperCase();
      audioHeader.innerHTML = '<i class="fa fa-music"></i> ' + ext;
      const audioControls = document.createElement("div");
      audioControls.className = "audio-controls";
      const audioElem = document.createElement("audio");
      audioElem.src = URL.createObjectURL(model.file);
      audioElem.controls = true;
      audioControls.appendChild(audioElem);
      audioTile.appendChild(audioHeader);
      audioTile.appendChild(audioControls);
      placeholder.replaceWith(audioTile);

    } else if (model.type === "image") {
      const imagePreview = document.createElement("div");
      imagePreview.className = "image-preview";
      const imgElem = document.createElement("img");
      imgElem.src = URL.createObjectURL(model.file);
      imagePreview.appendChild(imgElem);
      placeholder.replaceWith(imagePreview);
    }
  } catch (error) {
    console.error(`Error loading ${model.type} content:`, error);
    placeholder.innerHTML = `<i class="fa fa-exclamation-triangle"></i><br>Error loading ${model.type}`;
  }
}


function renderPage(pageIndex) {
  // Page rendering - Creates and displays asset preview tiles for the current page
  viewerContainer.innerHTML = "";
  const startIndex = pageIndex * UI.itemsPerPage;
  const pageItems = filteredModelFiles.slice(startIndex, startIndex + UI.itemsPerPage);
  pageItems.forEach(model => {
    // Create tile with placeholder
    const tile = document.createElement("div");
    tile.className = "model-tile" + (UI.selectedFiles.has(model.name) ? " selected" : "");
    tile.dataset.modelType = model.type;
    tile.dataset.modelName = model.name;

    // Add selection indicator
    const selectionIndicator = document.createElement('div');
    selectionIndicator.className = 'selection-indicator';
    selectionIndicator.innerHTML = '<i class="fa fa-check"></i>';
    tile.appendChild(selectionIndicator);

    // Add click handler for selection
    tile.addEventListener('click', (e) => {
      // Don't trigger selection when clicking fullscreen button or video controls
      if (e.target.closest('.fullscreen-btn') || e.target.closest('.scrub-bar-container')) {
        return;
      }
      UI.toggleSelectionUI(model.name, renderPage); // Use toggleSelectionUI from UI module
    });

    // Add fullscreen button if not audio
    if (model.type !== "audio") {
      const fsBtn = document.createElement('button');
      fsBtn.className = 'fullscreen-btn';
      fsBtn.innerHTML = '<i class="fa fa-expand"></i>';
      fsBtn.onclick = () => showFullscreen(model);
      tile.appendChild(fsBtn);
    }

    // Add placeholder based on type
    tile.appendChild(createPlaceholder(model.type));

    // Store model data for lazy loading
    tile.model = model;
    // Add name label
    const nameDiv = document.createElement("div");
    nameDiv.className = model.type === "video" ? "video-name" : "model-name";
    nameDiv.textContent = model.name;
    tile.appendChild(nameDiv);

    // Add file info (size and date)
    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    fileInfo.innerHTML = `
      ${formatFileSize(model.file.size)} •
      ${formatDate(model.file.lastModified)}
    `;
    tile.appendChild(fileInfo);

    viewerContainer.appendChild(tile);

    // Start observing the tile
    tileObserver.observe(tile);
  });
  updatePagination(); // Call updatePagination after rendering page
}

function updatePagination() {
  const totalPages = Math.ceil(filteredModelFiles.length / UI.itemsPerPage);
  UI.updatePagination(totalPages); // Call updatePagination from UI module
}


async function showFullscreen(model) {
  // Fullscreen view handler - Manages expanded view of assets with type-specific display logic
  const fullscreenOverlay = document.getElementById('fullscreenOverlay');
  const fullscreenViewer = document.getElementById('fullscreenViewer');
  const fullscreenVideo = document.getElementById('fullscreenVideo');

  fullscreenOverlay.style.display = 'flex';
  fullscreenViewer.innerHTML = '';
  fullscreenVideo.style.display = 'none';
  if (model.type === "glb") {
    const mv = document.createElement("model-viewer");
    mv.src = URL.createObjectURL(model.file);
    mv.setAttribute("camera-controls", "");
    mv.setAttribute("auto-rotate", "");
    mv.setAttribute("environment-image", "neutral");
    mv.setAttribute("animation-name", "*");
    mv.style.width = "100%";
    mv.style.height = "100%";
    fullscreenViewer.appendChild(mv);
    fullscreenViewer.style.display = 'block';
    currentFullscreenViewer = mv;
  } else if (model.type === "fbx") {
    const container = document.createElement('div');
    container.style.width = '50%';
    container.style.height = '100%';
    fullscreenViewer.appendChild(container);
    fullscreenViewer.style.display = 'block';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3);
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x3a3a3a);
    container.appendChild(renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    const mixer = new THREE.AnimationMixer();
    const clock = new THREE.Clock();
    new THREE.FBXLoader().load(URL.createObjectURL(model.file), (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scaleFactor = 2 / maxDim;
      object.scale.set(scaleFactor, scaleFactor, scaleFactor);
      object.position.sub(center.multiplyScalar(scaleFactor));
      scene.add(object);
      if (object.animations && object.animations.length > 0) {
        mixer.clipAction(object.animations[0], object).play();
      }
      controls.target.copy(object.position);
      controls.update();
    });
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      mixer.update(delta);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', onWindowResize, false);
    currentFullscreenViewer = {
      container,
      scene,
      camera,
      renderer,
      controls,
      mixer,
      animate,
      cleanup: () => {
        window.removeEventListener('resize', onWindowResize);
        renderer.dispose();
      }
    };
    function onWindowResize() {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  } else if (model.type === "video") {
    fullscreenViewer.style.display = 'none';
    fullscreenVideo.style.display = 'block';
    fullscreenVideo.src = URL.createObjectURL(model.file);
    fullscreenVideo.play();
    currentFullscreenViewer = fullscreenVideo;
  } else if (model.type === "image") {
    fullscreenViewer.style.display = 'block';
    fullscreenVideo.style.display = 'none';
    const img = document.createElement("img");
    img.src = URL.createObjectURL(model.file);
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    fullscreenViewer.innerHTML = "";
    fullscreenViewer.appendChild(img);
    currentFullscreenViewer = img;
  }
}


// Handle folder selection
async function handleFolderSelection() {
  console.log("Selecting folder");
  try {
    // Show directory picker
    const dirHandle = await window.showDirectoryPicker({
      startIn: lastDirectoryHandle || 'downloads'
    });

    // Store for future use
    lastDirectoryHandle = dirHandle;

    // Get the full path
    let fullPath = dirHandle.name;
    try {
      const relativeParts = [];
      let current = dirHandle;
      while (current) {
        relativeParts.unshift(current.name);
        current = await current.getParent();
      }
      fullPath = relativeParts.join('\\\\'); // Note: double backslash for path in input
      console.log("Full path:", fullPath);
    } catch (error) {
      console.log("Could not get full path:", error);
    }

    // Update input field with path
    folderPathInput.value = fullPath;

    // Process the directory
    await handleFolderPick(dirHandle);
  } catch (error) {
    console.error("Error selecting folder:", error);
    alert(`Error: ${error.message}`);
  }
}

// Function to handle loading folder from path
async function loadFolderFromPath(path) {
  console.log("Attempting to load folder from path:", path);
  try {
    // Try to use the last directory handle if available
    if (lastDirectoryHandle && path) {
      try {
        // Try to navigate to the specified path
        const parts = path.split('\\\\').filter(p => p); // Split by double backslash
        let currentHandle = lastDirectoryHandle;

        for (const part of parts) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        // Update input field with path
        folderPathInput.value = path;

        // Process the directory
        await handleFolderPick(currentHandle);
        return;
      } catch (error) {
        console.log("Failed to navigate from last handle:", error);
      }
    }

    // If no handle or navigation failed, show directory picker
    const dirHandle = await window.showDirectoryPicker({
      startIn: lastDirectoryHandle || 'downloads'
    });

    // Store for future use
    lastDirectoryHandle = dirHandle;

    // Get the full path
    let fullPath = dirHandle.name;
    try {
      const relativeParts = [];
      let current = dirHandle;
      while (current) {
        relativeParts.unshift(current.name);
        current = await current.getParent();
      }
      fullPath = relativeParts.join('\\\\'); // Note: double backslash for path in input
    } catch (error) {
      console.log("Could not get full path:", error);
    }

    // Update input field with path
    folderPathInput.value = fullPath;

    // Process the directory
    await handleFolderPick(dirHandle);
  } catch (error) {
    console.error("Error loading folder from path:", error);
    alert(`Error: ${error.message}`);
  }
}


// Handle Enter key in folder input
folderPathInput.addEventListener("keypress", async (event) => {
  if (event.key === "Enter") {
    console.log("Enter key pressed in folder input");
    await handleFolderSelection();
  }
});

folderPickerButton.addEventListener("click", async () => {
  // Folder selection handler
  console.log("Folder picker button clicked");
  try {
    await handleFolderSelection();
  } catch (error) {
    console.error("Error in folderPicker click:", error);
    alert(`Error: ${error.message}`);
  }
});


// Filter event setup
const filterCheckboxes = document.querySelectorAll('.dropdown-content input[type="checkbox"]');
filterCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    updateFilteredModelFiles();
    UI.currentPage = 0;
    updatePagination();
    renderPage(UI.currentPage);
  });
});


// Initialize items per page controls
itemsOptions.forEach(option => {
  option.addEventListener('click', () => {
    // Remove active class from all options
    itemsOptions.forEach(opt => opt.classList.remove('active'));
    // Add active class to clicked option
    option.classList.add('active');
    // Update items per page
    UI.itemsPerPage = parseInt(option.dataset.value);
    // Update button text
    itemsBtn.innerHTML = `${UI.itemsPerPage} Items <i class="fa fa-chevron-down"></i>`;
    // Update display
    UI.currentPage = 0;
    updatePagination();
    renderPage(UI.currentPage);
  });
});

// Initialize sort controls
sortOptions.forEach(option => {
  option.addEventListener('click', () => {
    // Remove active class from all options
    sortOptions.forEach(opt => opt.classList.remove('active'));
    // Add active class to clicked option
    option.classList.add('active');
    // Update sort field
    UI.currentSort.field = option.dataset.value;
    sortFiles();
    UI.currentPage = 0;
    updatePagination();
    renderPage(UI.currentPage);
  });
});

sortDirectionBtn.addEventListener('click', () => {
  UI.currentSort.direction = UI.currentSort.direction === 'asc' ? 'desc' : 'asc';
  sortDirectionBtn.classList.toggle('desc', UI.currentSort.direction === 'desc');
  sortDirectionBtn.querySelector('span').textContent =
    UI.currentSort.direction === 'asc' ? 'Ascending' : 'Descending';
  sortFiles();
  UI.currentPage = 0;
  updatePagination();
  renderPage(UI.currentPage);
});


// Pagination button event listeners (moved to ui.js to handle UI-related events)
UI.prevPageBtn.addEventListener("click", () => {
  if (UI.currentPage > 0) {
    UI.currentPage--;
    renderPage(UI.currentPage);
    updatePagination();
  }
});

UI.nextPageBtn.addEventListener("click", () => {
  const maxPage = Math.ceil(filteredModelFiles.length / UI.itemsPerPage) - 1;
  if (UI.currentPage < maxPage) {
    UI.currentPage++;
    renderPage(UI.currentPage);
    updatePagination();
  }
});


// Drag and Drop Handlers
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  viewerContainer.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.target === viewerContainer) {
    viewerContainer.classList.remove('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  viewerContainer.classList.remove('drag-over');

  console.log("Drop event triggered");

  try {
    const droppedFiles = e.dataTransfer.files;
    console.log("Number of dropped files:", droppedFiles.length);

    // Clear existing files
    modelFiles = [];
    viewerContainer.innerHTML = "";

    // Process each dropped file
    for (const file of droppedFiles) {
      console.log("Processing file:", file.name, "size:", file.size, "type:", file.type);

      const lowerCaseName = file.name.toLowerCase();
      let type = null;

      // Determine file type
      if (lowerCaseName.endsWith(".glb")) type = "glb";
      else if (lowerCaseName.endsWith(".fbx")) type = "fbx";
      else if (lowerCaseName.endsWith(".mp4") || lowerCaseName.endsWith(".webm") || lowerCaseName.endsWith(".ogg")) type = "video";
      else if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".wav")) type = "audio";
      else if (lowerCaseName.endsWith(".jpg") || lowerCaseName.endsWith(".jpeg") || lowerCaseName.endsWith(".png") || lowerCaseName.endsWith(".gif")) type = "image";

      if (type) {
        console.log("Adding file:", file.name, "as type:", type);
        modelFiles.push({ name: file.name, file, type });
      }
    }

    console.log("Total files added:", modelFiles.length);

    if (modelFiles.length > 0) {
      // Sort and display files
      modelFiles.sort((a, b) => a.name.localeCompare(b.name));
      updateFilteredModelFiles();
      UI.currentPage = 0;
      updatePagination();
      renderPage(UI.currentPage);
      console.log("View updated with new files");
    } else {
      console.log("No supported files found in drop");
      alert("No supported files found. Please drop GLB, FBX, video, audio, or image files.");
    }

  } catch (error) {
    console.error("Error processing dropped files:", error);
    alert(`Error processing files: ${error.message}`);
  }
}


// Add drag and drop event listeners
viewerContainer.addEventListener('dragenter', handleDragOver);
viewerContainer.addEventListener('dragover', handleDragOver);
viewerContainer.addEventListener('dragleave', handleDragLeave);
viewerContainer.addEventListener('drop', handleDrop);


export {
  getFilesFromDirectory,
  handleFolderPick,
  loadTileContent,
  renderPage,
  handleFolderSelection,
  loadFolderFromPath,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  modelFiles,
  filteredModelFiles,
  updateFilteredModelFiles,
  sortFiles,
  updatePagination,
  showFullscreen,
  formatFileSize,
  formatDate,
  formatTime,
  createPlaceholder,
  lastDirectoryHandle,
  currentFullscreenViewer,
  tileObserver,
  observerOptions,
  folderPickerButton,
  folderPathInput,
  viewerContainer,
  filterFBX,
  filterGLB,
  filterVideo,
  filterAudio,
  filterImage,
  itemsOptions,
  itemsBtn,
  sortOptions,
  sortDirectionBtn
};
"""

    viewer_fbx_js_content = """// viewer_fbx.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

class FBXViewer {
  constructor(container) {
    this.container = container;
    this.init();
  }
  async init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 200/180, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(200, 180);
    this.renderer.setClearColor(0x3a3a3a);
    this.container.appendChild(this.renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0.5, 1, 0.5);
    this.scene.add(directionalLight);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.animate();
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.mixer) { this.mixer.update(this.clock.getDelta()); }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  loadModel(url) {
    new FBXLoader().load(url, (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.5 / maxDim;
      object.scale.set(scale, scale, scale);
      object.position.sub(center.multiplyScalar(scale));
      this.scene.add(object);
      if (object.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(object);
        const action = this.mixer.clipAction(object.animations[0]);
        action.play();
      }
      this.controls.reset();
      this.camera.lookAt(0, 0, 0);
    });
  }
}

export default FBXViewer;
"""

    file_contents = {
        os.path.join(folder_name, "Digital_Asset_Viewer.html"): html_content,
        os.path.join(folder_name, "styles.css"): css_content,
        os.path.join(folder_name, "main.js"): main_js_content,
        os.path.join(folder_name, "ui.js"): ui_js_content,
        os.path.join(folder_name, "asset_loading.js"): asset_loading_js_content,
        os.path.join(folder_name, "viewer_fbx.js"): viewer_fbx_js_content,
    }

    # Write files to the folder
    for file_path, content in file_contents.items():
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    # Create the zip file
    with zipfile.ZipFile(zip_file_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(folder_name):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_name) # Get relative path for inside the zip
                zipf.write(file_path, arcname=arcname)

    print(f"Successfully created '{zip_file_name}' in the current directory.")

if __name__ == "__main__":
    create_digital_asset_viewer_zip()