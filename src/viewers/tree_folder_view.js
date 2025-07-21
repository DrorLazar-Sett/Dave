// tree_folder_view.js - Tree Folder View functionality for Dave - Digital Assets Viewer Extraordiner

// Import necessary functions and variables from other modules
import { 
    handleDragOver, handleDragLeave, handleDrop, 
    getFilesFromDirectory, updateFilteredModelFiles, 
    renderPage, handleFolderPick
} from '../core/asset_loading.js';
import { getCurrentPage } from '../core/ui.js';
import { debounce } from '../utils/debounce.js';

// Tree panel state
let isTreeVisible = false;
let isPanelOnRightSide = false; // New state variable for panel position
let selectedTreeFolder = null; // Local folder
let currentDirectoryHandle = null; // For local folders
let folderStructure = null; // Structure for local folders
let currentSourceType = 'local'; // Always 'local' now
let scanDepth = 1; // Default scan depth (1 = immediate children only)

// Caching and performance settings
const hasSubdirCache = new Map(); // Cache subdirectory checks by path

// Simple logger for performance-sensitive sections
function logDebug(message, ...args) {
  // Use the global APP_DEBUG utility if available, fallback to local implementation
  if (window.APP_DEBUG) {
    window.APP_DEBUG.log('treeFolderView', message, ...args);
  } else if (DEBUG_MODE) {
    // Kept for backward compatibility but marked as deprecated
    console.log('[DEPRECATED] Use window.APP_DEBUG instead of DEBUG_MODE:', message, ...args);
  }
}

// Local debug flag for backward compatibility
const DEBUG_MODE = false; // This is now deprecated - use window.APP_DEBUG.modules.treeFolderView instead

// Quick check if a directory has any subdirectories (without full scan)
async function hasSubdirectories(dirHandle, cacheKey = null) {
  // Use cached result if available
  if (cacheKey && hasSubdirCache.has(cacheKey)) {
    return hasSubdirCache.get(cacheKey);
  }
  
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'directory') {
        // Cache the positive result if a cache key was provided
        if (cacheKey) {
          hasSubdirCache.set(cacheKey, true);
        }
        return true;
      }
    }
    // Cache the negative result if a cache key was provided
    if (cacheKey) {
      hasSubdirCache.set(cacheKey, false);
    }
    return false;
  } catch (error) {
    console.error(`Error checking for subdirectories:`, error);
    return false;
  }
}

// Load tree view state from localStorage - including width, visibility, and position
function loadTreeViewState() {
    try {
        const savedState = localStorage.getItem('treeViewState');
        if (savedState) {
            const state = JSON.parse(savedState);
            isTreeVisible = state.isVisible || false;
            isPanelOnRightSide = state.isOnRightSide || false;
            
            // Load the panel width if it exists
            if (state.treePanelWidth) {
                document.documentElement.style.setProperty('--tree-panel-width', `${state.treePanelWidth}px`);
                const treePanel = document.querySelector('.tree-folder-panel');
                if (treePanel) {
                    // Also set directly on the element for immediate effect
                    treePanel.style.width = `${state.treePanelWidth}px`;
                }
            }
        }
    } catch (error) {
        console.error("Error loading tree view state:", error);
        isTreeVisible = false;
        isPanelOnRightSide = false;
    }
}

// Save tree view state to localStorage - including width, visibility, and position
function saveTreeViewState() {
    try {
        const treePanel = document.querySelector('.tree-folder-panel');
        const currentWidth = treePanel ? parseInt(treePanel.style.width) || 300 : 300;
        
        const state = {
            isVisible: isTreeVisible,
            isOnRightSide: isPanelOnRightSide,
            treePanelWidth: currentWidth
        };
        localStorage.setItem('treeViewState', JSON.stringify(state));
    } catch (error) {
        console.error("Error saving tree view state:", error);
    }
}

// Update the panel position (left or right side)
function updatePanelPosition() {
    const treePanel = document.getElementById('treeFolderPanel');
    if (!treePanel) return;
    
    // Remove both classes first
    treePanel.classList.remove('panel-left', 'panel-right');
    
    // Add the appropriate class based on current position state
    if (isPanelOnRightSide) {
        treePanel.classList.add('panel-right');
    } else {
        treePanel.classList.add('panel-left');
    }
    
    // Update tooltip and icon class on toggle button
    const treeSideToggleButton = document.getElementById('treeSideToggle');
    if (treeSideToggleButton) {
        treeSideToggleButton.title = isPanelOnRightSide ? 
            "Move Panel to Left Side" : 
            "Move Panel to Right Side";
        
        // Update icon to indicate current position
        const icon = treeSideToggleButton.querySelector('i');
        if (icon) {
            icon.className = isPanelOnRightSide ? 
                'fa-solid fa-arrow-left-to-bracket' : 
                'fa-solid fa-arrow-right-to-bracket';
        }
    }
}

