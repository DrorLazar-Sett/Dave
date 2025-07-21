// Model3DHandler.js - Handler for 3D model formats

import { BaseAssetHandler } from './BaseAssetHandler.js';
import FBXViewer from '../viewers/viewer_fbx.js';
import { memoryManager } from '../utils/memoryManager.js';

export class Model3DHandler extends BaseAssetHandler {
  constructor() {
    super();
    this.supportedTypes = ['glb', 'gltf', 'fbx', 'obj', 'dae', 'stl', 'ply', '3ds'];
  }

  canHandle(fileType) {
    return this.supportedTypes.includes(fileType);
  }

  requiresBlobUrl() {
    return true; // 3D models need blob URLs for loading
  }

  async loadThumbnail(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    switch (model.subtype || model.type) {
      case 'glb':
      case 'gltf':
        await this.loadGLTFThumbnail(model, container, fileUrl, options);
        break;
      case 'fbx':
        await this.loadFBXThumbnail(model, container, fileUrl, options);
        break;
      case 'obj':
      case 'dae':
      case 'stl':
      case 'ply':
      case '3ds':
        await this.loadThreeJSThumbnail(model, container, fileUrl, options);
        break;
      default:
        throw new Error(`Unsupported 3D format: ${model.type}`);
    }
  }

  async loadGLTFThumbnail(model, container, fileUrl, options) {
    // Ensure model-viewer is loaded
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
    }
    
    const mv = document.createElement('model-viewer');
    mv.src = fileUrl;
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('auto-rotate', '');
    mv.setAttribute('environment-image', 'neutral');
    mv.setAttribute('animation-name', '*');
    mv.setAttribute('disable-zoom', ''); // Disable zoom in grid view
    
    container.innerHTML = '';
    container.appendChild(mv);
  }

  async loadFBXThumbnail(model, container, fileUrl, options) {
    const viewerDiv = document.createElement('div');
    viewerDiv.className = 'three-viewer';
    container.innerHTML = '';
    container.appendChild(viewerDiv);
    
    const viewer = new FBXViewer(viewerDiv, { enableZoom: false });
    container.fbxViewerInstance = viewer;
    memoryManager.registerFbxViewer(viewer);
    viewer.loadModel(fileUrl);
  }

  async loadThreeJSThumbnail(model, container, fileUrl, options) {
    // For now, create a placeholder with format info
    // In a full implementation, we'd create specific loaders for each format
    const placeholder = document.createElement('div');
    placeholder.className = 'model-format-placeholder';
    placeholder.innerHTML = `
      <i class="fa fa-cube"></i>
      <div class="format-label">${model.subtype?.toUpperCase() || model.type.toUpperCase()}</div>
      <div class="format-note">Click to view</div>
    `;
    container.innerHTML = '';
    container.appendChild(placeholder);
  }

  async loadFullscreen(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    switch (model.subtype || model.type) {
      case 'glb':
      case 'gltf':
        return await this.loadGLTFFullscreen(model, container, fileUrl, options);
      case 'fbx':
        return await this.loadFBXFullscreen(model, container, fileUrl, options);
      case 'obj':
      case 'dae':
      case 'stl':
      case 'ply':
      case '3ds':
        return await this.loadThreeJSFullscreen(model, container, fileUrl, options);
      default:
        throw new Error(`Unsupported 3D format: ${model.type}`);
    }
  }

  async loadGLTFFullscreen(model, container, fileUrl, options) {
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
    }
    
    const mv = document.createElement('model-viewer');
    mv.src = fileUrl;
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('auto-rotate', '');
    mv.setAttribute('environment-image', 'neutral');
    mv.setAttribute('animation-name', '*');
    mv.style.width = '100%';
    mv.style.height = '100%';
    
    container.innerHTML = '';
    container.appendChild(mv);
    container.style.display = 'block';
    
    return {
      element: mv,
      cleanup: () => {
        // Cleanup if needed
      }
    };
  }

  async loadFBXFullscreen(model, container, fileUrl, options) {
    const viewerContainer = document.createElement('div');
    viewerContainer.style.width = '100%';
    viewerContainer.style.height = '100%';
    viewerContainer.className = 'three-viewer';
    
    container.innerHTML = '';
    container.appendChild(viewerContainer);
    container.style.display = 'block';
    
    const viewer = new FBXViewer(viewerContainer, { enableZoom: true });
    memoryManager.registerFbxViewer(viewer);
    viewer.loadModel(fileUrl);
    
    return {
      viewerInstance: viewer,
      cleanup: () => {
        memoryManager.disposeFbxViewer(viewer);
        // Cleanup if needed
      }
    };
  }

  async loadThreeJSFullscreen(model, container, fileUrl, options) {
    // For now, show a message about unsupported format
    // In a full implementation, we'd create specific loaders
    const message = document.createElement('div');
    message.className = 'unsupported-format-message';
    message.innerHTML = `
      <i class="fa fa-cube fa-3x"></i>
      <h2>${model.subtype?.toUpperCase() || model.type.toUpperCase()} Format</h2>
      <p>Direct preview for ${model.subtype || model.type} files is coming soon!</p>
      <p>File: ${model.name}</p>
      <button onclick="window.open('${fileUrl}', '_blank')" class="download-btn">
        <i class="fa fa-download"></i> Download File
      </button>
    `;
    
    container.innerHTML = '';
    container.appendChild(message);
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    
    return {
      element: message,
      cleanup: () => {
        // Cleanup if needed
      }
    };
  }
}