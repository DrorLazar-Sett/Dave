// AssetHandlerFactory.js - Factory for creating appropriate asset handlers

import { Model3DHandler } from './Model3DHandler.js';
import { ImageHandler } from './ImageHandler.js';
import { DocumentHandler } from './DocumentHandler.js';
import { VideoHandler } from './VideoHandler.js';
import { AudioHandler } from './AudioHandler.js';
import { FontHandler } from './FontHandler.js';

export class AssetHandlerFactory {
  constructor() {
    // Initialize handlers
    this.handlers = [
      new Model3DHandler(),
      new ImageHandler(),
      new DocumentHandler(),
      new VideoHandler(),
      new AudioHandler(),
      new FontHandler()
    ];
  }

  /**
   * Get the appropriate handler for a file type
   * @param {string} fileType - The file type/subtype
   * @returns {BaseAssetHandler|null} The handler or null if no handler found
   */
  getHandler(fileType) {
    for (const handler of this.handlers) {
      if (handler.canHandle(fileType)) {
        return handler;
      }
    }
    return null;
  }

  /**
   * Check if a file type is supported
   * @param {string} fileType - The file type/subtype
   * @returns {boolean} True if supported
   */
  isSupported(fileType) {
    return this.getHandler(fileType) !== null;
  }

  /**
   * Load a thumbnail for an asset
   * @param {Object} model - The model object
   * @param {HTMLElement} container - The container element
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async loadThumbnail(model, container, options = {}) {
    const handler = this.getHandler(model.subtype || model.type);
    if (!handler) {
      throw new Error(`No handler found for type: ${model.subtype || model.type}`);
    }
    
    return await handler.loadThumbnail(model, container, options);
  }

  /**
   * Load an asset in fullscreen mode
   * @param {Object} model - The model object
   * @param {HTMLElement} container - The fullscreen container
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Cleanup information
   */
  async loadFullscreen(model, container, options = {}) {
    const handler = this.getHandler(model.subtype || model.type);
    if (!handler) {
      throw new Error(`No handler found for type: ${model.subtype || model.type}`);
    }
    
    return await handler.loadFullscreen(model, container, options);
  }

  /**
   * Dispose all handlers
   */
  dispose() {
    for (const handler of this.handlers) {
      if (handler.dispose) {
        handler.dispose();
      }
    }
  }
}

// Create singleton instance
export const assetHandlerFactory = new AssetHandlerFactory();