// Toggle the panel side between left and right
function togglePanelSide() {
    isPanelOnRightSide = !isPanelOnRightSide;
    updatePanelPosition();
    saveTreeViewState();
}

// Setup panel resizer functionality
function setupResizer(resizer) {
    let startX = 0;
    let startWidth = 0;
    let isResizing = false;
    let animationFrameId = null;

    const treePanel = document.querySelector('.tree-folder-panel');
    const minWidth = 180; // Minimum width in pixels (consistent with PRD)
    const maxWidthPercentage = 0.5; // Maximum width as a percentage of viewport

    const onMouseMove = (e) => {
        if (!isResizing) return;
        e.preventDefault(); // Prevent text selection during drag

        // Cancel any pending animation frame to avoid multiple updates
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
            const currentX = e.clientX;
            let deltaX = 0;
            
            // Calculate delta based on panel position (left or right)
            if (isPanelOnRightSide) {
                // For right panel, dragging left increases width
                deltaX = startX - currentX;
            } else {
                // For left panel, dragging right increases width
                deltaX = currentX - startX;
            }
            
            let newWidth = startWidth + deltaX;
            
            const viewportWidth = window.innerWidth;
            const maxWidth = viewportWidth * maxWidthPercentage;

            // Apply constraints
            newWidth = Math.max(minWidth, newWidth);
            newWidth = Math.min(maxWidth, newWidth);
            
            // Update the CSS variable (for viewerContainer margins)
            document.documentElement.style.setProperty('--tree-panel-width', `${newWidth}px`);
            
            // Directly update the panel's width as well
            if (treePanel) {
                treePanel.style.width = `${newWidth}px`;
            }
        });
    };

    const onMouseUp = () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.classList.remove('is-resizing'); // Re-enable transitions
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            saveTreeViewState(); // Save the final width
            console.log("Resizing ended, final width saved.");
        }
    };

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent default mousedown behavior
        startX = e.clientX;
        startWidth = parseInt(getComputedStyle(treePanel).width, 10);
        isResizing = true;
        resizer.classList.add('active');
        document.body.classList.add('is-resizing'); // Disable transitions during resize

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        console.log("Resizing started.");
    });
}

// Handle drag over event for tree panel
function handleTreeDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('tree-drag-over');
}

// Handle drag leave event for tree panel
function handleTreeDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('tree-drag-over');
    }
}

// Handle drop event for tree panel
async function handleTreeDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('tree-drag-over');
    
    try {
        // Currently we only support directory drops (not individual files)
        for (const item of e.dataTransfer.items) {
            if (item.kind === 'file' && item.webkitGetAsEntry().isDirectory) {
                const handle = await item.getAsFileSystemHandle();
                if (handle.kind === 'directory') {
                    await processFolderDrop(handle);
                    break;
                }
            }
        }
    } catch (error) {
        console.error("Error processing dropped folder:", error);
        alert(`Error: ${error.message}\n\nPlease try dropping a folder again.`);
    }
}

// Initialize the tree folder view
export function initTreeFolderView() {
    console.log("Initializing Tree Folder View with enhanced keyboard navigation");
    
    // Load initial state but NOT width (now using fixed width)
    loadTreeViewState();
    
    // Get references to UI elements
    const treeFolderToggle = document.getElementById('treeFolderToggle');
    const treeFolderPanel = document.getElementById('treeFolderPanel');
    const treeClosePanel = document.getElementById('treeClosePanel');
    const treeSideToggle = document.getElementById('treeSideToggle');
    // Enable resizer
    const treeFolderResizer = document.getElementById('treeFolderResizer');
    const treeCollapseAll = document.getElementById('treeCollapseAll');
    const treeExpandAll = document.getElementById('treeExpandAll');
    const treeDownloadFolder = document.getElementById('treeDownloadFolder');
    const folderTreeContainer = document.getElementById('folderTreeContainer');
    const treeEmptyState = document.querySelector('.tree-empty-state');
    
    // Apply initial panel position class
    updatePanelPosition();
    
    // Apply initial visibility state
    if (isTreeVisible) {
        document.body.classList.add('tree-panel-visible');
    }
    
    // Initialize scan depth from UI dropdown
    initScanDepthFromUI();
    
    // Setup event listeners
    if (treeFolderToggle) {
        treeFolderToggle.addEventListener('click', toggleTreePanel);
    }
    
    if (treeClosePanel) {
        treeClosePanel.addEventListener('click', hideTreePanel);
    }
    
    if (treeSideToggle) {
        treeSideToggle.addEventListener('click', togglePanelSide);
    }
    
    // Enable resizer
    if (treeFolderResizer) {
        setupResizer(treeFolderResizer);
    }
    
    if (treeCollapseAll) {
        treeCollapseAll.addEventListener('click', collapseAllFolders);
    }
    
    if (treeExpandAll) {
        treeExpandAll.addEventListener('click', expandAllFolders);
    }
    
    if (treeDownloadFolder) {
        treeDownloadFolder.addEventListener('click', downloadSelectedFolder);
    }
    
    // Setup drag and drop for the tree panel
    if (treeFolderPanel) {
        treeFolderPanel.addEventListener('dragover', handleTreeDragOver);
        treeFolderPanel.addEventListener('dragleave', handleTreeDragLeave);
        treeFolderPanel.addEventListener('drop', handleTreeDrop);
    }
    
    // Setup keyboard navigation
    setupKeyboardNavigation();

    // Apply initial state (show panel if it was visible in previous session)
    if (isTreeVisible) {
        showTreePanel();
    }
    // Tree view is for local folders only now
}

