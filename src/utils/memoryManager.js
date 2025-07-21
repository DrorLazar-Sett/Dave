// memoryManager.js - Centralized memory management for blob URLs and resources

class MemoryManager {
  constructor() {
    this.blobUrls = new Map(); // Map of modelId -> blobUrl
    this.activeFbxViewers = new Set();
    this.activeModelViewers = new Set();
    this.disposalQueue = [];
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.processDisposalQueue();
    }, 5000); // Every 5 seconds
  }

  // Register a blob URL for tracking
  registerBlobUrl(modelId, blobUrl) {
    if (this.blobUrls.has(modelId)) {
      // Revoke old URL before registering new one
      this.revokeBlobUrl(modelId);
    }
    this.blobUrls.set(modelId, blobUrl);
    console.log(`Registered blob URL for ${modelId}`);
  }

  // Revoke a specific blob URL
  revokeBlobUrl(modelId) {
    const url = this.blobUrls.get(modelId);
    if (url) {
      URL.revokeObjectURL(url);
      this.blobUrls.delete(modelId);
      console.log(`Revoked blob URL for ${modelId}`);
    }
  }

  // Revoke all blob URLs
  revokeAllBlobUrls() {
    console.log(`Revoking ${this.blobUrls.size} blob URLs`);
    for (const [modelId, url] of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls.clear();
  }

  // Register FBX viewer
  registerFbxViewer(viewer) {
    this.activeFbxViewers.add(viewer);
    console.log(`Registered FBX viewer, total active: ${this.activeFbxViewers.size}`);
  }

  // Dispose FBX viewer
  disposeFbxViewer(viewer) {
    if (this.activeFbxViewers.has(viewer)) {
      viewer.dispose();
      this.activeFbxViewers.delete(viewer);
      console.log(`Disposed FBX viewer, remaining: ${this.activeFbxViewers.size}`);
    }
  }

  // Dispose all FBX viewers
  disposeAllFbxViewers() {
    console.log(`Disposing ${this.activeFbxViewers.size} FBX viewers`);
    for (const viewer of [...this.activeFbxViewers]) {
      this.disposeFbxViewer(viewer);
    }
  }

  // Register model viewer element
  registerModelViewer(element) {
    this.activeModelViewers.add(element);
  }

  // Dispose model viewer element
  disposeModelViewer(element) {
    if (this.activeModelViewers.has(element)) {
      element.remove();
      this.activeModelViewers.delete(element);
    }
  }

  // Queue item for disposal (delayed cleanup)
  queueForDisposal(item, type) {
    this.disposalQueue.push({ item, type, timestamp: Date.now() });
  }

  // Process disposal queue
  processDisposalQueue() {
    const now = Date.now();
    const oldQueue = this.disposalQueue;
    this.disposalQueue = [];

    for (const entry of oldQueue) {
      // Only dispose items older than 10 seconds
      if (now - entry.timestamp > 10000) {
        switch (entry.type) {
          case 'blobUrl':
            this.revokeBlobUrl(entry.item);
            break;
          case 'fbxViewer':
            this.disposeFbxViewer(entry.item);
            break;
          case 'modelViewer':
            this.disposeModelViewer(entry.item);
            break;
        }
      } else {
        // Re-queue items that aren't old enough
        this.disposalQueue.push(entry);
      }
    }
  }

  // Clean up model resources
  cleanupModel(model) {
    const modelId = model.fullPath || model.name;
    
    // Revoke blob URL
    if (model.blobUrl) {
      this.revokeBlobUrl(modelId);
      model.blobUrl = null;
      model.blobData = null;
    }
    
    // Clear thumbnail
    if (model.thumbnailDataUrl) {
      model.thumbnailDataUrl = null;
    }
  }

  // Clean up tile resources
  cleanupTile(tileElement) {
    // Dispose FBX viewer if exists
    if (tileElement.fbxViewerInstance) {
      this.disposeFbxViewer(tileElement.fbxViewerInstance);
      tileElement.fbxViewerInstance = null;
    }

    // Remove model viewer elements
    const modelViewer = tileElement.querySelector('model-viewer');
    if (modelViewer) {
      this.disposeModelViewer(modelViewer);
    }

    // Clean up associated model
    if (tileElement.model) {
      this.cleanupModel(tileElement.model);
      tileElement.model = null;
    }
  }

  // Complete cleanup
  destroy() {
    clearInterval(this.cleanupInterval);
    this.disposeAllFbxViewers();
    this.revokeAllBlobUrls();
    for (const element of this.activeModelViewers) {
      element.remove();
    }
    this.activeModelViewers.clear();
    this.disposalQueue = [];
  }
}

// Create singleton instance
export const memoryManager = new MemoryManager();

// Make available globally for handlers
window.memoryManager = memoryManager;

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
  memoryManager.destroy();
});