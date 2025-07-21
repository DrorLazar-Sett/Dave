// ImageHandler.js - Handler for image formats

import { BaseAssetHandler } from './BaseAssetHandler.js';

export class ImageHandler extends BaseAssetHandler {
  constructor() {
    super();
    this.supportedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];
  }

  canHandle(fileType) {
    return this.supportedTypes.includes(fileType);
  }

  requiresBlobUrl() {
    return true; // Need blob URLs for images to enable download
  }

  async loadThumbnail(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    const imagePreview = document.createElement('div');
    imagePreview.className = 'image-preview';
    
    const imgElem = document.createElement('img');
    imgElem.draggable = false;
    
    // Check if we have a cached thumbnail
    if (model.thumbnailDataUrl) {
      imgElem.src = model.thumbnailDataUrl;
    } else {
      try {
        // For SVG files, we can use them directly without generating thumbnails
        if (model.subtype === 'svg' || model.type === 'svg') {
          imgElem.src = fileUrl;
        } else {
          // Generate thumbnail for raster images
          const thumbnailDataUrl = await this.generateThumbnail(fileUrl, 400, 400);
          model.thumbnailDataUrl = thumbnailDataUrl;
          imgElem.src = thumbnailDataUrl;
        }
      } catch (error) {
        console.error(`Error generating thumbnail for ${model.name}:`, error);
        imgElem.src = fileUrl; // Fallback to full image
      }
    }
    
    imagePreview.appendChild(imgElem);
    container.innerHTML = '';
    container.appendChild(imagePreview);
  }

  async generateThumbnail(imageUrl, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  }

  async loadFullscreen(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    container.style.display = 'block';
    
    const img = document.createElement('img');
    img.src = fileUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    
    // Add special handling for SVG to ensure proper display
    if (model.subtype === 'svg' || model.type === 'svg') {
      img.style.maxWidth = '90%';
      img.style.maxHeight = '90%';
      img.style.margin = 'auto';
      img.style.display = 'block';
    }
    
    container.innerHTML = '';
    container.appendChild(img);
    
    // Add zoom controls for images
    this.addImageControls(container, img);
    
    return {
      element: img,
      cleanup: () => {
        // Cleanup if needed
      }
    };
  }

  addImageControls(container, img) {
    const controls = document.createElement('div');
    controls.className = 'image-controls';
    controls.innerHTML = `
      <button class="zoom-in" title="Zoom In"><i class="fa fa-plus"></i></button>
      <button class="zoom-out" title="Zoom Out"><i class="fa fa-minus"></i></button>
      <button class="zoom-reset" title="Reset Zoom"><i class="fa fa-expand"></i></button>
    `;
    
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    
    const updateTransform = () => {
      img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    };
    
    controls.querySelector('.zoom-in').addEventListener('click', () => {
      scale = Math.min(scale * 1.2, 5);
      updateTransform();
    });
    
    controls.querySelector('.zoom-out').addEventListener('click', () => {
      scale = Math.max(scale / 1.2, 0.5);
      updateTransform();
    });
    
    controls.querySelector('.zoom-reset').addEventListener('click', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateTransform();
    });
    
    // Add pan functionality
    let isDragging = false;
    let startX, startY;
    
    img.addEventListener('mousedown', (e) => {
      if (scale > 1) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        img.style.cursor = 'grabbing';
      }
    });
    
    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
      }
    });
    
    window.addEventListener('mouseup', () => {
      isDragging = false;
      img.style.cursor = scale > 1 ? 'grab' : 'default';
    });
    
    container.appendChild(controls);
  }
}