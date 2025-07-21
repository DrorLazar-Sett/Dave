// fileTypeDetector.js - Centralized file type detection

const FILE_TYPE_MAPPINGS = {
  // 3D Model formats
  glb: { type: '3d', subtype: 'glb', extensions: ['.glb'] },
  gltf: { type: '3d', subtype: 'gltf', extensions: ['.gltf'] },
  fbx: { type: '3d', subtype: 'fbx', extensions: ['.fbx'] },
  obj: { type: '3d', subtype: 'obj', extensions: ['.obj'] },
  dae: { type: '3d', subtype: 'dae', extensions: ['.dae'] }, // Collada
  stl: { type: '3d', subtype: 'stl', extensions: ['.stl'] },
  ply: { type: '3d', subtype: 'ply', extensions: ['.ply'] },
  '3ds': { type: '3d', subtype: '3ds', extensions: ['.3ds'] },
  
  // Video formats
  mp4: { type: 'video', subtype: 'mp4', extensions: ['.mp4'] },
  webm: { type: 'video', subtype: 'webm', extensions: ['.webm'] },
  ogv: { type: 'video', subtype: 'ogg', extensions: ['.ogv'] },
  mov: { type: 'video', subtype: 'mov', extensions: ['.mov'] },
  avi: { type: 'video', subtype: 'avi', extensions: ['.avi'] },
  mkv: { type: 'video', subtype: 'mkv', extensions: ['.mkv'] },
  
  // Audio formats
  mp3: { type: 'audio', subtype: 'mp3', extensions: ['.mp3'] },
  wav: { type: 'audio', subtype: 'wav', extensions: ['.wav'] },
  ogg: { type: 'audio', subtype: 'ogg', extensions: ['.ogg'] },
  oga: { type: 'audio', subtype: 'ogg', extensions: ['.oga'] },
  flac: { type: 'audio', subtype: 'flac', extensions: ['.flac'] },
  m4a: { type: 'audio', subtype: 'm4a', extensions: ['.m4a'] },
  
  // Image formats
  jpg: { type: 'image', subtype: 'jpg', extensions: ['.jpg', '.jpeg'] },
  png: { type: 'image', subtype: 'png', extensions: ['.png'] },
  gif: { type: 'image', subtype: 'gif', extensions: ['.gif'] },
  webp: { type: 'image', subtype: 'webp', extensions: ['.webp'] },
  svg: { type: 'image', subtype: 'svg', extensions: ['.svg'] },
  bmp: { type: 'image', subtype: 'bmp', extensions: ['.bmp'] },
  tiff: { type: 'image', subtype: 'tiff', extensions: ['.tiff', '.tif'] },
  ico: { type: 'image', subtype: 'ico', extensions: ['.ico'] },
  
  // Font formats
  ttf: { type: 'font', subtype: 'ttf', extensions: ['.ttf'] },
  otf: { type: 'font', subtype: 'otf', extensions: ['.otf'] },
  woff: { type: 'font', subtype: 'woff', extensions: ['.woff'] },
  woff2: { type: 'font', subtype: 'woff2', extensions: ['.woff2'] },
  
  // Document formats
  pdf: { type: 'document', subtype: 'pdf', extensions: ['.pdf'] }
};

// Build reverse lookup map for faster detection
const EXTENSION_TO_TYPE = {};
Object.entries(FILE_TYPE_MAPPINGS).forEach(([key, config]) => {
  config.extensions.forEach(ext => {
    EXTENSION_TO_TYPE[ext.toLowerCase()] = config;
  });
});

/**
 * Detects the file type based on the filename
 * @param {string} filename - The name of the file
 * @returns {Object|null} Object containing type and subtype, or null if unknown
 */
export function detectFileType(filename) {
  if (!filename) return null;
  
  const lowerFilename = filename.toLowerCase();
  const lastDotIndex = lowerFilename.lastIndexOf('.');
  
  if (lastDotIndex === -1) return null;
  
  const extension = lowerFilename.slice(lastDotIndex);
  const typeInfo = EXTENSION_TO_TYPE[extension];
  
  if (typeInfo) {
    return {
      type: typeInfo.type,
      subtype: typeInfo.subtype,
      extension: extension
    };
  }
  
  return null;
}

/**
 * Checks if a file type is supported
 * @param {string} filename - The name of the file
 * @returns {boolean} True if the file type is supported
 */
export function isFileTypeSupported(filename) {
  return detectFileType(filename) !== null;
}

/**
 * Gets all supported extensions for a given type
 * @param {string} type - The type (e.g., '3d', 'video', 'image')
 * @returns {string[]} Array of extensions
 */
export function getSupportedExtensionsByType(type) {
  const extensions = [];
  Object.values(FILE_TYPE_MAPPINGS).forEach(config => {
    if (config.type === type) {
      extensions.push(...config.extensions);
    }
  });
  return extensions;
}

/**
 * Gets all supported file extensions
 * @returns {string[]} Array of all supported extensions
 */
export function getAllSupportedExtensions() {
  return Object.keys(EXTENSION_TO_TYPE);
}

/**
 * Gets a human-readable list of supported formats by type
 * @returns {Object} Object with types as keys and format names as values
 */
export function getSupportedFormatsByType() {
  const formats = {};
  
  Object.entries(FILE_TYPE_MAPPINGS).forEach(([key, config]) => {
    if (!formats[config.type]) {
      formats[config.type] = [];
    }
    formats[config.type].push(config.subtype.toUpperCase());
  });
  
  // Remove duplicates
  Object.keys(formats).forEach(type => {
    formats[type] = [...new Set(formats[type])];
  });
  
  return formats;
}

/**
 * Creates a file filter string for file input accept attribute
 * @param {string[]} types - Array of types to include (e.g., ['image', 'video'])
 * @returns {string} Comma-separated list of extensions
 */
export function createFileFilterString(types = []) {
  if (types.length === 0) {
    return getAllSupportedExtensions().join(',');
  }
  
  const extensions = [];
  types.forEach(type => {
    extensions.push(...getSupportedExtensionsByType(type));
  });
  
  return extensions.join(',');
}
