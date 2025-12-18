# Suggested commands (Windows / PowerShell)

## Install
- `npm install`
- `cd src; npm install; cd ..`

## Development (two terminals)
- Terminal A (Vite): `cd src; npm run dev`
- Terminal B (Electron): `npm run dev`

## Production run
- `npm start` (builds renderer then runs Electron)

## Build renderer only
- `npm run vue:build`

## Package app (electron-builder)
- `npm run build` (current platform)
- `npm run build:win`
- `npm run build:mac`
- `npm run build:linux`

## Useful repo commands
- Search: `rg -n "pattern"` (ripgrep)
- List: `Get-ChildItem -Force`
- Git history: `git --no-pager log -n 20 --pretty=format:"%h %s"`
