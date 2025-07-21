const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 7777;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  // Handle favicon requests
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL and remove query string for file path resolution
  let pathname = req.url.split('?')[0];
  console.log(`Request: ${pathname}`);
  
  // Default to index.html if root path
  if (pathname === '/') {
    pathname = '/src/index.html';
  }
  
  // URL rewriting for resources referenced from index.html
  // When index.html references "styles/styles.css", it becomes "/styles/styles.css"
  // We need to map these to "/src/styles/styles.css"
  if (!pathname.startsWith('/src/') && !pathname.startsWith('/assets/')) {
    // Check if this is a resource that should be under /src/
    const srcResources = ['/styles/', '/core/', '/handlers/', '/utils/', '/shared/', '/viewers/', '/workers/'];
    for (const resource of srcResources) {
      if (pathname.startsWith(resource)) {
        pathname = '/src' + pathname;
        break;
      }
    }
  }

  // Map URL to local file path
  // Server.js is now in scripts/, so go up one level to project root
  const filePath = path.join(__dirname, '..', pathname);
  
  // Get file extension to determine MIME type
  const extname = path.extname(filePath).toLowerCase();
  
  // Set content type based on file extension
  const contentType = MIME_TYPES[extname] || 'text/plain';
  
  // Read and serve the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        console.error(`File not found: ${filePath}`);
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        // Server error
        console.error(`Server error: ${err.code}`);
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      };
      
      res.writeHead(200, headers);
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/ in your browser`);
});
