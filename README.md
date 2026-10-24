<div align="center">

<img src="icons/logo-badge-512.png" alt="OmniScope OSINT Official Logo" width="220" style="border-radius: 24px; box-shadow: 0 0 30px rgba(0, 240, 255, 0.35);" />

# 🌍 OmniScope OSINT — Chrome Side Panel Extension (`v2.6.0`)

**Realtime Global Weather Doppler Radar, Multi-Model Consensus, NOAA Tornado Alerts, USGS Earthquakes, 3-Axis Geomagnetic Oscilloscope & Verified Live Webcams directly inside your Chrome Side Panel.**

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-00f0ff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/finnytech/omniscope-extension)
[![Version](https://img.shields.io/badge/Version-v2.6.0-10b981?style=for-the-badge)](https://github.com/finnytech/omniscope-extension/releases)
[![Zero-Fake Policy](https://img.shields.io/badge/Zero--Fake_Policy-100%25_Real_Telemetry-f59e0b?style=for-the-badge)](https://omniscope-web.pages.dev)
[![Cloudflare Live](https://img.shields.io/badge/Cloudflare_Web-Live_HUD-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://omniscope-web.pages.dev)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://omniscope-web.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

[**🚀 Live Web App (Cloudflare)**](https://omniscope-web.pages.dev) · [**▲ Live Web App (Vercel)**](https://omniscope-web.vercel.app) · [**📦 Download Extension ZIP (`v2.6.0`)**](releases/OmniScope-Chrome-Extension-v2.6.0.zip) · [**🌐 Main Web Repo**](https://github.com/finnytech/omniscope-web)

</div>

---

## ⚡ Quick Setup Guide (Install in 30 Seconds via GitHub)

You can install the **OmniScope OSINT Side Panel Extension** directly from this GitHub repository on **Google Chrome**, **Brave**, **Microsoft Edge**, **Vivaldi**, or **Opera**:

### Option A: Install via Pre-Packaged Release ZIP (Recommended)
1. Download [**`OmniScope-Chrome-Extension-v2.6.0.zip`**](releases/OmniScope-Chrome-Extension-v2.6.0.zip) from this repository.
2. Extract the `.zip` archive into a permanent folder on your computer (e.g., `D:\OmniScope-Extension`).
3. Open your browser's Extensions management page:
   - **Google Chrome:** `chrome://extensions/`
   - **Brave Browser:** `brave://extensions/`
   - **Microsoft Edge:** `edge://extensions/`
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click **Load unpacked** (top-left button) and select the extracted folder (the directory containing `manifest.json`).
6. **Launch Side Panel:** Click the **OmniScope OSINT** emblem in your browser toolbar (pin it via the puzzle icon 📌) to open the live tactical Side Panel alongside any active webpage!

### Option B: Install via Git Clone (For Developers & Fast Updates)
```bash
git clone https://github.com/finnytech/omniscope-extension.git
```
Then open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the cloned `omniscope-extension` directory.

---

## 🛰️ Tactical Side Panel Features (`v2.6.0`)

| Module | Capabilities |
| :--- | :--- |
| **🗺️ Interactive Doppler Radar Map** | Built-in dark tactical **Leaflet** map (`vendor/leaflet.js` bundled locally for strict MV3 CSP security) with live **RainViewer Doppler Radar** timeline slider & play/pause loop. |
| **📐 Sector Box-Scan (`Box-Scan`)** | Click `📐 Box-Scan` and drag an emerald bounding box anywhere on the map. Automatically disables map panning during selection and queries a **9-point virtual weather station mesh** (Temperature, Wind, Gusts, Surface Pressure) via Open-Meteo. |
| **🧠 4-Model Ensemble Consensus** | Side-by-side live comparison of **🇩🇪 DWD ICON**, **🇺🇸 NOAA GFS**, **🇪🇺 ECMWF IFS**, and **🇫🇷 MeteoFrance AROME** with real-time ensemble temperature spread (`Δ°C`) calculation. |
| **🌪️ NOAA Severe Alerts & 🌍 USGS Quakes** | Live **NOAA NWS Severe & Tornado Warnings** (`OBSERVED` vs. `RADAR INDICATED`), **USGS M2.5+ Global Earthquakes** with 1-click map fly-to, and background service-worker badge updates every 5 minutes. |
| **🧲 3-Axis Fluxgate Magnetometer & VLF Blitz** | Real-time **3-Axis Geomagnetic Oscilloscope (`Bx`, `By`, `Bz`, `\|B\|` in nT)**, live **NOAA SWPC Planetary Kp-Index**, **Blitzortung VLF Sferics Waveform (3–30 kHz)**, **Live ISS Tracker**, and a built-in **Local Atmospheric Weather Companion**. |
| **🏛️ ERA5 Historical Archive (`1940–Present`)** | Inspect 85+ years of real **ECMWF ERA5** hourly reanalysis data with 1-click presets for historic outbreaks (*2013 Moore EF5*, *2013 El Reno*, *2011 Joplin EF5*, *2011 Super Outbreak*, *2021 Ahrtal Flood*, *1962 North Sea Storm Surge*) or any custom date. |
| **📷 56 Verified Live Webcams** | Proximity-sorted authentic weather, airport, volcano, and Earth-observation cameras (**Zero-Fake Policy** — zero simulated streams). |
| **🖱️ Right-Click Context Menu** | Highlight any city name or coordinate pair (`lat, lon`) on any webpage -> Right-click -> **`Locate "<selection>" in OmniScope OSINT Side Panel`**. |

---

## 🔒 Security, Privacy & Manifest V3 Architecture

- **100% Keyless Open Data**: Powered directly by public scientific APIs (`Open-Meteo`, `RainViewer`, `USGS`, `NOAA NWS/SWPC`, `WhereTheISS`). Zero API keys or accounts required.
- **Strict Content Security Policy (`script-src 'self'`)**: All JavaScript and CSS (`vendor/leaflet.js`, `sidepanel.js`) are bundled inside the extension package. Zero external CDNs, zero inline scripts, zero `eval()`.
- **Zero Tracking**: No telemetry, no analytics, and no user data collection. Preferences are stored strictly locally in `chrome.storage.local`. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

---

## 🌐 OmniScope OSINT Ecosystem — Official Web Apps & Sister Repositories

Explore the complete **OmniScope OSINT by FinnyTech** multi-platform ecosystem:

| Platform / Project | Live URL / Repository Link | Description |
| :--- | :--- | :--- |
| **🌐 OmniScope Web HUD (Cloudflare Pages)** | [**https://omniscope-web.pages.dev**](https://omniscope-web.pages.dev) | Primary global Anycast Edge Web Command Center (MON-01 / MON-02 multi-monitor HUD, 3D Globe, 147 weather models). |
| **▲ OmniScope Web HUD (Vercel Production)** | [**https://omniscope-web.vercel.app**](https://omniscope-web.vercel.app) | High-speed Vercel Edge Web deployment with full serverless WebBridge support. |
| **💻 `finnytech/omniscope-web`** | [**github.com/finnytech/omniscope-web**](https://github.com/finnytech/omniscope-web) | Official Web Application repository, Cloudflare Edge Worker (`_worker.js`), Windows `.exe` & Android `.apk` releases. |
| **🛰️ `finnytech/omniscope-osint`** | [**github.com/finnytech/omniscope-osint**](https://github.com/finnytech/omniscope-osint) | Public OSINT core architecture, documentation, and multi-platform release hub. |
| **🧩 `finnytech/omniscope-extension`** | [**github.com/finnytech/omniscope-extension**](https://github.com/finnytech/omniscope-extension) | **This Repository** — Official Manifest V3 Chrome Side Panel Extension (`v2.6.0`). |
| **🤖 `finnytech/omniscope-mcp`** | [**github.com/finnytech/omniscope-mcp**](https://github.com/finnytech/omniscope-mcp) | Official Model Context Protocol (MCP) Server enabling AI agents (Claude, Gemini, Cursor) to query live OmniScope telemetry. |
| **🪟 Windows Desktop Native (`.exe`)** | [**Download Windows x64 ZIP**](https://github.com/finnytech/omniscope-web/raw/main/OmniScope-v2.5-Windows-x64.zip) | Standalone native Windows x64 desktop application (`OmniScope.exe`) with the official Nano Banana 2.1 emblem. |
| **📱 Android Mobile Native (`.apk`)** | [**Download Android APK**](https://github.com/finnytech/omniscope-web/raw/main/OmniScope-v2.5.apk) | Signed standalone Android mobile app (`OmniScope-v2.5.apk`) with native hardware acceleration. |

---

<div align="center">
  <b>Built with ⚡ by <a href="https://github.com/finnytech">FinnyTech</a> · Licensed under the <a href="LICENSE">MIT License</a></b>
</div>
