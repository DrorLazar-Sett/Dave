// BaseAssetHandler.js - Base class for all asset type handlers

export class BaseAssetHandler {
  constructor() {
    if (new.target === BaseAssetHandler) {
      throw new Error('BaseAssetHandler is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Check if this handler can handle the given file type
   * @param {string} fileType - The file type/subtype to check
   * @returns {boolean} True if this handler can handle the file type
   */
  canHandle(fileType) {
    throw new Error('canHandle() must be implemented by subclass');
  }

  /**
   * Load and display a thumbnail for the asset
   * @param {Object} model - The model object containing file information
   * @param {HTMLElement} container - The container element to render into
   * @param {Object} options - Additional options for rendering
   * @returns {Promise<void>}
   */
  async loadThumbnail(model, container, options = {}) {
    throw new Error('loadThumbnail() must be implemented by subclass');
  }

  /**
   * Load and display the asset in fullscreen mode
   * @param {Object} model - The model object containing file information
   * @param {HTMLElement} container - The fullscreen container element
   * @param {Object} options - Additional options for rendering
   * @returns {Promise<Object>} Cleanup information object
   */
  async loadFullscreen(model, container, options = {}) {
    throw new Error('loadFullscreen() must be implemented by subclass');
  }

  /**
   * Get the file URL for the asset
   * @param {Object} model - The model object
   * @returns {Promise<string>} The URL to use for loading
   */
  async getFileUrl(model) {
    // For local files
    return URL.createObjectURL(model.file);
  }


  /**
   * Create a placeholder element while content is loading
   * @param {string} icon - Font Awesome icon class
   * @param {string} text - Loading text
   * @returns {HTMLElement}
   */
  createLoadingPlaceholder(icon = 'fa-spinner fa-spin', text = 'Loading...') {
    const placeholder = document.createElement('div');
    placeholder.className = 'asset-placeholder loading';
    placeholder.innerHTML = `<i class="fa ${icon}"></i><br>${text}`;
    return placeholder;
  }

  /**
   * Create an error placeholder element
   * @param {string} message - Error message
   * @returns {HTMLElement}
   */
  createErrorPlaceholder(message = 'Error loading asset') {
    const placeholder = document.createElement('div');
    placeholder.className = 'asset-placeholder error';
    placeholder.innerHTML = `<i class="fa fa-exclamation-triangle"></i><br>${message}`;
    return placeholder;
  }

  /**
   * Dispose of any resources created by this handler
   */
  dispose() {
    // Override in subclasses that need cleanup
  }
}