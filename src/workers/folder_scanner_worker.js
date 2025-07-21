// folder_scanner_worker.js

// Inline file type detection (workers can't use ES modules)
const FILE_TYPE_MAPPINGS = {
  // 3D Model formats
  '.glb': { type: '3d', subtype: 'glb' },
  '.gltf': { type: '3d', subtype: 'gltf' },
  '.fbx': { type: '3d', subtype: 'fbx' },
  '.obj': { type: '3d', subtype: 'obj' },
  '.dae': { type: '3d', subtype: 'dae' },
  '.stl': { type: '3d', subtype: 'stl' },
  '.ply': { type: '3d', subtype: 'ply' },
  '.3ds': { type: '3d', subtype: '3ds' },
  
  // Video formats
  '.mp4': { type: 'video', subtype: 'mp4' },
  '.webm': { type: 'video', subtype: 'webm' },
  '.ogv': { type: 'video', subtype: 'ogg' },
  '.mov': { type: 'video', subtype: 'mov' },
  '.avi': { type: 'video', subtype: 'avi' },
  '.mkv': { type: 'video', subtype: 'mkv' },
  
  // Audio formats
  '.mp3': { type: 'audio', subtype: 'mp3' },
  '.wav': { type: 'audio', subtype: 'wav' },
  '.ogg': { type: 'audio', subtype: 'ogg' },
  '.oga': { type: 'audio', subtype: 'ogg' },
  '.flac': { type: 'audio', subtype: 'flac' },
  '.m4a': { type: 'audio', subtype: 'm4a' },
  
  // Image formats
  '.jpg': { type: 'image', subtype: 'jpg' },
  '.jpeg': { type: 'image', subtype: 'jpg' },
  '.png': { type: 'image', subtype: 'png' },
  '.gif': { type: 'image', subtype: 'gif' },
  '.webp': { type: 'image', subtype: 'webp' },
  '.svg': { type: 'image', subtype: 'svg' },
  '.bmp': { type: 'image', subtype: 'bmp' },
  '.tiff': { type: 'image', subtype: 'tiff' },
  '.tif': { type: 'image', subtype: 'tiff' },
  '.ico': { type: 'image', subtype: 'ico' },
  
  // Font formats
  '.ttf': { type: 'font', subtype: 'ttf' },
  '.otf': { type: 'font', subtype: 'otf' },
  '.woff': { type: 'font', subtype: 'woff' },
  '.woff2': { type: 'font', subtype: 'woff2' },
  
  // Document formats
  '.pdf': { type: 'document', subtype: 'pdf' }
};

function detectFileType(filename) {
  if (!filename) return null;
  
  const lowerFilename = filename.toLowerCase();
  const lastDotIndex = lowerFilename.lastIndexOf('.');
  
  if (lastDotIndex === -1) return null;
  
  const extension = lowerFilename.slice(lastDotIndex);
  return FILE_TYPE_MAPPINGS[extension] || null;
}

async function scanDirectory(dirHandle, currentRecursiveDepth, maxDepth, pathPrefix) {
  try {
    let fileCountInDir = 0;
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        try {
          const file = await handle.getFile();
          const typeInfo = detectFileType(file.name);

          if (typeInfo) {
            self.postMessage({
              status: 'fileFound',
              fileEntry: {
                name: file.name,
                file: file, // The File object itself
                type: typeInfo.type,
                subtype: typeInfo.subtype,
                fullPath: pathPrefix + file.name // Construct full path
              }
            });
            fileCountInDir++;
          }
        } catch (fileError) {
          console.error(`Worker: Error getting file handle for ${name} in ${pathPrefix}:`, fileError);
          self.postMessage({ status: 'scanError', error: `Error processing file ${pathPrefix}${name}: ${fileError.message}` });
        }
      } else if (handle.kind === 'directory') {
        if (currentRecursiveDepth < maxDepth) {
          await scanDirectory(handle, currentRecursiveDepth + 1, maxDepth, pathPrefix + name + '/');
        }
      }
    }
    // Optional: progress for each directory processed
    // self.postMessage({ status: 'scanProgress', message: `Finished scanning ${pathPrefix}`, count: fileCountInDir });
  } catch (dirError) {
    console.error(`Worker: Error scanning directory ${pathPrefix}:`, dirError);
    self.postMessage({ status: 'scanError', error: `Error scanning directory ${pathPrefix}: ${dirError.message}` });
    // Decide if we should re-throw or if scanComplete will still be called.
    // For now, let scanComplete be called by the top-level invoker.
    throw dirError; // Re-throw to be caught by the top-level try-catch in onmessage
  }
}

self.onmessage = async (event) => {
  const { dirHandle, maxDepth: inputMaxDepth, currentPath } = event.data;

  if (!dirHandle) {
    self.postMessage({ status: 'scanError', error: 'Directory handle not provided.' });
    return;
  }
  console.log(`Worker: Received scan request for "${currentPath}" with maxDepth: ${inputMaxDepth}`);

  // Determine actual maxDepth for recursion (0 for 'off', Infinity for 'all')
  let maxRecursiveDepth = 0;
  if (inputMaxDepth === 'all') {
    maxRecursiveDepth = Infinity;
  } else if (inputMaxDepth !== 'off') {
    maxRecursiveDepth = parseInt(inputMaxDepth, 10);
    if (isNaN(maxRecursiveDepth)) maxRecursiveDepth = 0; // Default to 0 if parsing fails
  }
  // Note: The worker's maxDepth is for *recursion*. 'off' means maxRecursiveDepth = 0.
  // The first level (currentRecursiveDepth = 0) will always be scanned.

  try {
    await scanDirectory(dirHandle, 0, maxRecursiveDepth, currentPath); // Start with depth 0
    self.postMessage({ status: 'scanComplete' });
  } catch (e) {
    // This will catch errors re-thrown from scanDirectory's top level.
    console.error(`Worker: Overall scan failed for ${currentPath}:`, e);
    // No need to post 'scanError' here if scanDirectory already did, unless it's a setup error.
    // If scanDirectory posts specific errors, scanComplete might still be sent by the successful completion of this try block.
    // To ensure scanError is the final state on failure before completion:
    // self.postMessage({ status: 'scanError', error: `Overall scan failed for ${currentPath}: ${e.message}` });
    // However, scanComplete should ideally signify the *entire operation* finished, even if parts had errors.
    // The current logic in scanDirectory posts errors per file/directory, then scanComplete is sent.
    // This might be okay as the main thread can collect errors and still process successfully found files.
  }
};

console.log('Worker: folder_scanner_worker.js loaded and ready.');
