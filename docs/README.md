# Dave - Digital Assets Viewer Extraordiner

A powerful web-based viewer for previewing and managing digital assets including 3D models (FBX, GLB), videos, audio files, and images in a grid layout.

## Features

- **Multi-format Support**
  - 3D Models: FBX, GLB formats
  - Video files
  - Audio files
  - Image files

- **Grid View Interface**
  - Adjustable thumbnail sizes
  - Customizable items per page (20/50/100/150)
  - Pagination controls

- **Advanced File Management**
  - Folder navigation with path input
  - Configurable subfolder depth scanning
  - File sorting by name, size, type, and date
  - File type filtering
  - Multi-file selection for batch operations

- **User Interface**
  - Dark/Light mode toggle
  - Fullscreen preview support
  - Responsive grid layout
  - Intuitive controls and icons

- **File Operations**
  - Batch file downloads
  - Selection saving
  - Preview generation

## Installation

1. Clone or download this repository
2. No additional installation is required as the viewer runs directly in the browser
3. Dependencies are loaded via CDN:
   - Three.js (for 3D model viewing)
   - Font Awesome (for UI icons)

## Usage

### Using the startup scripts:
```bash
# Linux/macOS
./scripts/Dave.sh

# Windows
scripts\Dave.bat
```

### Or manually:
```bash
# Start the server
node scripts/server.cjs
```

Then open http://localhost:7777/ in a modern web browser
2. Enter a folder path or use the folder picker button to select a directory
3. Configure viewing options:
   - Adjust thumbnail size using the slider
   - Set items per page (20/50/100/150)
   - Toggle subfolder depth scanning
   - Apply file type filters
   - Sort files by various criteria

### Controls

- **Navigation**
  - Use the folder input/picker to select directories
  - Navigate pages using prev/next buttons
  - Adjust subfolder depth via dropdown

- **View Customization**
  - Size slider: Adjust thumbnail size (150px - 400px)
  - Items per page: Choose display density
  - Dark/Light mode: Toggle color scheme
  - Sort options: Name, Size, Type, Date
  - Filter options: FBX, GLB, Video, Audio, Images

- **File Operations**
  - Click items to select/deselect
  - Use selection dropdown for batch operations
  - Preview files in fullscreen mode

## Browser Compatibility

The viewer requires a modern web browser with support for:
- ES6 Modules
- WebGL (for 3D model viewing)
- Modern CSS features

## Technical Details

- Built with vanilla JavaScript using ES6 modules
- Uses Three.js for 3D model rendering
- Implements responsive design principles
- Modular architecture for easy maintenance

## Performance

- Lazy loading of assets for optimal performance
- Efficient grid rendering with pagination
- Optimized 3D model viewing
