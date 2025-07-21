// DocumentHandler.js - Handler for document formats (PDF)

import { BaseAssetHandler } from './BaseAssetHandler.js';

export class DocumentHandler extends BaseAssetHandler {
  constructor() {
    super();
    this.supportedTypes = ['pdf'];
    this.pdfJsLoaded = false;
  }

  canHandle(fileType) {
    return this.supportedTypes.includes(fileType);
  }

  requiresBlobUrl() {
    return true; // Need blob URL for PDF loading
  }

  async loadPdfJs() {
    if (this.pdfJsLoaded) return;
    
    // Load PDF.js library
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);
    
    await new Promise(resolve => script.onload = resolve);
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    this.pdfJsLoaded = true;
  }

  async loadThumbnail(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    try {
      await this.loadPdfJs();
      
      // Create canvas for thumbnail
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      const pdf = await loadingTask.promise;
      
      // Get first page
      const page = await pdf.getPage(1);
      
      // Set canvas dimensions
      const viewport = page.getViewport({ scale: 0.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render page
      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;
      
      // Create container
      const pdfPreview = document.createElement('div');
      pdfPreview.className = 'pdf-preview';
      pdfPreview.appendChild(canvas);
      
      // Add page indicator
      const pageInfo = document.createElement('div');
      pageInfo.className = 'pdf-page-info';
      pageInfo.textContent = `${pdf.numPages} pages`;
      pdfPreview.appendChild(pageInfo);
      
      container.innerHTML = '';
      container.appendChild(pdfPreview);
      
      // Clean up
      pdf.destroy();
      
    } catch (error) {
      console.error('Error loading PDF thumbnail:', error);
      
      // Show fallback
      const placeholder = document.createElement('div');
      placeholder.className = 'pdf-placeholder';
      placeholder.innerHTML = `
        <i class="fa fa-file-pdf-o"></i>
        <div class="format-label">PDF</div>
      `;
      container.innerHTML = '';
      container.appendChild(placeholder);
    }
  }

  async loadFullscreen(model, container, options = {}) {
    const fileUrl = await this.getFileUrl(model);
    
    // For fullscreen, we'll use an iframe to display the PDF
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    container.innerHTML = '';
    container.appendChild(iframe);
    container.style.display = 'block';
    
    // Add download button
    const controls = document.createElement('div');
    controls.className = 'pdf-controls';
    controls.innerHTML = `
      <button class="pdf-download" title="Download PDF">
        <i class="fa fa-download"></i> Download
      </button>
    `;
    
    controls.querySelector('.pdf-download').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = model.name;
      a.click();
    });
    
    container.appendChild(controls);
    
    return {
      element: iframe,
      cleanup: () => {
        // Cleanup if needed
      }
    };
  }
}