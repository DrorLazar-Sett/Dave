// shared/filters.js
// Shared filter state to avoid circular dependencies

// Initialize active filters
export const activeFilters = new Set(['fbx', 'glb', 'video', 'mp3', 'wav', 'ogg', 'image', 'font']);

// Make activeFilters accessible globally for UI components
window.activeFilters = activeFilters;