// Process the dropped folder (for local files)
async function processFolderDrop(dirHandle) {
    currentSourceType = 'local';
    const folderTreeContainer = document.getElementById('folderTreeContainer');
    let loadingIndicator = document.getElementById('treeLoadingIndicator');

    try {
        if (scanDepth > 2 || scanDepth === Infinity) {
            if (!loadingIndicator) {
                loadingIndicator = document.createElement('div');
                loadingIndicator.id = 'treeLoadingIndicator';
                loadingIndicator.className = 'tree-loading-indicator';
                const treeControls = document.querySelector('.tree-controls');
                if (treeControls) treeControls.insertAdjacentElement('afterend', loadingIndicator);
                else if (folderTreeContainer) folderTreeContainer.insertAdjacentElement('beforebegin', loadingIndicator);
            }
            loadingIndicator.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Building local folder tree (deep scan)...';
            loadingIndicator.style.display = 'block';
        }
        currentDirectoryHandle = dirHandle;
        // Do a full scan for the top level folder
        folderStructure = await buildLocalFolderStructure(dirHandle, '', true); // fullScan = true for initial load
        renderFolderTree(folderStructure);
    } catch (error) {
        console.error("Error processing local folder structure:", error);
        alert(`Error: ${error.message}\n\nFailed to process folder structure.`);
        folderStructure = null;
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// Build folder structure from local directory handle with recursive depth support
async function buildLocalFolderStructure(dirHandle, path = '', fullScan = false, currentDepth = 0, maxDepth = null, batchCounter = { count: 0 }, batchSize = 20) {
    if (maxDepth === null) {
        // If maxDepth not specified, use global scanDepth for fullScan, otherwise 0 (only current level)
        maxDepth = fullScan ? scanDepth : 0;
    }
    
    const shouldScanRecursively = fullScan && (currentDepth < maxDepth);
    // console.log(`Building local structure for ${dirHandle.name}, path: ${path}, depth: ${currentDepth}/${maxDepth}, shouldScanRecursively: ${shouldScanRecursively}, fullScanThisLevel: ${fullScan}`);
    
    const result = {
        name: dirHandle.name,
        path: path + dirHandle.name,
        handle: dirHandle,
        type: 'directory',
        children: fullScan ? [] : undefined // Initialize if scanning this level, else undefined
    };
    
    // Only scan for subdirectories if fullScan is true for this level
    if (fullScan) {
        try {
            let entriesFound = false;
            for await (const [name, handle] of dirHandle.entries()) {
                entriesFound = true;
                
                if (handle.kind === 'directory') {
                    if (shouldScanRecursively && currentDepth + 1 < maxDepth) {
                        if (batchCounter.count >= batchSize) {
                            await new Promise(requestAnimationFrame);
                            batchCounter.count = 0;
                        }
                        batchCounter.count++;
                        // Recursively scan subdirectory
                        const subDir = await buildLocalFolderStructure(
                            handle, 
                            result.path + '/' + name + '/', // Corrected path for subdir
                            true, 
                            currentDepth + 1, 
                            maxDepth,
                            batchCounter,
                            batchSize
                        );
                        if (subDir) result.children.push(subDir);
                    } else {
                        // At max recursive depth or not scanning recursively further.
                        // Check if this directory itself has subdirectories for chevron display.
                        let hasNestedFolders = false;
                        try {
                            for await (const [subName, subHandle] of handle.entries()) {
                                if (subHandle.kind === 'directory') {
                                    hasNestedFolders = true;
                                    break; // Stop scanning after finding first subdirectory
                                }
                            }
                        } catch (e) {
                            console.error(`Error checking if ${name} has subdirectories:`, e);
                        }
                        
                        // Add to tree with appropriate children state
                        result.children.push({
                            name: name,
                            path: result.path + '/' + name, // Corrected path variable
                            handle: handle,
                            type: 'directory',
                                                children: hasNestedFolders ? undefined : [] // Empty array if definitely empty
                        });
                    }
                }
            } // End of for-await loop
            
            // Check that we actually found directory entries
            if (!entriesFound) {
                console.log(`${dirHandle.name} could not be read or has no entries`);
                // If no entries were found and we were supposed to scan, ensure children is an empty array
                // This handles cases where a directory is empty or unreadable.
                if (fullScan && result.children === undefined) {
                    result.children = [];
                }
            }

            // Duplicated block has been removed here.
            // The try block now correctly flows to the sort and then the catch.

            if (result.children && result.children.length > 0) {
                result.children.sort((a, b) => a.name.localeCompare(b.name));
            }
        } catch (error) {
            console.error(`Error reading contents of local folder ${result.path}:`, error);
            result.children = []; // Mark as scanned but failed/empty
        }
    } // End of if (fullScan)
    
    return result;
}

// Render the folder tree in the panel (optimized for performance)
function renderFolderTree(folderData) {
    if (!folderData) return;
    
    const startTime = performance.now();
    logDebug("Starting folder tree render...");
    
    const folderTreeContainer = document.getElementById('folderTreeContainer');
    const treeEmptyState = document.querySelector('.tree-empty-state');
    
    if (folderTreeContainer && treeEmptyState) {
        // Hide empty state, show tree container
        treeEmptyState.style.display = 'none';
        folderTreeContainer.classList.add('has-folders');
        folderTreeContainer.style.display = 'block';
        
        // Clear existing content
        folderTreeContainer.innerHTML = '';
        
        // Create a document fragment (doesn't cause reflow during modifications)
        const fragment = document.createDocumentFragment();
        
        // Add root ul element to the fragment
        const rootUl = document.createElement('ul');
        rootUl.setAttribute('role', 'tree');
        rootUl.setAttribute('aria-label', 'Folder structure');
        fragment.appendChild(rootUl);
        
        // Recursively add the folder structure to the fragment
        addFolderToTree(folderData, rootUl);
        
        // Append the entire fragment to the DOM at once (single reflow)
        folderTreeContainer.appendChild(fragment);
        
        const endTime = performance.now();
        logDebug(`Folder tree render complete in ${(endTime - startTime).toFixed(2)}ms`);
    }
}

// Add a folder node to the tree
function addFolderToTree(folder, parentElement) {
    const li = document.createElement('li');
    li.setAttribute('role', 'treeitem');
    li.setAttribute('aria-expanded', 'false'); // All folders start collapsed
    li.setAttribute('tabindex', '-1'); // Not focusable by default, JS will manage focus
    li.dataset.path = folder.path;
    // Store folder data directly on the li element for easy access during expand all
    li.folderData = folder;
    
    const chevronIcon = document.createElement('span');
    chevronIcon.className = 'chevron-icon';
    
    // Improved logic for determining if chevron is needed:
    let canHaveChildren = false;
    
    {
        // For local folders:
        // If the folder has a handle and we haven't checked for children yet (i.e., at the deeper levels),
        // we show the chevron to allow exploration.
        // If children have been checked and there are none, we hide the chevron.
        canHaveChildren = folder.handle && (
            !Array.isArray(folder.children) || // Not yet checked for children
            folder.children.length > 0         // Has actual children
        );
    }
    
    chevronIcon.innerHTML = canHaveChildren ? '<i class="fa fa-chevron-right"></i>' : '<i class="fa fa-fw"></i>'; // fa-fw for spacing
    li.appendChild(chevronIcon);
    
    // Add folder icon
    const folderIcon = document.createElement('span');
    folderIcon.className = 'folder-icon';
    folderIcon.innerHTML = '<i class="fa fa-folder"></i>';
    li.appendChild(folderIcon);
    
    // Add folder name
    const folderName = document.createElement('span');
    folderName.className = 'folder-name';
    folderName.textContent = folder.name;
    li.appendChild(folderName);
    
    // Add to parent
    parentElement.appendChild(li);
    
    // Handle click events
    li.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFolder(li, folder);
    });
    
    // Handle chevron click separately
    chevronIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFolder(li, folder);
    });
    
    // If this folder can have children, prepare for them but don't expand by default
    if (canHaveChildren) {
        const ul = document.createElement('ul');
        ul.setAttribute('role', 'group');
        ul.style.display = 'none'; // Start collapsed
        // Store folder data on the ul for lazy loading/expansion
        ul.dataset.folderPath = folder.path; 
        if (folder.handle) {
            // For local, we might need to re-attach the handle if not passed down
            // but it should be on the `folder` object itself.
        }
        li.appendChild(ul);
    }
}


