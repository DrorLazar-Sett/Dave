// AudioHandler.js - Handler for audio formats

import { BaseAssetHandler } from './BaseAssetHandler.js';

export class AudioHandler extends BaseAssetHandler {
  constructor() {
    super();
    this.supportedTypes = ['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a'];
  }

  canHandle(fileType) {
    return this.supportedTypes.includes(fileType);
  }

  requiresBlobUrl() {
    return false; // Audio can stream directly
  }

  async loadThumbnail(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    const audioTile = document.createElement('div');
    audioTile.className = 'audio-tile';
    
    const audioHeader = document.createElement('div');
    audioHeader.className = 'audio-header';
    const ext = (model.subtype || model.type || model.name.split('.').pop()).toUpperCase();
    audioHeader.innerHTML = `<i class="fa fa-music"></i> ${ext}`;
    
    const audioControls = document.createElement('div');
    audioControls.className = 'audio-controls';
    
    const audioElem = document.createElement('audio');
    audioElem.src = fileUrl;
    audioElem.controls = true;
    
    // Stop other audio when playing
    audioElem.addEventListener('play', () => {
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
    fsBtn.onclick = () => {
      // This will be handled by the parent tile click handler
      const event = new CustomEvent('requestFullscreen', { 
        detail: { model },
        bubbles: true 
      });
      fsBtn.dispatchEvent(event);
    };
    audioTile.appendChild(fsBtn);
    
    container.innerHTML = '';
    container.appendChild(audioTile);
  }

  async loadFullscreen(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    container.style.display = 'block';
    
    const audioContainer = document.createElement('div');
    audioContainer.className = 'fullscreen-audio';
    
    const audioHeader = document.createElement('div');
    audioHeader.className = 'fullscreen-audio-header';
    const ext = (model.subtype || model.type || model.name.split('.').pop()).toUpperCase();
    audioHeader.innerHTML = `<i class="fa fa-music"></i> ${ext}`;
    
    const audioControls = document.createElement('div');
    audioControls.className = 'fullscreen-audio-controls';
    
    const audioElem = document.createElement('audio');
    audioElem.src = fileUrl;
    audioElem.controls = true;
    audioElem.autoplay = true;
    audioElem.style.width = '100%';
    
    // Add visualizer placeholder
    const visualizer = document.createElement('div');
    visualizer.className = 'audio-visualizer';
    visualizer.innerHTML = '<div class="visualizer-bars"></div>';
    
    audioControls.appendChild(audioElem);
    audioContainer.appendChild(visualizer);
    audioContainer.appendChild(audioHeader);
    audioContainer.appendChild(audioControls);
    
    // Add file info
    const fileInfo = document.createElement('div');
    fileInfo.className = 'audio-file-info';
    fileInfo.textContent = model.name;
    audioContainer.appendChild(fileInfo);
    
    container.innerHTML = '';
    container.appendChild(audioContainer);
    
    return {
      type: 'audio',
      element: audioElem,
      cleanup: () => {
        audioElem.pause();
        audioElem.currentTime = 0;
        // Cleanup if needed
      }
    };
  }
}