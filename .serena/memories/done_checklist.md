# What to do when a task is completed

- Build renderer: `npm run vue:build`.
- Smoke test:
  - Dev: run Vite + Electron (`cd src; npm run dev` and `npm run dev`).
  - Prod: `npm start`.
- If packaging-related: run `npm run build:win` (or the target platform).
- If database/schema changes: add a migration in `database.js` and update `更新日志.md` with user-visible changes.
- Ensure IPC calls only pass plain serializable data; avoid native `confirm`.