// Expand subfolder list (lazy load if necessary)
async function expandSubfolders(li, folder, expandAllMode = false) {
    const ul = li.querySelector('ul');
    if (!ul) return; // Should not happen if chevron was present

    // If we haven't populated this list yet (lazy loading)
    if (ul.children.length === 0) {
        let subFolders = [];
        
        // When using expandAllMode, override maxDepth to scan deeply.
        // Pass batchCounter for deep scans initiated by expandAll.
        const maxDepthForExpand = expandAllMode ? Infinity : 0; // 0 for normal click, Infinity for expandAll
        const batchCounterForExpand = expandAllMode ? { count: 0 } : undefined; // Only use new batch for expandAll
        
        if (folder.handle) { // Local folder
            // When expanding a folder, always do a full scan to properly find all subfolders
            const localSubStructure = await buildLocalFolderStructure(
                folder.handle, 
                folder.path + '/', 
                true, // fullScan = true for expanding a folder
                0,    // currentDepth for this new scan context
                maxDepthForExpand, // maxDepth for this scan
                batchCounterForExpand // Pass counter only if expandAllMode
            );
            if (localSubStructure && localSubStructure.children) {
                subFolders = localSubStructure.children;
                // Update original folder object with scan results
                folder.children = subFolders;
            } else {
                // If scan failed or returned null, mark as empty
                folder.children = [];
            }
        }
        
        if (subFolders.length > 0) {
            // Add all discovered subfolders to the tree
            subFolders.forEach(child => addFolderToTree(child, ul));
        } else {
            // No subfolders, remove chevron icon
            const chevronIconEl = li.querySelector('.chevron-icon i');
            if (chevronIconEl) {
                chevronIconEl.className = 'fa fa-fw'; // No chevron needed
            }
            // Ensure original folder object is marked as having no children
            folder.children = [];
        }
    }
    
    // Show the sub-list
    ul.style.display = 'block';
    
    // Update the icons
    const chevronIcon = li.querySelector('.chevron-icon i');
    if (chevronIcon) {
        chevronIcon.classList.remove('fa-chevron-right');
        chevronIcon.classList.add('fa-chevron-down');
    }
    
    const folderIcon = li.querySelector('.folder-icon i');
    if (folderIcon) {
        folderIcon.classList.remove('fa-folder');
        folderIcon.classList.add('fa-folder-open');
    }
    
    li.setAttribute('aria-expanded', 'true');
}

