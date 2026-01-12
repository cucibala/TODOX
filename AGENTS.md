# Repository Guidelines

This repository contains **TodoX**, a desktop task manager built with **Electron** (main process) + **Vue 3/Vite** (renderer) and **SQLite** (`better-sqlite3`).

## Project Structure & Module Organization

- `main.js`: Electron main process (windows, IPC handlers, tray, file system access).
- `preload.js`: `contextBridge` surface exposed to the renderer (`window.electronAPI`).
- `database.js`: SQLite schema + migrations/versioning.
- `assets/`: app icons and packaged static assets.
- `server/`: Spring Boot backend (JPA + MySQL) for org/project/task APIs and media storage.
- `src/`: Vue/Vite project
  - `src/src/`: renderer source (`components/`, `pages/`, `stores/`, `utils/`, `assets/`).
  - `vite.config.js`: outputs build artifacts to `dist-vue/`.
- `dist-vue/` (generated): Vite build output consumed by Electron.
- `dist/` (generated): `electron-builder` packaging output.
- `test/`: ad-hoc scripts (not an automated test suite).

## Build, Test, and Development Commands

- Install deps: `npm install` (repo root), then `cd src && npm install`.
- Dev (two terminals):
  - Terminal A: `cd src && npm run dev` (Vite at `http://localhost:5173`).
  - Terminal B: `npm run dev` (Electron loads the Vite URL).
- Server dev: `cd server && mvn spring-boot:run` (configure MySQL in `server/src/main/resources/application.yml`).
- Production run: `npm start` (builds `dist-vue/` then runs Electron).
- Package: `npm run build:win` / `npm run build:mac` / `npm run build:linux` (or `npm run build`).

## Coding Style & Naming Conventions

- Use 2-space indentation; keep existing semicolon usage in `.js`.
- Vue SFCs use `<script setup>`; components are `PascalCase.vue`.
- Stores are simple `.js` modules under `src/src/stores/`; keep naming consistent with nearby files.
- IPC rule: only pass plain serializable data over IPC (no Vue `ref/reactive` proxies, functions, or cyclic objects).
- UI rule: do not use native `confirm`; use the project’s custom confirm dialog/component.

## Testing Guidelines

No dedicated unit/e2e framework is configured. Validate changes with:
- `npm run vue:build` and a quick manual smoke test via `npm run dev` / `npm start`.
- Packaging sanity check when relevant: `npm run build:win` (or platform equivalent).

## Commit & Pull Request Guidelines

- Commit subjects follow the existing prefixes: `add: …`, `modify: …`, `fixed: …`, `release: x.y.z` (often in Chinese; keep it short).
- For UI changes, include screenshots/GIFs in the PR.
- For schema changes, add a migration in `database.js` and document user-visible changes in `更新日志.md` (简体中文、要点式、无 emoji).

## Security & Configuration Tips

- Never commit API keys or secrets; keep local config in `.env`/app settings and exclude it from commits.
- Server org passwords are stored as BCrypt hashes; admins must insert the hash into the database.
