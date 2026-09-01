# ⚡ Focus Flow — Productive Session Queue, Ambient Audio & MyCES Cloud Sync

A Windows desktop productivity widget designed for deep focus, flow state management, and real-time study tracking.

---

## ✨ Features

- ⏱️ **Circular Focus Timer & Smart Break Engine**:
  - Continuous anti-doomscroll break countdown (silent breaks to rest the mind).
  - Single tap for **5-minute Short Break**, hold for 3s for **15-minute Long Break**.
  - Intelligent break upgrades that preserve remaining time without resetting.
  - Mechanical countdown tick in the last 5 seconds.
- 📋 **Draggable Plan Queue**:
  - Add tasks with custom durations (1–240 min).
  - Reorder task priority via drag-and-drop.
  - Auto-chaining sessions from task to task.
  - Smart auto-cleanup of completed tasks on exit/reboot.
- 📊 **Live Productivity Analytics**:
  - Focus time completed today.
  - Tasks completed & session counter.
  - Real-time Flow State efficiency progress bar.
- 🎧 **Pure Background Focus Audio**:
  - 100% background ad-free streaming.
  - Curated focus channels: *Concert Hall Piano*, *Focus Room Rain in Car*, *White Noise Live*, *Synthwave*, *Lofi Chill*, and *Coffee Lounge*.
  - Custom YouTube URL loader.
  - Timer-synchronized playback (music auto-pauses on break and focus completion).
- ☀️ **Adaptive Solar & Windows OS Theme**:
  - **Daylight Morning Mode**: Pearlescent luminous glass with amber/rose ambient glow and dark typography.
  - **Midnight Dark Mode**: Deep glassmorphism with violet neon accents.
  - Real-time Windows OS theme sync + manual toggle.
- 🔲 **Floating Pill Mode**:
  - Micro floating widget with unconstrained dragging anywhere on the screen.
- ☁️ **Live MyCES Cloud Sync (Supabase)**:
  - 1-click topic importer directly from your curriculum (SQL Track, Power BI Track, Python Track).
  - Auto-logs completed sessions directly to your MyCES study logs in real time.
  - Live module status updater (`Not Started` ➔ `In Progress` ➔ `Completed`).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Desktop Widget
```bash
npm start
```
or
```bash
npx electron .
```

---

## 🛠️ Tech Stack
- **Framework**: Electron (Windows Desktop Window Management & Floating Pill Mode)
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 Glassmorphism
- **Audio Engine**: Web Audio API (Synthesizers & Harmonic Cues) + Background Webview Audio
- **Backend & Cloud**: Supabase REST API (Real-time Cloud Sync)