// Collapse subfolder list
function collapseSubfolders(li) {
    const ul = li.querySelector('ul');
    if (!ul) return;
    
    // Hide the sub-list
    ul.style.display = 'none';
    
    // Update the icons
    const chevronIcon = li.querySelector('.chevron-icon i');
    if (chevronIcon) {
        chevronIcon.classList.remove('fa-chevron-down');
        chevronIcon.classList.add('fa-chevron-right');
    }
    
    const folderIcon = li.querySelector('.folder-icon i');
    if (folderIcon) {
        folderIcon.classList.remove('fa-folder-open');
        folderIcon.classList.add('fa-folder');
    }
    
    li.setAttribute('aria-expanded', 'false');
}

// Toggle folder expansion
async function toggleFolder(li, folder) {
    const isExpanded = li.getAttribute('aria-expanded') === 'true';
    
    // Important: Set the state first to avoid race conditions
    li.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
    
    if (isExpanded) {
        collapseSubfolders(li);
    } else {
        await expandSubfolders(li, folder);
    }
}

// Create debounced version of folder selection to prevent rapid clicks
const debouncedLoadFiles = debounce(async (folder) => {
    await loadFilesFromSelectedFolder(folder);
}, 300);

// Select a folder in the tree
async function selectFolder(li, folder) {
    // Remove previous selection and ARIA state
    document.querySelectorAll('.tree-container li.selected').forEach(item => {
        item.classList.remove('selected');
        item.removeAttribute('aria-selected');
        item.setAttribute('tabindex', '-1'); // Make previously selected item not focusable
    });
    
    // Add selection to this folder
    li.classList.add('selected');
    li.setAttribute('aria-selected', 'true');
    li.setAttribute('tabindex', '0'); // Make current item focusable
    li.focus(); // Set focus to the selected item
    selectedTreeFolder = folder;
    
    // If the folder isn't expanded, expand it
    if (li.getAttribute('aria-expanded') !== 'true' && li.querySelector('ul')) {
        await expandSubfolders(li, folder); // Ensure this is awaited if it's async
    }
    
    // Load the files from this folder into the viewer (debounced)
    debouncedLoadFiles(folder);
}

