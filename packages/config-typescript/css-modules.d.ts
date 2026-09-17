/**
 * Next.js types `*.module.css` only. Plain `import "…css"` side-effect imports
 * (e.g. react-grid-layout) need an ambient module when the language service
 * checks `noUncheckedSideEffectImports`.
 */
declare module "*.css";
