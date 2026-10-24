# Chrome Web Store Listing — OmniScope OSINT: Global Weather, Radar & Sensor Side Panel

Ready-to-paste copy for the Chrome Web Store Developer Dashboard. Every constraint from Google's Developer Program Policies is respected.

---

## Package Summary

| Field | Value |
|---|---|
| **Name** | OmniScope OSINT: Global Weather, Radar & Sensor Side Panel |
| **Characters** | 58 / 75 max |
| **Version** | `2.6.0` |
| **Manifest Version** | `3` |
| **Category** | Productivity (or News & Weather) |
| **Language** | English (`en`) |

---

## Store Listing Copy

### Short Description (from `manifest.json` — 126 / 132 characters max)
```
Real-time global weather radar, NOAA tornado alerts, USGS earthquakes, geomagnetic oscilloscope & live webcams in Side Panel.
```

### Detailed Description
```
OmniScope OSINT brings a professional, zero-fake global weather, Doppler radar, seismic, geomagnetic, and live webcam operations center directly into your Chrome Side Panel.

Monitor live atmospheric conditions, severe storm outbreaks, and geophysical sensors side-by-side while you browse, research, or work — with zero API keys, zero subscriptions, and zero user tracking.

KEY FEATURES
• Interactive Doppler Radar & Tactical Map: Live global RainViewer precipitation radar timeline loop, USGS M2.5+ earthquake markers, VLF lightning vectors, and verified webcam markers right in your Chrome Side Panel.
• Sector Box-Scan Station Mesh: Click "Box-Scan" and drag a bounding rectangle anywhere on the map to sample a 9-point virtual weather station grid (Temperature, Wind, Gusts, Surface Pressure) in real time.
• 4-Model Ensemble Consensus Engine: Compare live atmospheric forecasts side-by-side across DWD ICON (Germany), NOAA GFS (USA), ECMWF IFS (Europe), and MeteoFrance AROME with automatic ensemble spread calculation (Δ°C).
• Live NOAA Severe & Tornado Alerts + USGS Earthquakes: Instant feed of active NOAA NWS Tornado Warnings (OBSERVED vs. RADAR INDICATED), Severe Thunderstorm Warnings, Flash Flood Emergencies, and global M2.5+ earthquakes with 1-click map fly-to.
• 3-Axis Fluxgate Magnetometer & VLF Lightning Oscilloscope: Real-time 3-axis geomagnetic field oscilloscope (Bx, By, Bz, |B| in nanoTesla), live NOAA SWPC Planetary Kp-Index, Blitzortung VLF sferics waveform (3–30 kHz), and synchronized local atmospheric telemetry.
• Historical Weather & Tornado Archive (1940–Present): Query over 85 years of ECMWF ERA5 reanalysis data with 1-click presets for historic outbreaks (2013 Moore EF5, 2013 El Reno, 2011 Joplin EF5, 2021 Ahrtal Flood) or any custom date and city.
• 56 Verified Live Webcams: Proximity-sorted live weather and Earth observation cameras (DWD, Pelmorex, NASA ISS, USGS Volcanoes, PANOMAX) with a strict Zero-Fake policy.
• Right-Click Context Menu Lookup: Highlight any city or coordinates on any webpage, right-click, and select "Locate in OmniScope OSINT Side Panel" to inspect live radar and telemetry immediately.

PRIVACY & ZERO-FAKE ARCHITECTURE
• 100% Keyless Open Data: Powered directly by Open-Meteo, RainViewer, USGS, NOAA NWS/SWPC, and WhereTheISS.
• Zero Tracking: No analytics, no cookies, no personal data collection, and no external third-party scripts. All preferences are stored locally on your device via chrome.storage.local.

Full Web HUD: https://omniscope-web.pages.dev
Open-Source Repository: https://github.com/finnytech/omniscope-web
```

---

## Graphic Assets Checklist

All assets are pre-generated using the official OmniScope Nano Banana 2.1 AI Emblem and located in `D:\projects\omniscope-chrome-extension\`:

| Asset | Dimensions | Format | File Path | Status |
|---|---|---|---|---|
| **App Icon (128x128)** | 128 × 128 px | 24-bit PNG | `icons/icon-128.png` | ✅ Ready |
| **Toolbar Icon (16/32/48)** | 16, 32, 48 px | 24-bit PNG | `icons/icon-16.png`, `icon-32.png`, `icon-48.png` | ✅ Ready |
| **High-Res Badge (512x512)** | 512 × 512 px | 24-bit PNG | `icons/icon-512.png` | ✅ Ready |
| **Screenshot 1** | 1280 × 800 px | 24-bit PNG | `store-assets/screenshot-1-1280x800.png` | ✅ Ready |
| **Small Promo Tile** | 440 × 280 px | 24-bit PNG | `store-assets/promo-small-440x280.png` | ✅ Ready |
| **Marquee Promo Tile** | 1400 × 560 px | 24-bit PNG | `store-assets/marquee-1400x560.png` | ✅ Ready |

---

## Privacy Tab — Permission Justifications

### Single Purpose Description
```
This extension provides a real-time global weather radar, severe storm alert, seismic, geomagnetic, and live webcam dashboard inside the Chrome Side Panel.
```

### Permission Justifications

#### `sidePanel`
```
Required to render the OmniScope OSINT weather radar, map, and sensor telemetry interface inside Chrome's native Side Panel so users can monitor weather and alerts alongside their active browsing tab.
```

#### `storage`
```
Used exclusively to save the user's last selected map coordinates, city name, and cached telemetry snapshots locally on their device via chrome.storage.local. No data is synced or transmitted externally.
```

#### `alarms`
```
Used by the background service worker to periodically poll public USGS earthquake and NOAA space weather feeds every 5 minutes to update the extension toolbar badge and trigger optional severe earthquake notifications.
```

#### `contextMenus`
```
Provides a right-click context menu item ("Locate '<selection>' in OmniScope OSINT Side Panel") so users can highlight any city name or coordinate pair on a webpage and immediately center the Side Panel weather radar on that location.
```

#### `notifications`
```
Used to display a native desktop alert when the background service worker detects a significant M5.5+ global earthquake from the public USGS GeoJSON feed.
```

#### `host_permissions`
```
Required to fetch real-time, public, keyless meteorological and geophysical open data directly from official scientific APIs:
- https://*.open-meteo.com/* (Live multi-model weather forecast, air quality, geocoding, and ERA5 historical archive)
- https://api.rainviewer.com/* & https://*.rainviewer.com/* (Live global Doppler weather radar tiles)
- https://earthquake.usgs.gov/* (Live USGS global earthquake GeoJSON feed)
- https://api.weather.gov/* (Live NOAA National Weather Service severe & tornado warnings)
- https://services.swpc.noaa.gov/* (Live NOAA Space Weather Prediction Center planetary Kp-index)
- https://api.wheretheiss.at/* (Live International Space Station orbital coordinates)
- https://*.basemaps.cartocdn.com/* & https://*.tile.openstreetmap.org/* (Base map tiles for the Leaflet radar map)
```

---

## Data Usage Disclosures

- **Does this extension collect or transmit any user data?** **No.**
- **Certification Checkboxes:**
  - [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
  - [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
  - [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy Policy URL
```
https://omniscope-web.pages.dev/PRIVACY_POLICY.md
```
*(Also included in the repository at `PRIVACY_POLICY.md` and `https://github.com/finnytech/omniscope-web/blob/main/SECURITY.md`)*
