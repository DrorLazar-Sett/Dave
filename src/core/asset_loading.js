// asset_loading.js
import FBXViewer from '../viewers/viewer_fbx.js';
import { memoryManager } from '../utils/memoryManager.js';
import { detectFileType } from '../utils/fileTypeDetector.js';
import { assetHandlerFactory } from '../handlers/AssetHandlerFactory.js';
import { errorHandler, withErrorHandling } from '../utils/errorHandler.js';
import { activeFilters } from '../shared/filters.js';
import {
  getCurrentPage,
  getItemsPerPage,
  getLoadSubfolders,
  getSubfolderDepth,
  getCurrentSort,
  getSelectedFiles,
  setCurrentPage,
  setItemsPerPage,
  setLoadSubfolders,
  setCurrentSort,
  updatePagination,
  toggleSelectionUI,
  fileMatchesSearch,
  getUIElements,
  initializeUI,
  openCustomTextModal
} from './ui.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Thumbnail Parameters
const MAX_THUMBNAIL_WIDTH = 400; // Max width for generated thumbnails
const MAX_THUMBNAIL_HEIGHT = 400; // Max height for generated thumbnails

// REMOVED: S3 Functions have been removed
// Keep track of active FBX viewers
// Deprecated - now managed by memoryManager
// export const activeFbxViewers = new Set();

const folderPickerButton = document.getElementById("folderPicker");
// Remove folderPathInput reference since we no longer use it
const viewerContainer = document.getElementById("viewerContainer");
const filterOptions = document.querySelectorAll('.filter-option');
const itemsOptions = document.querySelectorAll('.items-option');
// Use a specific selector to get the correct button by ID instead of class
const itemsBtn = document.getElementById('itemsPerPageBtn');
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

// Track loading state to prevent multiple loads
const tileLoadingStates = new WeakMap();
// Track cleanup timeouts to allow cancellation
const tileCleanupTimeouts = new WeakMap();

const tileObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    const tile = entry.target;
    const model = tile.model;
    
    if (entry.isIntersecting) {
      // Cancel any pending cleanup
      const cleanupTimeout = tileCleanupTimeouts.get(tile);
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        tileCleanupTimeouts.delete(tile);
      }
      
      // Check if tile is already loading or loaded
      const loadingState = tileLoadingStates.get(tile);
      if (!loadingState || loadingState === 'unloaded') {
        tileLoadingStates.set(tile, 'loading');
        loadTileContent(tile).then(() => {
          tileLoadingStates.set(tile, 'loaded');
        }).catch((error) => {
          console.error('Failed to load tile content:', error);
          tileLoadingStates.set(tile, 'error');
        });
      }
    } else {
      // Tile is no longer intersecting (scrolled out of view)
      const loadingState = tileLoadingStates.get(tile);

      // Only cleanup if tile is loaded and not currently loading
      if (model && loadingState === 'loaded') {
        // Delay cleanup to avoid issues during rapid scrolling
        const cleanupTimeout = setTimeout(() => {
        // Revoke blob URL if it exists
        if (model.blobUrl) {
          URL.revokeObjectURL(model.blobUrl);
          model.blobUrl = null;
          model.blobData = null; // Clear blob data as well
          console.log(`Revoked blobUrl for out-of-view tile: ${model.name}`);
        }

        // Dispose FBXViewer if it exists for this tile and is not loading
        if (tile.fbxViewerInstance) {
          // Only dispose if the viewer is not currently loading and not already disposed
          if (!tile.fbxViewerInstance.isLoading && !tile.fbxViewerInstance.isDisposed) {
            console.log(`Disposing FBXViewer for out-of-view tile: ${model.name}`);
            tile.fbxViewerInstance.dispose();
            memoryManager.disposeFbxViewer(tile.fbxViewerInstance);
            tile.fbxViewerInstance = null;
          } else if (tile.fbxViewerInstance.isLoading) {
            console.log(`Skipping disposal of FBXViewer for ${model.name} - still loading`);
          }
        }

        // Specific cleanup for GLB (<model-viewer>)
        if (model.type === "glb") {
          const modelViewerElement = tile.querySelector('model-viewer');
          if (modelViewerElement) {
            console.log(`Removing <model-viewer> for out-of-view tile: ${model.name}`);
            modelViewerElement.remove();
          }
        }

        // Clear thumbnailDataUrl to free memory
        if (model.thumbnailDataUrl) {
            console.log(`Clearing thumbnailDataUrl for out-of-view tile: ${model.name}`);
            model.thumbnailDataUrl = null;
        }

        // Clear the placeholder content of the tile to ensure it's reloaded if it comes back into view
        // This ensures loadTileContent will re-trigger fully.
        // For GLB, modelViewerElement.remove() is already done.
        // For FBX, fbxViewerInstance.dispose() also removes the renderer's DOM element.
        // This generic currentContent.remove() might be redundant for FBX but ensures other types are handled.
        const currentContent = tile.querySelector('.three-viewer, .video-preview, .audio-tile, .image-preview, .font-preview');
        if (currentContent) {
            currentContent.remove(); // model-viewer already removed if GLB
        }

        const placeholder = tile.querySelector('.placeholder');
        if (!placeholder) { // If placeholder was removed (e.g. by replacing it with content)
            tile.appendChild(createPlaceholder(model.type));
        } else { // If placeholder still exists (e.g. content was loaded next to it, or it's already there)
             placeholder.innerHTML = `<i class="fa fa-spinner fa-spin"></i><br>Loading ${model.type}...`;
             placeholder.style.display = 'block'; // Ensure it's visible
        }
        
        // Mark tile as unloaded so it can be reloaded when it comes back into view
        tileLoadingStates.set(tile, 'unloaded');
        }, 500); // 500ms delay before cleanup
        
        // Store the timeout so it can be cancelled if tile comes back into view
        tileCleanupTimeouts.set(tile, cleanupTimeout);
      }
    }
  });
}, observerOptions);

