// FontHandler.js - Handler for font formats

import { BaseAssetHandler } from './BaseAssetHandler.js';
import { openCustomTextModal } from '../core/ui.js';

export class FontHandler extends BaseAssetHandler {
  constructor() {
    super();
    this.supportedTypes = ['ttf', 'otf', 'woff', 'woff2'];
  }

  canHandle(fileType) {
    return this.supportedTypes.includes(fileType);
  }

  requiresBlobUrl() {
    return true; // Fonts need blob URLs for loading
  }

  async loadThumbnail(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    const fontPreview = document.createElement('div');
    fontPreview.className = 'font-preview';
    
    // Get preview text
    const previewText = localStorage.getItem('fontPreviewText') || 
      'The quick brown fox jumps over the lazy dog';
    
    // Generate unique font family name
    const fontId = `font-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    try {
      // Load the font
      await this.loadFont(fileUrl, fontId);
      
      // Get saved font size or use default
      const savedFontSize = localStorage.getItem(`fontSize_${model.name}`) || 
                           localStorage.getItem('defaultFontSize') || '16';
      
      // Create text container
      const textContainer = document.createElement('div');
      textContainer.style.fontFamily = fontId;
      textContainer.style.fontSize = `${savedFontSize}px`;
      textContainer.textContent = previewText;
      fontPreview.appendChild(textContainer);
      
      // Add custom text button
      const customBtn = document.createElement('button');
      customBtn.className = 'custom-text-btn';
      customBtn.innerHTML = '<i class="fa fa-edit"></i>';
      customBtn.title = 'Customize preview text';
      customBtn.onclick = (e) => {
        e.stopPropagation();
        openCustomTextModal(model, fontId);
      };
      fontPreview.appendChild(customBtn);
      
      container.innerHTML = '';
      container.appendChild(fontPreview);
      
    } catch (error) {
      console.error(`Error loading font ${model.name}:`, error);
      const errorPlaceholder = this.createErrorPlaceholder('Error loading font');
      container.innerHTML = '';
      container.appendChild(errorPlaceholder);
    }
  }

  async loadFullscreen(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    container.style.display = 'flex';
    
    const fontDisplayContainer = document.createElement('div');
    fontDisplayContainer.className = 'fullscreen-font-display';
    
    // Get preview text
    const previewText = localStorage.getItem('fontPreviewText') || 
      'The quick brown fox jumps over the lazy dog. 0123456789';
    
    // Generate unique font family name
    const fontId = `font-fullscreen-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    try {
      await this.loadFont(fileUrl, fontId);
      
      // Get saved font size or use larger default for fullscreen
      const savedFontSize = localStorage.getItem(`fontSize_${model.name}`) || 
                           localStorage.getItem('defaultFontSize') || '40';
      
      // Create main text display
      const textDisplay = document.createElement('div');
      textDisplay.className = 'font-text-display';
      textDisplay.style.fontFamily = fontId;
      textDisplay.style.fontSize = `${savedFontSize}px`;
      textDisplay.textContent = previewText;
      
      // Create controls
      const controls = document.createElement('div');
      controls.className = 'font-controls';
      
      // Font size slider
      const sizeControl = document.createElement('div');
      sizeControl.className = 'font-size-control';
      sizeControl.innerHTML = `
        <label>Size: <span id="fontSizeValue">${savedFontSize}px</span></label>
        <input type="range" id="fontSizeSlider" min="12" max="120" value="${savedFontSize}" />
      `;
      
      // Sample texts
      const samples = document.createElement('div');
      samples.className = 'font-samples';
      samples.innerHTML = `
        <h3>Font Samples</h3>
        <div class="sample" style="font-family: ${fontId}; font-size: 14px;">
          14px: The quick brown fox jumps over the lazy dog
        </div>
        <div class="sample" style="font-family: ${fontId}; font-size: 18px;">
          18px: The quick brown fox jumps over the lazy dog
        </div>
        <div class="sample" style="font-family: ${fontId}; font-size: 24px;">
          24px: The quick brown fox jumps over the lazy dog
        </div>
        <div class="sample" style="font-family: ${fontId}; font-size: 36px;">
          36px: The quick brown fox jumps over the lazy dog
        </div>
        <div class="sample" style="font-family: ${fontId}; font-size: 48px;">
          48px: ABCDEFGHIJKLMNOPQRSTUVWXYZ
        </div>
        <div class="sample" style="font-family: ${fontId}; font-size: 48px;">
          48px: abcdefghijklmnopqrstuvwxyz
        </div>
        <div class="sample" style="font-family: ${fontId}; font-size: 48px;">
          48px: 0123456789 !@#$%^&*()
        </div>
      `;
      
      controls.appendChild(sizeControl);
      fontDisplayContainer.appendChild(textDisplay);
      fontDisplayContainer.appendChild(controls);
      fontDisplayContainer.appendChild(samples);
      
      // Add event listener for size slider
      const slider = sizeControl.querySelector('#fontSizeSlider');
      const sizeValue = sizeControl.querySelector('#fontSizeValue');
      
      slider.addEventListener('input', (e) => {
        const size = e.target.value;
        textDisplay.style.fontSize = `${size}px`;
        sizeValue.textContent = `${size}px`;
        localStorage.setItem(`fontSize_${model.name}`, size);
      });
      
      container.innerHTML = '';
      container.appendChild(fontDisplayContainer);
      
      return {
        type: 'font',
        element: fontDisplayContainer,
        cleanup: () => {
          // Cleanup if needed
        }
      };
      
    } catch (error) {
      console.error(`Error loading font ${model.name}:`, error);
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.textContent = `Error loading font: ${error.message}`;
      container.innerHTML = '';
      container.appendChild(errorMessage);
      
      return {
        element: errorMessage,
        cleanup: () => {
          // Cleanup if needed
        }
      };
    }
  }

  async loadFont(url, fontFamily) {
    const font = new FontFace(fontFamily, `url(${url})`);
    await font.load();
    document.fonts.add(font);
  }

}