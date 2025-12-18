# Style & conventions

## General
- Keep changes minimal and consistent with nearby code.
- Indentation: typically 2 spaces in JS/Vue files.
- Semicolons: follow existing file style (many `.js` files use semicolons).

## Vue
- SFC components are `PascalCase.vue`.
- Renderer entrypoint: `src/src/main.js` uses Vue 3 + Pinia.
- Stores live in `src/src/stores/` and are plain `.js` modules.

## Electron / IPC
- `preload.js` exposes APIs via `contextBridge` under `window.electronAPI`.
- IPC payload rule: only pass plain serializable data (no Vue `ref/reactive` proxies, functions, class instances, or cyclic objects).

## UI behavior
- Avoid native/browser `confirm` due to Windows focus issues; use the project’s custom confirm dialog/component.

## Changelog
- `更新日志.md` should be 简体中文, short, point-form, no emoji; headings like `## vX.Y.Z - YYYY-MM-DD`.