// Helper function to generate thumbnails
async function generateThumbnail(imageUrl, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Handle CORS if image is from a different origin and server supports it
    img.onload = () => {
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Ensure dimensions are at least 1px to avoid canvas errors
      width = Math.max(1, Math.floor(width));
      height = Math.max(1, Math.floor(height));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG for smaller size, quality 0.8
        resolve(dataUrl);
      } catch (e) {
        console.error("Error converting canvas to Data URL:", e);
        // This can happen due to tainted canvas (CORS issues) or other errors
        reject(e);
      }
    };
    img.onerror = (err) => {
      console.error("Error loading image for thumbnail generation:", imageUrl, err);
      reject(err);
    };
    img.src = imageUrl;
  });
}

// Format file size in a human-readable format
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Function to load a font using FontFace API
async function loadFont(fontUrl, fontName) {
  try {
    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
    await fontFace.load();
    document.fonts.add(fontFace);
    return fontFace;
  } catch (error) {
    console.error(`Error loading font ${fontName}:`, error);
    throw error;
  }
}

// Format date in a readable format
function formatDate(date) {
  return new Date(date).toLocaleString();
}

function formatTime(seconds) {
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

// Tile loading is handled directly without caching

// File retrieval function - Recursively collects files from selected directory
// This function is being replaced by the Web Worker logic for handleFolderPick.
// It can be removed if not used elsewhere, or kept if other parts of the application use it.
// For now, we will leave it but ensure handleFolderPick does not use it.
async function getFilesFromDirectory(dirHandle, recursive, currentDepth = 0) {
  console.warn("getFilesFromDirectory is deprecated for handleFolderPick, use worker instead.");
  let files = [];
  const depthSetting = getSubfolderDepth(); // Use the same source for depth as the worker will
  const maxRecursiveDepth = depthSetting === 'all' ? Infinity : depthSetting === 'off' ? 0 : parseInt(depthSetting);

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "file") {
      files.push({ name, handle });
    } else if (handle.kind === "directory" && recursive && currentDepth < maxRecursiveDepth) {
      const subFiles = await getFilesFromDirectory(handle, true, currentDepth + 1);
      files = files.concat(subFiles);
    }
  }
  return files;
}

