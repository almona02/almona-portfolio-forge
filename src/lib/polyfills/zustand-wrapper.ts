// Wrapper to provide default export for zustand 5.x
// Some packages (like @react-three/fiber) try to import zustand with default import
// but zustand 5.x only has named exports. This wrapper provides compatibility.
// NOTE: This imports from the actual zustand package (not the wrapper) because
// the resolveId plugin only redirects imports FROM the events file, not imports WITHIN the wrapper
import * as zustandModule from 'zustand';

// Export all named exports
export * from 'zustand';

// Provide default export for compatibility with old import style
// This allows: import zustand from 'zustand' to work
// The default export is the entire module namespace
export default zustandModule;

