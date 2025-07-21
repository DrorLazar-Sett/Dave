// VideoHandler.js - Handler for video formats

import { BaseAssetHandler } from './BaseAssetHandler.js';

export class VideoHandler extends BaseAssetHandler {
  constructor() {
    super();
    this.supportedTypes = ['mp4', 'webm', 'ogv', 'mov', 'avi', 'mkv'];
  }

  canHandle(fileType) {
    return this.supportedTypes.includes(fileType);
  }

  requiresBlobUrl() {
    return false; // Videos can stream directly
  }

  async loadThumbnail(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    const videoPreview = document.createElement('div');
    videoPreview.className = 'video-preview';
    
    const video = document.createElement('video');
    video.src = fileUrl;
    video.muted = true;
    video.className = 'preview-video';
    videoPreview.appendChild(video);
    
    // Add scrub bar
    const scrubBarContainer = document.createElement('div');
    scrubBarContainer.className = 'scrub-bar-container';
    const scrubBar = document.createElement('div');
    scrubBar.className = 'scrub-bar';
    scrubBarContainer.appendChild(scrubBar);
    
    const timeMarker = document.createElement('div');
    timeMarker.className = 'time-marker';
    scrubBar.appendChild(timeMarker);
    videoPreview.appendChild(scrubBarContainer);
    
    // Add scrubbing functionality
    let isDragging = false;
    
    const updateVideoTime = (e) => {
      if (!video.duration) return;
      const rect = scrubBarContainer.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const newTime = percentage * video.duration;
      video.currentTime = newTime;
      scrubBar.style.width = `${percentage * 100}%`;
      timeMarker.textContent = this.formatTime(newTime);
      timeMarker.style.left = `${percentage * 100}%`;
    };
    
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
    
    scrubBarContainer.addEventListener('mousemove', updateVideoTime);
    
    container.innerHTML = '';
    container.appendChild(videoPreview);
  }

  async loadFullscreen(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    // Use the fullscreen video element
    const fullscreenVideo = document.getElementById('fullscreenVideo');
    if (fullscreenVideo) {
      container.style.display = 'none';
      fullscreenVideo.style.display = 'block';
      fullscreenVideo.src = fileUrl;
      fullscreenVideo.play();
      
      // Get reference to preview video
      const previewVideo = document.querySelector(`[data-model-name="${model.name}"] video`);
      
      return {
        type: 'video',
        previewVideo: previewVideo,
        cleanup: () => {
          // Cleanup if needed
        }
      };
    }
    
    // Fallback if fullscreenVideo element doesn't exist
    const video = document.createElement('video');
    video.src = fileUrl;
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.height = '100%';
    
    container.innerHTML = '';
    container.appendChild(video);
    container.style.display = 'block';
    
    return {
      element: video,
      cleanup: () => {
        video.pause();
      }
    };
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}