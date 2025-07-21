// state.js
// This file is currently not used by other modules.
// Kept for potential future state management centralization.

export function updateFilteredModelFiles(modelFiles, filteredModelFiles, activeFilters) {
  const previousLength = filteredModelFiles.length;
  filteredModelFiles.length = 0;
  filteredModelFiles.push(...modelFiles.filter(item => activeFilters.has(item.type)));
  return previousLength !== filteredModelFiles.length;
}