// Load files from the selected folder into the viewer
async function loadFilesFromSelectedFolder(folder) {
    const viewerContainer = document.getElementById('viewerContainer');
    if (viewerContainer) {
        viewerContainer.innerHTML = `<div class="loading-message"><i class="fa fa-spinner fa-spin"></i> Loading files from ${folder.name}...</div>`;
    }

    try {
        if (folder.handle) { // Local folder
            console.log(`Loading local files from folder: ${folder.name}`);
            // First, load the files with the original handleFolderPick
            await handleFolderPick(folder.handle);
            
            // Then ensure a proper render with an animation frame delay
            // This helps ensure all DOM updates are processed before re-rendering
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    // Get the current state after the initial load
                    const currentPage = getCurrentPage();
                    console.log(`Re-rendering page ${currentPage} after folder load to ensure complete display`);
                    
                    // After a brief delay, force a re-render of the current page
                    setTimeout(() => {
                        // Import these functions directly to avoid circular dependencies
                        const { updateFilteredModelFiles, renderPage, updatePagination } = window.assetLoading || {};
                        
                        if (typeof updateFilteredModelFiles === 'function') {
                            updateFilteredModelFiles();
                        }
                        
                        if (typeof renderPage === 'function') {
                            renderPage(currentPage);
                            console.log("Forced re-render complete");
                        }
                        
                        resolve();
                    }, 50); // Short delay to ensure all async operations are complete
                });
            });
        } else {
            throw new Error("Folder source is not recognized (no local handle).");
        }
    } catch (error) {
        console.error("Error loading files from selected folder:", error);
        if (viewerContainer) {
            viewerContainer.innerHTML = `<div class='error-message'>Error loading files: ${error.message}</div>`;
        }
        alert(`Error: ${error.message}\n\nFailed to load files from folder.`);
    }
}


// Expand all folders in the tree (recursive)
async function expandAllFoldersRecursive(parentElement, batchCounter = { count: 0 }, batchSize = 20) {
    const listItems = parentElement.children;
    for (const li of listItems) {
        if (batchCounter.count >= batchSize) {
            await new Promise(requestAnimationFrame);
            batchCounter.count = 0;
        }

        if (li.tagName === 'LI' && li.getAttribute('aria-expanded') === 'false') {
            const folder = li.folderData;
            if (!folder) continue;

            const chevron = li.querySelector('.chevron-icon');
            if (chevron && !chevron.querySelector('.fa-fw')) {
                await expandSubfolders(li, folder, true); // expandAllMode = true
                batchCounter.count++;
                
                const subUl = li.querySelector('ul');
                if (subUl) {
                    await expandAllFoldersRecursive(subUl, batchCounter, batchSize);
                }
            }
        } else if (li.tagName === 'LI' && li.getAttribute('aria-expanded') === 'true') {
            const subUl = li.querySelector('ul');
            if (subUl) {
                await expandAllFoldersRecursive(subUl, batchCounter, batchSize);
            }
        }
    }
}