// Sort files based on current sort settings
function sortFiles() {
  const currentSort = getCurrentSort();
  filteredModelFiles.sort((a, b) => {
    let comparison = 0;
    switch (currentSort.field) {
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
    return currentSort.direction === 'asc' ? comparison : -comparison;
  });
  
  // Re-render the current page with sorted files
  renderPage(getCurrentPage());
}


// Filter management - Updates displayed assets based on active file type filters and search
function updateFilteredModelFiles() {
  const previousLength = filteredModelFiles.length;
  filteredModelFiles = modelFiles.filter(item => 
    (activeFilters.has(item.type) || activeFilters.has(item.subtype)) && fileMatchesSearch(item)
  );

  // Only trigger full re-render if filter actually changed the visible items
  if (previousLength !== filteredModelFiles.length) {
    setCurrentPage(0);
    renderPage(getCurrentPage());
  }
}

// Initialize filter options
filterOptions.forEach(option => {
  const type = option.dataset.type;
  option.classList.add('active');
  
  option.addEventListener('click', () => {
    const isActive = option.classList.toggle('active');
    if (isActive) {
      activeFilters.add(type);
    } else {
      activeFilters.delete(type);
    }
    updateFilteredModelFiles();
  });
});

async function handleFolderPick(dirHandle) {
  console.log("Starting folder processing with Web Worker");

  // Dispose of all active FBX viewers before loading new set
  // Clean up all FBX viewers before local folder pick
  memoryManager.disposeAllFbxViewers();

  modelFiles = []; // Clear existing model files
  viewerContainer.innerHTML = `<div class="loading-message"><i class="fa fa-spinner fa-spin"></i> Scanning folder... <span id="file-scan-count">0</span> files found.</div>`;
  const fileScanCountElement = document.getElementById('file-scan-count');

  try {
    const depthSetting = getSubfolderDepth(); // e.g., 'off', '1', '2', 'all'

    // The worker's maxDepth parameter expects 'off', 'all', or a number.
    // 'off' in UI means depth 0 for worker (scan only top-level files, no recursion for subdirs)
    // '1', '2', etc. are passed as is.
    // 'all' is passed as is.
    const workerMaxDepth = depthSetting;


    const worker = new Worker('../workers/folder_scanner_worker.js', { type: 'module' });
    let newModelFiles = [];
    let scanErrorOccurred = false;

    worker.postMessage({
      dirHandle: dirHandle,
      maxDepth: workerMaxDepth, // Pass the UI setting directly
      currentPath: dirHandle.name + '/' // Initial path prefix
    });

    worker.onmessage = (event) => {
      if (event.data.status === 'fileFound') {
        newModelFiles.push(event.data.fileEntry);
        if (fileScanCountElement) {
          fileScanCountElement.textContent = newModelFiles.length;
        }
      } else if (event.data.status === 'scanComplete') {
        if (scanErrorOccurred) {
            console.warn("Scan completed, but errors occurred during the process.");
            // Potentially show a summary of errors or a general warning.
            // For now, we proceed to render what was found.
        }
        modelFiles = newModelFiles;
        modelFiles.sort((a, b) => a.name.localeCompare(b.name));
        updateFilteredModelFiles();
        setCurrentPage(0);
        updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
        renderPage(getCurrentPage());
        console.log(`Worker scan complete. Processed ${modelFiles.length} supported files.`);
        if (modelFiles.length === 0 && !scanErrorOccurred) {
            viewerContainer.innerHTML = "<div class='no-files-message'>No supported files found in this folder.</div>";
        }
        worker.terminate();
      } else if (event.data.status === 'scanError') {
        scanErrorOccurred = true;
        console.error("Error from folder scanner worker:", event.data.error);
        // Display a persistent error for this specific file/directory, but allow scan to continue for others.
        // For a fatal error that should stop everything, we might need a different status or handle it in worker.onerror
        // For now, we log it and let scanComplete finalize the UI.
        // A more robust solution might collect all errors and display them at the end.
        const errorMsgDiv = document.createElement('div');
        errorMsgDiv.className = 'error-message';
        errorMsgDiv.textContent = `Scan error: ${event.data.error}`;
        viewerContainer.appendChild(errorMsgDiv); // Append error to viewer
      } else if (event.data.status === 'scanProgress') {
        // Optional: Update UI with progress messages, e.g., "Scanning directory X..."
        // console.log("Worker progress:", event.data.message, event.data.count);
      }
    };

    worker.onerror = (error) => {
      console.error("Critical error in folder scanner worker:", error);
      viewerContainer.innerHTML = `<div class='error-message'>Critical worker error: ${error.message}. Please try again or check console.</div>`;
      worker.terminate();
    };

  } catch (error) {
    console.error("Error initializing folder scan with worker:", error);
    viewerContainer.innerHTML = `<div class='error-message'>Error setting up folder scan: ${error.message}</div>`;
    // alert(`Error: ${error.message}\n\nFailed to access folder contents. Ensure you have permission.`);
  }
}

async function loadTileContent(tile) {
  const model = tile.model;
  let placeholder = tile.querySelector('.placeholder');

  // Ensure any existing content (including previous FBX viewers) is cleared
  // This is important if a tile is reloaded after scrolling out and back in.
  if (tile.fbxViewerInstance) {
    console.log(`Clearing previous FBXViewer instance for tile: ${model.name}`);
    tile.fbxViewerInstance.dispose();
    memoryManager.disposeFbxViewer(tile.fbxViewerInstance);
    tile.fbxViewerInstance = null;
  }
  const existingContent = tile.querySelector('model-viewer, .three-viewer, .video-preview, .audio-tile, .image-preview, .font-preview');
  if (existingContent) {
    existingContent.remove();
  }

  // Re-create or reset placeholder if it was removed or if content was cleared
  if (!placeholder) {
    placeholder = createPlaceholder(model.type);
    // Ensure placeholder is at the correct position (e.g., before name/info divs if they exist)
    const nameDiv = tile.querySelector('.model-name, .video-name');
    if (nameDiv) {
        tile.insertBefore(placeholder, nameDiv);
    } else {
        tile.appendChild(placeholder);
    }
  } else {
    placeholder.innerHTML = `<i class="fa fa-spinner fa-spin"></i><br>Loading ${model.type}...`;
    placeholder.style.display = 'block'; // Make sure it's visible
  }


  try {
    // For local files
    let fileUrl;
    // For local files, use createObjectURL
    fileUrl = URL.createObjectURL(model.file);
    // Don't track local file URLs in memory manager as they're temporary

    // Check if we should use the new asset handler system
    const useNewHandler = false; // Temporarily disabled to fix issues
    
    if (useNewHandler && model.subtype && assetHandlerFactory && assetHandlerFactory.isSupported) {
      try {
        if (assetHandlerFactory.isSupported(model.subtype)) {
          // Use the new asset handler system
          placeholder.remove();
          await assetHandlerFactory.loadThumbnail(model, tile, { tileElement: tile });
          return;
        }
      } catch (handlerError) {
        console.error('Error using asset handler:', handlerError);
        // Fall through to legacy handler
      }
    }
    
    // Legacy content loading based on type
    if (model.subtype === "glb") {
      if (!customElements.get('model-viewer')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      
      const mv = document.createElement("model-viewer");
      mv.src = fileUrl;
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("auto-rotate", "");
      mv.setAttribute("environment-image", "neutral");
      mv.setAttribute("animation-name", "*");
      mv.setAttribute("disable-zoom", ""); // Disable mouse wheel zoom to allow page scrolling
      placeholder.replaceWith(mv);

    } else if (model.subtype === "fbx") {
      const viewerDiv = document.createElement("div");
      viewerDiv.className = "three-viewer";
      placeholder.replaceWith(viewerDiv);
      const viewer = new FBXViewer(viewerDiv, { 
        enableZoom: false, // Disable zoom in grid view
        onError: (error) => {
          console.error(`Failed to load FBX file ${model.name}:`, error);
          errorHandler.reportAssetError('fbx', model.name, error);
          
          // Replace viewer with error message
          viewerDiv.innerHTML = `<div class="load-error"><i class="fa fa-exclamation-triangle"></i><br>Error loading FBX</div>`;
          
          // Clean up the failed viewer
          if (tile.fbxViewerInstance) {
            memoryManager.disposeFbxViewer(tile.fbxViewerInstance);
            tile.fbxViewerInstance = null;
          }
          
          // Mark as error state
          tileLoadingStates.set(tile, 'error');
        }
      });
      tile.fbxViewerInstance = viewer; // Store viewer instance on the tile
      memoryManager.registerFbxViewer(viewer);
      viewer.loadModel(fileUrl);

    } else if (model.type === "video") {
      const videoPreview = document.createElement("div");
      videoPreview.className = "video-preview";
      const video = document.createElement("video");
      video.src = fileUrl;
      video.muted = true;
      video.className = 'preview-video'; // Add class for easy selection
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
      audioElem.src = fileUrl;
      audioElem.controls = true;
      
      // Add event listener to stop other audio when this one starts playing
      audioElem.addEventListener('play', () => {
        // Stop all other audio elements
        document.querySelectorAll('audio').forEach(audio => {
          if (audio !== audioElem && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
          }
        });
      });
      
      audioControls.appendChild(audioElem);
      audioTile.appendChild(audioHeader);
      audioTile.appendChild(audioControls);

      // Add fullscreen button
      const fsBtn = document.createElement('button');
      fsBtn.className = 'fullscreen-btn';
      fsBtn.innerHTML = '<i class="fa fa-expand"></i>';
      fsBtn.onclick = () => showFullscreen(model);
      audioTile.appendChild(fsBtn);

      placeholder.replaceWith(audioTile);

    } else if (model.type === "image") {
      const imagePreview = document.createElement("div");
      imagePreview.className = "image-preview";
      const imgElem = document.createElement("img");
      imgElem.draggable = false; // Prevent dragging of images

      if (model.thumbnailDataUrl) {
        imgElem.src = model.thumbnailDataUrl;
        console.log(`Using cached thumbnail for ${model.name}`);
      } else {
        try {
          console.log(`Generating thumbnail for ${model.name} from ${fileUrl}`);
          const thumbnailDataUrl = await generateThumbnail(fileUrl, MAX_THUMBNAIL_WIDTH, MAX_THUMBNAIL_HEIGHT);
          model.thumbnailDataUrl = thumbnailDataUrl;
          imgElem.src = model.thumbnailDataUrl;
          console.log(`Successfully generated and applied thumbnail for ${model.name}`);
        } catch (thumbError) {
          console.error(`Thumbnail generation failed for ${model.name}:`, thumbError);
          imgElem.src = fileUrl; // Fallback to full image
          // Optionally, store the original fileUrl as thumbnail to prevent reprocessing if it's small
          // This would require an additional check (e.g. image dimensions) before trying to generate.
          // For now, we always attempt generation if no thumbnail exists.
        }
      }

      imagePreview.appendChild(imgElem);
      placeholder.replaceWith(imagePreview);
    } else if (model.type === "font") {
      // Create font preview container
      const fontPreview = document.createElement("div");
      fontPreview.className = "font-preview";
      
      // Get preview text (default or custom)
      const previewText = localStorage.getItem('fontPreviewText') || 
        "The quick brown fox jumps over the lazy dog";
      
      // Generate a unique font family name to avoid conflicts
      const fontId = `font-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      try {
        // Load the font using FontFace API
        await loadFont(fileUrl, fontId);
        
        // Get the saved font size or use default
        const savedFontSize = localStorage.getItem(`fontSize_${model.name}`) || localStorage.getItem('defaultFontSize') || '16';
        
        // Create text container with the loaded font
        const textContainer = document.createElement("div");
        textContainer.style.fontFamily = fontId;
        textContainer.style.fontSize = `${savedFontSize}px`;
        textContainer.textContent = previewText;
        fontPreview.appendChild(textContainer);
        
        // Add custom text button (functionality to be added later)
        const customBtn = document.createElement("button");
        customBtn.className = "custom-text-btn";
        customBtn.innerHTML = '<i class="fa fa-edit"></i>';
        customBtn.title = "Customize preview text";
        customBtn.onclick = (e) => {
          e.stopPropagation();
          console.log('Font custom button clicked', model, fontId);
          try {
            openCustomTextModal(model, fontId);
          } catch (error) {
            console.error('Error opening custom text modal:', error);
          }
        };
        fontPreview.appendChild(customBtn);
        
        placeholder.replaceWith(fontPreview);
      } catch (fontLoadError) {
        console.error(`Error loading font ${model.name}:`, fontLoadError);
        placeholder.innerHTML = `<i class="fa fa-exclamation-triangle"></i><br>Error loading font`;
      }
    }
  } catch (error) {
    console.error(`Error loading ${model.type} content:`, error);
    errorHandler.reportAssetError(model.subtype || model.type, model.name, error);
    placeholder.innerHTML = `<i class="fa fa-exclamation-triangle"></i><br>Error loading ${model.type}`;
  }
}

function renderPage(pageIndex) {
  // Clean up resources of existing tiles before clearing them
  for (const tileElement of viewerContainer.childNodes) {
    if (tileElement.nodeType === Node.ELEMENT_NODE && tileElement.classList.contains('model-tile')) {
      memoryManager.cleanupTile(tileElement);
      // Clear loading state when tile is removed
      tileLoadingStates.delete(tileElement);
    }
  }

  viewerContainer.innerHTML = "";
  const startIndex = pageIndex * getItemsPerPage();
  const pageItems = filteredModelFiles.slice(startIndex, startIndex + getItemsPerPage());
  const selectedFiles = getSelectedFiles();
  
  pageItems.forEach(model => {
    const tile = document.createElement("div");
    tile.className = "model-tile" + (selectedFiles.has(model.name) ? " selected" : "");
    tile.dataset.modelType = model.type;
    tile.dataset.modelName = model.name;

    const selectionIndicator = document.createElement('div');
    selectionIndicator.className = 'selection-indicator';
    selectionIndicator.innerHTML = '<i class="fa fa-check"></i>';
    tile.appendChild(selectionIndicator);

    tile.addEventListener('click', (e) => {
      if (e.target.closest('.fullscreen-btn') || e.target.closest('.scrub-bar-container')) {
        return;
      }
      if (e.target.closest('.selection-indicator')) {
        toggleSelectionUI(model.name);
      }
    });

    const fsBtn = document.createElement('button');
    fsBtn.className = 'fullscreen-btn';
    fsBtn.innerHTML = '<i class="fa fa-expand"></i>';
    fsBtn.onclick = () => showFullscreen(model);
    tile.appendChild(fsBtn);

    tile.appendChild(createPlaceholder(model.type));
    tile.model = model;

    const nameDiv = document.createElement("div");
    nameDiv.className = model.type === "video" ? "video-name" : "model-name";
    nameDiv.textContent = model.name;
    tile.appendChild(nameDiv);

    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    fileInfo.innerHTML = `
      ${formatFileSize(model.file.size)} •
      ${formatDate(model.file.lastModified)}
    `;
    tile.appendChild(fileInfo);

    viewerContainer.appendChild(tile);
    tileObserver.observe(tile);
  });
  
  updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
}

async function showFullscreen(model) {
  const fullscreenOverlay = document.getElementById('fullscreenOverlay');
  const fullscreenViewer = document.getElementById('fullscreenViewer');
  const fullscreenVideo = document.getElementById('fullscreenVideo');
  const fullscreenInfo = document.getElementById('fullscreenInfo');
  const fullscreenFilename = document.querySelector('.fullscreen-filename');
  const fullscreenDetails = document.querySelector('.fullscreen-details');
  const fullscreenPath = document.querySelector('.fullscreen-path');

  // Update file information
  fullscreenFilename.textContent = model.name;
  fullscreenDetails.textContent = `${formatFileSize(model.file.size)} • ${model.type.toUpperCase()} • ${formatDate(model.file.lastModified)}`;
  fullscreenPath.textContent = model.fullPath || '';

  fullscreenOverlay.style.display = 'flex';
  fullscreenOverlay.style.opacity = '1';
  fullscreenViewer.innerHTML = '';
  fullscreenVideo.style.display = 'none';
  
  // Check if we should use the new asset handler system
  const useNewHandler = false; // Temporarily disabled to fix issues
  
  if (useNewHandler && model.subtype && assetHandlerFactory && assetHandlerFactory.isSupported) {
    try {
      if (assetHandlerFactory.isSupported(model.subtype)) {
        const cleanupInfo = await assetHandlerFactory.loadFullscreen(model, fullscreenViewer, { 
          fullscreenVideo,
          fullscreenInfo 
        });
        
        currentFullscreenViewer = {
          ...cleanupInfo,
          fileName: model.name
        };
        return;
      }
    } catch (error) {
      console.error('Error loading fullscreen with new handler:', error);
      // Fall back to legacy handler
    }
  }
  
  // Legacy fullscreen handling
  let fileUrl;
  let needsCleanup = false;

  try {
    // For local files, create a new object URL
    fileUrl = URL.createObjectURL(model.file);
    needsCleanup = true;
    
    // Now process based on file type
    if (model.subtype === "glb") {
      if (!customElements.get('model-viewer')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      
      const mv = document.createElement("model-viewer");
      mv.src = fileUrl;
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("auto-rotate", "");
      mv.setAttribute("environment-image", "neutral");
      mv.setAttribute("animation-name", "*");
      mv.style.width = "100%";
      mv.style.height = "100%";
      fullscreenViewer.innerHTML = '';
      fullscreenViewer.appendChild(mv);
      fullscreenViewer.style.display = 'block';
      currentFullscreenViewer = { 
        ...mv, 
        fileName: model.name,
        cleanup: needsCleanup ? () => {
          if (fileUrl) URL.revokeObjectURL(fileUrl);
        } : undefined
      };
      
    } else if (model.subtype === "fbx") {
      const container = document.createElement('div');
      container.style.width = '100%';
      container.style.height = '100%';
      container.className = 'three-viewer';
      fullscreenViewer.innerHTML = '';
      fullscreenViewer.appendChild(container);
      fullscreenViewer.style.display = 'block';
      
      const viewer = new FBXViewer(container, { enableZoom: true }); // Enable zoom in fullscreen
      memoryManager.registerFbxViewer(viewer);
      
      // Set error handler for fullscreen viewer
      viewer.onLoadError = (error) => {
        console.error(`Failed to load FBX file ${model.name} in fullscreen:`, error);
        errorHandler.reportAssetError('fbx', model.name, error);
        
        // Show error in fullscreen
        fullscreenViewer.innerHTML = `
          <div class="fullscreen-error">
            <i class="fa fa-exclamation-triangle fa-2x"></i><br>
            Error loading FBX file<br>
            <small>${error.message || 'Unknown error'}</small>
          </div>
        `;
        
        // Clean up the failed viewer
        memoryManager.disposeFbxViewer(viewer);
      };
      
      viewer.loadModel(fileUrl);
      
      currentFullscreenViewer = {
        viewerInstance: viewer, // Store the actual viewer instance
        cleanup: () => {
          console.log(`Cleaning up fullscreen FBX viewer for: ${model.name}`);
          memoryManager.disposeFbxViewer(viewer);
          if (needsCleanup && fileUrl) {
            URL.revokeObjectURL(fileUrl);
          }
        },
        fileName: model.name
      };
      
    } else if (model.type === "video") {
      fullscreenViewer.style.display = 'none';
      fullscreenVideo.style.display = 'block';
      fullscreenVideo.src = fileUrl;
      fullscreenVideo.play();
      
      // Store reference to preview video for cleanup
      const previewVideo = viewerContainer.querySelector(`[data-model-name="${model.name}"] video`);
      currentFullscreenViewer = {
        type: 'video',
        previewVideo: previewVideo,
        fileName: model.name,
        cleanup: needsCleanup ? () => {
          if (fileUrl) URL.revokeObjectURL(fileUrl);
        } : undefined
      };
      
    } else if (model.type === "image") {
      fullscreenViewer.style.display = 'block';
      fullscreenVideo.style.display = 'none';
      const img = document.createElement("img");
      img.src = fileUrl;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      fullscreenViewer.innerHTML = "";
      fullscreenViewer.appendChild(img);
      
      currentFullscreenViewer = { 
        ...img, 
        fileName: model.name,
        cleanup: needsCleanup ? () => {
          if (fileUrl) URL.revokeObjectURL(fileUrl);
        } : undefined
      };
      
    } else if (model.type === "audio") {
      fullscreenViewer.style.display = 'block';
      fullscreenVideo.style.display = 'none';
      
      const audioContainer = document.createElement("div");
      audioContainer.className = "fullscreen-audio";
      
      const audioHeader = document.createElement("div");
      audioHeader.className = "fullscreen-audio-header";
      const ext = model.name.split('.').pop().toUpperCase();
      audioHeader.innerHTML = '<i class="fa fa-music"></i> ' + ext;
      
      const audioControls = document.createElement("div");
      audioControls.className = "fullscreen-audio-controls";
      const audioElem = document.createElement("audio");
      audioElem.src = fileUrl;
      audioElem.controls = true;
      audioElem.style.width = "100%";
      
      audioControls.appendChild(audioElem);
      audioContainer.appendChild(audioHeader);
      audioContainer.appendChild(audioControls);
      
      fullscreenViewer.innerHTML = "";
      fullscreenViewer.appendChild(audioContainer);
      
      currentFullscreenViewer = {
        type: 'audio',
        element: audioElem,
        fileName: model.name,
        cleanup: () => {
          audioElem.pause();
          audioElem.currentTime = 0;
          if (needsCleanup && fileUrl) URL.revokeObjectURL(fileUrl);
        }
      };
    } else if (model.type === "font") {
      fullscreenViewer.style.display = 'flex'; // Use flex to center content
      fullscreenVideo.style.display = 'none';

      const fontDisplayContainer = document.createElement("div");
      fontDisplayContainer.className = "fullscreen-font-display"; // For styling

      // Get preview text (default or custom)
      const previewText = localStorage.getItem('fontPreviewText') || 
        "The quick brown fox jumps over the lazy dog. 0123456789";
      
      // Generate a unique font family name
      const fontId = `font-fullscreen-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      try {
        await loadFont(fileUrl, fontId);
        
        // Get the saved font size or use a larger default for fullscreen
        const savedFontSize = localStorage.getItem(`fontSize_${model.name}`) || localStorage.getItem('defaultFontSize') || '40';
        
        const textElement = document.createElement("p");
        textElement.style.fontFamily = fontId;
        textElement.textContent = previewText;
        textElement.style.fontSize = `${savedFontSize}px`;
        textElement.style.textAlign = "center";
        textElement.style.padding = "20px";
        textElement.style.wordBreak = "break-word";

        fontDisplayContainer.appendChild(textElement);
        fullscreenViewer.innerHTML = ""; // Clear any loading messages
        fullscreenViewer.appendChild(fontDisplayContainer);
        
        // Show and update the font size control
        const fontSizeControl = document.getElementById('fullscreenFontSizeControl');
        const fontSizeSlider = document.getElementById('fullscreenFontSizeSlider');
        const fontSizeValue = document.getElementById('fullscreenFontSizeValue');
        
        if (fontSizeControl && fontSizeSlider && fontSizeValue) {
          fontSizeControl.style.display = 'flex';
          fontSizeSlider.value = savedFontSize;
          fontSizeValue.textContent = savedFontSize;
        }

        currentFullscreenViewer = {
          type: 'font',
          fileName: model.name,
          fontId: fontId, // Store fontId for potential cleanup if needed
          cleanup: () => {
            // Hide the font size control when exiting fullscreen
            const fontSizeControl = document.getElementById('fullscreenFontSizeControl');
            if (fontSizeControl) {
              fontSizeControl.style.display = 'none';
            }
            
            // Optional: remove font from document.fonts if it causes issues
            // document.fonts.delete(fontId); 
            if (needsCleanup && fileUrl) URL.revokeObjectURL(fileUrl);
          }
        };
      } catch (fontLoadError) {
        console.error(`Error loading font ${model.name} for fullscreen:`, fontLoadError);
        fullscreenViewer.innerHTML = `<div class="fullscreen-error"><i class="fa fa-exclamation-triangle fa-2x"></i><br>Error loading font</div>`;
      }
    }
  } catch (error) {
    console.error("Error in showFullscreen:", error);
    fullscreenViewer.innerHTML = `<div class="fullscreen-error"><i class="fa fa-exclamation-triangle fa-2x"></i><br>Error: ${error.message}</div>`;
  }
}

let isDirectoryPickerActive = false;

async function handleFolderSelection() {
  console.log("Selecting folder");
  if (isDirectoryPickerActive) {
    console.log("Directory picker is already active");
    return;
  }
  
  try {
    isDirectoryPickerActive = true;
    const dirHandle = await window.showDirectoryPicker({
      startIn: lastDirectoryHandle || 'downloads'
    });

    lastDirectoryHandle = dirHandle;

    try {
      const relativeParts = [];
      let current = dirHandle;
      while (current) {
        relativeParts.unshift(current.name);
        current = await current.getParent();
      }
      const fullPath = relativeParts.join('\\');
      console.log("Full path:", fullPath);
    } catch (error) {
      console.log("Could not get full path:", error);
    }

    await handleFolderPick(dirHandle);
  } catch (error) {
    console.error("Error selecting folder:", error);
    if (error.name !== 'AbortError') {
      alert(`Error: ${error.message}`);
    }
  } finally {
    isDirectoryPickerActive = false;
  }
}

async function loadFolderFromPath(path) {
  console.log("Attempting to load folder from path:", path);
  if (isDirectoryPickerActive) {
    console.log("Directory picker is already active");
    return;
  }
  
  try {
    isDirectoryPickerActive = true;
    if (lastDirectoryHandle && path) {
      try {
        const parts = path.split('\\').filter(p => p);
        let currentHandle = lastDirectoryHandle;

        for (const part of parts) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        await handleFolderPick(currentHandle);
        return;
      } catch (error) {
        console.log("Failed to navigate from last handle:", error);
      }
    }

    const dirHandle = await window.showDirectoryPicker({
      startIn: lastDirectoryHandle || 'downloads'
    });

    lastDirectoryHandle = dirHandle;

    let fullPath = dirHandle.name;
    try {
      const relativeParts = [];
      let current = dirHandle;
      while (current) {
        relativeParts.unshift(current.name);
        current = await current.getParent();
      }
      fullPath = relativeParts.join('\\');
    } catch (error) {
      console.log("Could not get full path:", error);
    }

    await handleFolderPick(dirHandle);
  } catch (error) {
    console.error("Error loading folder from path:", error);
    if (error.name !== 'AbortError') {
      alert(`Error: ${error.message}`);
    }
  } finally {
    isDirectoryPickerActive = false;
  }
}


folderPickerButton.addEventListener("click", async () => {
  console.log("Folder picker button clicked");
  try {
    await handleFolderSelection();
  } catch (error) {
    console.error("Error in folderPicker click:", error);
    alert(`Error: ${error.message}`);
  }
});


itemsOptions.forEach(option => {
  option.addEventListener('click', () => {
    // Update active state in dropdown
    itemsOptions.forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
    
    // Update items per page value via the proper UI function
    setItemsPerPage(parseInt(option.dataset.value));
    
    // Don't manually update the button text here - let the setItemsPerPage function handle it
    // This was causing a duplicate update that could lead to the wrong button being updated
    
    // Update page and render
    setCurrentPage(0);
    updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
    renderPage(getCurrentPage());
  });
});

sortOptions.forEach(option => {
  option.addEventListener('click', () => {
    sortOptions.forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
    const currentSort = getCurrentSort();
    setCurrentSort({ ...currentSort, field: option.dataset.value });
    sortFiles();
    setCurrentPage(0);
    updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
    renderPage(getCurrentPage());
  });
});

// Sort direction is now handled in ui.js

// Initialize UI and add pagination event listeners
initializeUI().then(() => {
  const { prevPageBtn, nextPageBtn } = getUIElements();

  if (prevPageBtn && nextPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      const currentPage = getCurrentPage();
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
        renderPage(getCurrentPage());
        updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
      }
    });

    nextPageBtn.addEventListener("click", () => {
      const currentPage = getCurrentPage();
      const maxPage = Math.ceil(filteredModelFiles.length / getItemsPerPage()) - 1;
      if (currentPage < maxPage) {
        setCurrentPage(currentPage + 1);
        renderPage(getCurrentPage());
        updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
      }
    });
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
  
  let folderProcessed = false;

  try {
    // 1. Check for dropped folders using e.dataTransfer.items
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      for (const item of e.dataTransfer.items) {
        if (item.kind === 'file') {
          // Attempt to get the entry as a FileSystemFileEntry or FileSystemDirectoryEntry
          const entry = item.webkitGetAsEntry();
          if (entry && entry.isDirectory) {
            try {
              const directoryHandle = await item.getAsFileSystemHandle();
              if (directoryHandle && directoryHandle.kind === 'directory') {
                console.log("Folder dropped:", directoryHandle.name);
                await handleFolderPick(directoryHandle); // Reuse existing function
                folderProcessed = true;
                break; // Process first folder and exit loop
              }
            } catch (err) {
              console.error("Error getting directory handle:", err);
              // Continue with other items or fallback
            }
          }
        }
      }
    }

    // 2. If no folder was processed, fall back to existing file processing logic
    if (!folderProcessed) {
      console.log("No folder processed, falling back to file processing");
      const droppedFiles = e.dataTransfer.files;
      console.log("Number of dropped files:", droppedFiles.length);

      // Clear existing files
      modelFiles = [];
      viewerContainer.innerHTML = "";

      // Process each dropped file
      for (const file of droppedFiles) {
        console.log("Processing file:", file.name, "size:", file.size, "type:", file.type);

        // Determine file type using centralized detector
        const typeInfo = detectFileType(file.name);
        
        if (typeInfo) {
          console.log("Adding file:", file.name, "as type:", typeInfo.type, "subtype:", typeInfo.subtype);
          modelFiles.push({ 
            name: file.name, 
            file, 
            type: typeInfo.type,
            subtype: typeInfo.subtype,
            fullPath: file.name 
          });
        }
      }

      console.log("Total files added:", modelFiles.length);

      if (modelFiles.length > 0) {
        // Sort and display files
        modelFiles.sort((a, b) => a.name.localeCompare(b.name));
        updateFilteredModelFiles();
        setCurrentPage(0);
        updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
        renderPage(getCurrentPage());
        console.log("View updated with new files");
      } else {
        console.log("No supported files found in drop");
        alert("No supported files found. Please drop 3D models (GLB, GLTF, FBX, OBJ), videos (MP4, WebM, MOV), audio (MP3, WAV, OGG), images (JPG, PNG, GIF, WEBP, SVG), fonts (TTF, OTF, WOFF), documents (PDF), or a folder containing them.");
      }
    }
  } catch (error) {
    console.error("Error processing dropped items:", error);
    alert(`Error processing dropped items: ${error.message}`);
  }
}

// Add event listener to stop all preview videos when returning to grid
document.getElementById('returnButton').addEventListener('click', () => {
  document.querySelectorAll('.preview-video').forEach(video => {
    video.pause();
    video.currentTime = 0;
  });
});

// Add drag and drop event listeners
viewerContainer.addEventListener('dragenter', handleDragOver);
viewerContainer.addEventListener('dragover', handleDragOver);
viewerContainer.addEventListener('dragleave', handleDragLeave);
viewerContainer.addEventListener('drop', handleDrop);

// Expose key functions to window for external access
window.assetLoading = {
  updateFilteredModelFiles,
  renderPage,
  updatePagination,
  getCurrentPage
};

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
  viewerContainer,
  itemsOptions,
  itemsBtn,
  sortOptions,
  sortDirectionBtn
};
