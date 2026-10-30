# PlayVortex Companion

This is a desktop app starter for a legitimate PlayVortex utility client.

It focuses on:
- launch controls
- profile switching
- performance monitoring
- overlays and utility panels
- gameplay quality-of-life helpers

This project is not a cheat client or bypass tool. It is designed as a local companion app for better setup, monitoring, and configuration.

## Project stack
- React + TypeScript for the UI
- Vite for frontend development
- Tauri for the desktop shell

## Local development

1. Install dependencies:
   npm install

2. Start the app in development mode:
   npm run tauri dev

3. Build the desktop app:
   npm run tauri build

## Testing ideas
- Confirm the app opens as a desktop window
- Switch between profiles
- Toggle overlay/performance controls
- Confirm the app remains stable on refresh/relaunch
- Test build output for Windows/macOS/Linux depending on your environment

## Notes
The app is intentionally scaffolded as a safe utility project, so it can be extended with:
- startup profiles
- FPS and latency panels
- launcher shortcuts
- settings backup tools
- game-specific performance presets