async function expandAllFolders() {
    console.log("Expanding all folders with deep traversal...");
    const folderTreeContainer = document.getElementById('folderTreeContainer');
    const rootUl = folderTreeContainer.querySelector('ul');

    // Display loading indicator
    let loadingIndicator = document.getElementById('treeLoadingIndicator');
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'treeLoadingIndicator';
        loadingIndicator.className = 'tree-loading-indicator'; // For styling
        loadingIndicator.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Expanding all folders...';
        // Insert it into the tree panel, perhaps at the top of folderTreeContainer or near controls
        const treeControls = document.querySelector('.tree-controls');
        if (treeControls) {
            treeControls.insertAdjacentElement('afterend', loadingIndicator);
        } else {
            folderTreeContainer.insertAdjacentElement('beforebegin',loadingIndicator);
        }
    }
    loadingIndicator.style.display = 'block';

    if (rootUl) {
        try {
            await expandAllFoldersRecursive(rootUl);
            console.log("All folders expansion completed successfully.");
        } catch (error) {
            console.error("Error during expand all folders operation:", error);
            // Optionally display an error message to the user
        } finally {
            // Remove loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }
    } else {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// Collapse all folders in the tree
function collapseAllFolders() {
    const folderItems = document.querySelectorAll('.tree-container li[aria-expanded="true"]');
    
    folderItems.forEach(li => {
        collapseSubfolders(li);
    });
}

// Download the selected folder
async function downloadSelectedFolder() {
    if (!selectedTreeFolder) {
        alert("Please select a folder first.");
        return;
    }

    const treeDownloadFolderBtn = document.getElementById('treeDownloadFolder');
    const originalBtnContent = treeDownloadFolderBtn.innerHTML;
    treeDownloadFolderBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    treeDownloadFolderBtn.disabled = true;

    try {
        if (typeof JSZip === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            document.head.appendChild(script);
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error("Failed to load JSZip library."));
            });
        }

        const zip = new JSZip();
        
        if (selectedTreeFolder.handle) { // Local folder
            await addLocalFolderToZip(selectedTreeFolder.handle, zip, selectedTreeFolder.name);
        } else {
            throw new Error("Selected folder type not recognized for download.");
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = `${selectedTreeFolder.name}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);

    } catch (error) {
        console.error("Error downloading folder:", error);
        alert(`Error downloading folder: ${error.message}`);
    } finally {
        treeDownloadFolderBtn.innerHTML = originalBtnContent;
        treeDownloadFolderBtn.disabled = false;
    }
}

// Add local folder and its contents to a zip file
async function addLocalFolderToZip(dirHandle, zip, currentPathInZip) {
    for await (const [name, handle] of dirHandle.entries()) {
        const itemPathInZip = `${currentPathInZip}/${name}`;
        if (handle.kind === 'file') {
            try {
                const file = await handle.getFile();
                const arrayBuffer = await file.arrayBuffer();
                zip.file(itemPathInZip, arrayBuffer);
            } catch (error) {
                console.error(`Error adding local file ${name} to zip:`, error);
            }
        } else if (handle.kind === 'directory') {
            const subFolderZip = zip.folder(itemPathInZip); // Create folder in zip
            await addLocalFolderToZip(handle, zip, itemPathInZip); // Recurse
        }
    }
}


// Keyboard navigation for the tree view
function setupKeyboardNavigation() {
    const treeContainer = document.getElementById('folderTreeContainer');
    
    if (treeContainer) {
        treeContainer.addEventListener('keydown', (e) => {
            const currentItem = document.querySelector('.tree-container li.selected');
            if (!currentItem) return;
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    navigateNext(currentItem);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    navigatePrevious(currentItem);
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    const isExpanded = currentItem.getAttribute('aria-expanded') === 'true';
                    if (isExpanded) {
                        // If already expanded, move to first child
                        const firstChild = currentItem.querySelector('ul > li');
                        if (firstChild) selectTreeItem(firstChild);
                    } else {
                        // Expand folder
                        const chevron = currentItem.querySelector('.chevron-icon');
                        if (chevron) chevron.click();
                    }
                    break;
                    
                case 'ArrowLeft':
                    e.preventDefault();
                    const expandedState = currentItem.getAttribute('aria-expanded');
                    if (expandedState === 'true') {
                        // If expanded, collapse it
                        const chevron = currentItem.querySelector('.chevron-icon');
                        if (chevron) chevron.click();
                    } else {
                        // If collapsed or not expandable, move to parent
                        const parentLi = currentItem.parentElement.closest('li');
                        if (parentLi) selectTreeItem(parentLi);
                    }
                    break;
                    
                case 'Enter':
                case ' ': // Space
                    e.preventDefault();
                    currentItem.click();
                    break;
            }
        });
    }
}

// Navigate to next visible item in the tree
function navigateNext(currentItem) {
    // Check if item has visible children
    const isExpanded = currentItem.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
        const firstChild = currentItem.querySelector('ul > li');
        if (firstChild) {
            selectTreeItem(firstChild);
            return;
        }
    }
    
    // Try to find next sibling
    let nextItem = currentItem.nextElementSibling;
    if (nextItem) {
        selectTreeItem(nextItem);
        return;
    }
    
    // If no next sibling, go up the tree to find next parent sibling
    let parent = currentItem.parentElement.closest('li');
    while (parent) {
        const parentNextSibling = parent.nextElementSibling;
        if (parentNextSibling) {
            selectTreeItem(parentNextSibling);
            return;
        }
        parent = parent.parentElement.closest('li');
    }
}

// Navigate to previous visible item in the tree
function navigatePrevious(currentItem) {
    // Try to find previous sibling
    let prevItem = currentItem.previousElementSibling;
    if (prevItem) {
        // If previous sibling is expanded, get its last visible descendant
        const isExpanded = prevItem.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            const lastDescendant = getLastVisibleDescendant(prevItem);
            if (lastDescendant) {
                selectTreeItem(lastDescendant);
                return;
            }
        }
        
        // Otherwise, select the previous sibling itself
        selectTreeItem(prevItem);
        return;
    }
    
    // If no previous sibling, go to parent
    const parent = currentItem.parentElement.closest('li');
    if (parent) {
        selectTreeItem(parent);
    }
}

// Get the last visible descendant of an expanded item
function getLastVisibleDescendant(item) {
    const isExpanded = item.getAttribute('aria-expanded') === 'true';
    if (!isExpanded) return null;
    
    const children = item.querySelectorAll('ul > li');
    if (children.length === 0) return null;
    
    const lastChild = children[children.length - 1];
    
    // Check if last child is itself expanded
    const lastChildExpanded = lastChild.getAttribute('aria-expanded') === 'true';
    if (lastChildExpanded) {
        const lastDescendant = getLastVisibleDescendant(lastChild);
        if (lastDescendant) return lastDescendant;
    }
    
    return lastChild;
}

// Select a tree item (for keyboard navigation)
function selectTreeItem(item) {
    // Get the data from the ul
    const ul = item.querySelector('ul');
    let folderData = null;
    
    if (ul && ul.folderData) {
        folderData = ul.folderData;
    } else {
        // Try to find parent ul that has folderData
        let parent = item.parentElement;
        while (parent && !folderData) {
            if (parent.folderData) {
                // Find this folder in the parent's children
                const path = item.dataset.path;
                if (path && parent.folderData.children) {
                    folderData = parent.folderData.children.find(child => 
                        child.type === 'directory' && child.path === path
                    );
                }
            }
            parent = parent.parentElement;
        }
    }
    
    if (folderData) {
        // Programmatically trigger selection
        selectFolder(item, folderData);
    } else {
        // Fallback to just visual selection if we can't find the data
        document.querySelectorAll('.tree-container li.selected').forEach(i => {
            i.classList.remove('selected');
        });
        item.classList.add('selected');
    }
    
    // Ensure the item is visible
    item.scrollIntoView({ block: 'nearest' });
    
    // Set focus for continued keyboard navigation
    item.focus(); // Ensure focus is set
}

// Initialize scan depth from UI dropdown
function initScanDepthFromUI() {
    // Get the subfolder toggle dropdown
    const subfolderDropdown = document.getElementById('subfolderDropdown');
    if (!subfolderDropdown) return;
    
    // Find the currently selected depth option
    const activeOption = subfolderDropdown.querySelector('.subfolder-option .subfolder-check[style*="visible"]');
    const depthValue = activeOption ? activeOption.closest('.subfolder-option').dataset.depth : '1';
    
    // Set the global scan depth based on the UI selection
    setScanDepth(depthValue);
    
    // Add event listeners to all depth options
    document.querySelectorAll('.subfolder-option').forEach(option => {
        option.addEventListener('click', handleScanDepthChange);
    });
    
    console.log(`Tree View: Initialized scan depth to ${scanDepth}`);
}

// Handle scan depth change from the UI
function handleScanDepthChange(event) {
    const depthValue = event.currentTarget.dataset.depth;
    setScanDepth(depthValue);
    
    // If we have a current folder structure, reload it with the new depth
    if (currentDirectoryHandle) {
        console.log(`Tree View: Scan depth changed to ${scanDepth}, reloading folder structure...`);
        reloadFolderStructure();
    }
}

// Set scan depth based on UI selection
function setScanDepth(depthValue) {
    if (depthValue === 'off') {
        scanDepth = 1; // Default to 1 level if off
    } else if (depthValue === 'all') {
        scanDepth = Infinity; // Scan all levels
    } else {
        scanDepth = parseInt(depthValue, 10) || 1; // Parse as integer or default to 1
    }
}

// Reload the folder structure with current scan depth
async function reloadFolderStructure() {
    const folderTreeContainer = document.getElementById('folderTreeContainer');
    let loadingIndicator = document.getElementById('treeLoadingIndicator');
    try {
        if (scanDepth > 2 || scanDepth === Infinity) {
             if (!loadingIndicator) {
                loadingIndicator = document.createElement('div');
                loadingIndicator.id = 'treeLoadingIndicator';
                loadingIndicator.className = 'tree-loading-indicator';
                const treeControls = document.querySelector('.tree-controls');
                if (treeControls) treeControls.insertAdjacentElement('afterend', loadingIndicator);
                else if (folderTreeContainer) folderTreeContainer.insertAdjacentElement('beforebegin', loadingIndicator);
            }
            loadingIndicator.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Reloading folder tree (deep scan)...';
            loadingIndicator.style.display = 'block';
        }

        if (currentDirectoryHandle) {
            folderStructure = await buildLocalFolderStructure(currentDirectoryHandle, '', true); // fullScan = true
            renderFolderTree(folderStructure);
        }
    } catch (error) {
        console.error("Error reloading folder structure:", error);
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// Toggle tree panel visibility
function toggleTreePanel() {
    if (isTreeVisible) {
        hideTreePanel();
    } else {
        showTreePanel();
    }
}

// Show tree panel function
function showTreePanel() {
    document.body.classList.add('tree-panel-visible');
    isTreeVisible = true;
    saveTreeViewState();
}

// Hide tree panel function
function hideTreePanel() {
    document.body.classList.remove('tree-panel-visible');
    isTreeVisible = false;
    saveTreeViewState();
}

// Export needed functions for external use
export {
    toggleTreePanel,
    showTreePanel,
    hideTreePanel,
    processFolderDrop
};
