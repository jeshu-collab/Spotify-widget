# Spotify Glass Widget

A lightweight, standalone Windows desktop widget that brings a premium, Apple-inspired glassmorphism user interface directly to your workspace. 

Designed to be clean and unobtrusive, this widget syncs seamlessly with your local Spotify application. It provides real-time playback information, media controls, and live synced lyrics without requiring you to open the full Spotify desktop application or configure complex developer API keys.

---

## Key Features

**Live Synced Lyrics**
Click the chevron icon to open the lyrics drawer. The application automatically fetches and scrolls timestamped lyrics in real time using the LRCLIB API.

**Glassmorphism Design**
The interface utilises a frosted-glass effect with background blurring that blends perfectly with any desktop wallpaper.

**Smart Window Resizing**
The widget strictly locks its vertical height to keep your workspace clean, while allowing horizontal adjustments to accommodate longer song titles.

**Zero Configuration**
It reads media data directly from the local Windows media controller using the native SMTC monitor. No Spotify developer accounts or API keys are required.

**Always-on-Top & Quick Share**
The widget floats above your active applications without causing obstruction. It also features a quick-share button to instantly copy your currently playing track to the clipboard.

---

## Installation Guide (For Users)

This application is completely portable. There is no installation setup required.

1. Navigate to the [Releases page](https://github.com/jeshu-collab/Spotify-widget/releases).
2. Download the latest `SpotifyWidget.exe` file.
3. Place the executable file on your Desktop or in any preferred folder.
4. Double-click to launch the application.

### Recommended Setup
For the best user experience, it is highly recommended to configure the widget to launch automatically on boot:
1. Press `Windows Key + R` to open the Run dialogue.
2. Type `shell:startup` and press Enter.
3. Create a shortcut of the `SpotifyWidget.exe` file and place it inside this folder.
*Note: Ensure your official Spotify desktop application is running in the background, as the widget actively links to it to fetch media information.*

### Important Notice for First-Time Users
Since this is an independent application without a commercial digital signature, Windows SmartScreen will not recognise it immediately. Upon your first launch, you may see a blue prompt stating that Windows protected your PC. 

To bypass this:
1. Click **More info** below the warning text.
2. Click the **Run anyway** button that appears.
Windows will register the application as safe for all future launches.

---

## Development Guide (For Developers)

If you wish to clone this repository and build the application from source, follow these steps.

### Prerequisites
* Node.js installed on your system.
* Windows OS (Required for the `windows-smtc-monitor
