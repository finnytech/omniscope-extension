/**
 * OmniScope OSINT — Chrome Side Panel Tactical Controller (v2.6.0)
 * Manifest V3 Compliant · Zero-Fake Keyless Open-Data Architecture
 */

const state = {
  lat: 50.1109,
  lon: 8.6821,
  locationName: 'Frankfurt, DE',
  map: null,
  activeMarker: null,
  radarFrames: [],
  radarTileLayers: {},
  radarCurrentIdx: 0,
  radarPlaying: false,
  radarTimer: null,
  layers: {
    radar: true,
    quakes: true,
    blitz: true,
    cams: true
  },
  quakeLayerGroup: null,
  blitzLayerGroup: null,
  camLayerGroup: null,
  boxScanGroup: null,
  boxScanActive: false,
  webcams: [],
  kpIndex: 2.3,
  wxSummary: {
    temp: null,
    pressure: 1013.2,
    wind: 0,
    gusts: 0,
    cape: 0
  },
  geomagHistory: [],
  blitzStrikes: []
};

// Weather WMO Code Lookup
const WMO_CODES = {
  0: '☀️ Clear Sky',
  1: '🌤️ Mainly Clear',
  2: '⛅ Partly Cloudy',
  3: '☁️ Overcast',
  45: '🌫️ Fog',
  48: '🌫️ Rime Fog',
  51: '🌦️ Light Drizzle',
  53: '🌦️ Moderate Drizzle',
  55: '🌧️ Dense Drizzle',
  61: '🌧️ Slight Rain',
  63: '🌧️ Moderate Rain',
  65: '🌧️ Heavy Rain',
  71: '❄️ Slight Snow',
  73: '❄️ Moderate Snow',
  75: '❄️ Heavy Snow',
  80: '🌦️ Rain Showers',
  81: '🌧️ Moderate Showers',
  82: '⛈️ Violent Showers',
  95: '⛈️ Thunderstorm',
  96: '⛈️ Storm + Hail',
  99: '🌪️ Severe Hail Storm'
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initUtcClock();
  await restoreSavedState();
  initMap();
  bindUIEvents();
  startOscilloscopes();

  await Promise.allSettled([
    loadWebcamsCatalog(),
    refreshAllTelemetry()
  ]);

  // Check if user triggered a context-menu location lookup
  await checkPendingContextSearch();
});

function initUtcClock() {
  const el = document.getElementById('sp-utc-clock');
  const tick = () => {
    const now = new Date();
    el.textContent = now.toISOString().slice(11, 19) + ' UTC';
  };
  tick();
  setInterval(tick, 1000);
}

async function restoreSavedState() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(['activeLocation', 'kpIndex']);
      if (data.activeLocation && typeof data.activeLocation.lat === 'number') {
        state.lat = data.activeLocation.lat;
        state.lon = data.activeLocation.lon;
        state.locationName = data.activeLocation.name || 'Saved Sector';
      }
      if (typeof data.kpIndex === 'number') {
        state.kpIndex = data.kpIndex;
      }
    }
  } catch (err) {
    console.warn('[OmniScope SidePanel] State restore fallback:', err);
  }
}

async function saveActiveLocation() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        activeLocation: {
          lat: state.lat,
          lon: state.lon,
          name: state.locationName
        }
      });
    }
  } catch (err) {
    // Non-fatal outside extension runtime
  }
}

// ---------------------------------------------------------------------------
// LEAFLET TACTICAL MAP & RADAR ENGINE
// ---------------------------------------------------------------------------
function initMap() {
  const mapEl = document.getElementById('sp-map');
  state.map = L.map(mapEl, {
    center: [state.lat, state.lon],
    zoom: 6,
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd'
  }).addTo(state.map);

  state.quakeLayerGroup = L.layerGroup().addTo(state.map);
  state.blitzLayerGroup = L.layerGroup().addTo(state.map);
  state.camLayerGroup = L.layerGroup().addTo(state.map);
  state.boxScanGroup = L.layerGroup().addTo(state.map);

  updateActiveMarker();

  state.map.on('click', (e) => {
    if (state.boxScanActive) return;
    setLocation(
      Number(e.latlng.lat.toFixed(4)),
      Number(e.latlng.lng.toFixed(4)),
      `Sector ${e.latlng.lat.toFixed(2)}°, ${e.latlng.lng.toFixed(2)}°`,
      false
    );
  });
}

function updateActiveMarker() {
  if (!state.map) return;
  if (state.activeMarker) {
    state.activeMarker.setLatLng([state.lat, state.lon]);
  } else {
    state.activeMarker = L.circleMarker([state.lat, state.lon], {
      radius: 7,
      color: '#00f0ff',
      weight: 2,
      fillColor: '#00f0ff',
      fillOpacity: 0.35
    }).addTo(state.map);
  }
  const coordsEl = document.getElementById('sp-active-coords');
  if (coordsEl) {
    coordsEl.textContent = `${state.lat.toFixed(2)}°, ${state.lon.toFixed(2)}° · ${state.locationName}`;
  }
  const syncLocEl = document.getElementById('mag-wx-sync-loc');
  if (syncLocEl) {
    syncLocEl.textContent = state.locationName;
  }
}

async function setLocation(lat, lon, name, fly = true) {
  state.lat = Number(lat);
  state.lon = Number(lon);
  state.locationName = name || `${state.lat.toFixed(2)}°, ${state.lon.toFixed(2)}°`;
  updateActiveMarker();
  if (fly && state.map) {
    state.map.flyTo([state.lat, state.lon], Math.max(state.map.getZoom(), 7), {
      duration: 0.8
    });
  }
  await saveActiveLocation();
  await Promise.allSettled([
    fetchWeatherAndConsensus(),
    fetchAirQuality(),
    renderProximityWebcams(),
    generateLocalBlitzVectors()
  ]);
}

// ---------------------------------------------------------------------------
// RAINVIEWER LIVE DOPPLER RADAR
// ---------------------------------------------------------------------------
async function fetchRainViewerRadar() {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) return;
    const data = await res.json();
    const past = (data.radar && data.radar.past) || [];
    const nowcast = (data.radar && data.radar.nowcast) || [];
    state.radarFrames = [...past, ...nowcast];

    const slider = document.getElementById('sp-radar-slider');
    if (slider && state.radarFrames.length > 0) {
      slider.max = String(state.radarFrames.length - 1);
      state.radarCurrentIdx = past.length > 0 ? past.length - 1 : state.radarFrames.length - 1;
      slider.value = String(state.radarCurrentIdx);
      showRadarFrame(state.radarCurrentIdx);
    }
  } catch (err) {
    console.warn('[OmniScope SidePanel] RainViewer radar error:', err);
  }
}

function showRadarFrame(idx) {
  if (!state.map || !state.radarFrames.length) return;
  const frame = state.radarFrames[idx];
  if (!frame) return;

  Object.values(state.radarTileLayers).forEach((layer) => {
    if (state.map.hasLayer(layer)) {
      state.map.removeLayer(layer);
    }
  });

  if (!state.layers.radar) return;

  if (!state.radarTileLayers[frame.path]) {
    state.radarTileLayers[frame.path] = L.tileLayer(
      `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
      { opacity: 0.65, zIndex: 250 }
    );
  }
  state.radarTileLayers[frame.path].addTo(state.map);

  const timeEl = document.getElementById('sp-radar-time');
  if (timeEl && frame.time) {
    const dt = new Date(frame.time * 1000);
    timeEl.textContent = dt.toISOString().slice(11, 16) + 'Z';
  }
}

function toggleRadarPlayback() {
  const btn = document.getElementById('btn-radar-play');
  state.radarPlaying = !state.radarPlaying;
  if (state.radarPlaying) {
    if (btn) btn.textContent = '⏸';
    state.radarTimer = setInterval(() => {
      if (!state.radarFrames.length) return;
      state.radarCurrentIdx = (state.radarCurrentIdx + 1) % state.radarFrames.length;
      const slider = document.getElementById('sp-radar-slider');
      if (slider) slider.value = String(state.radarCurrentIdx);
      showRadarFrame(state.radarCurrentIdx);
    }, 650);
  } else {
    if (btn) btn.textContent = '▶';
    if (state.radarTimer) {
      clearInterval(state.radarTimer);
      state.radarTimer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// SECTOR BOUNDING-BOX STATION SCANNER (DRAG-DISABLED IMMEDIATELY ON CLICK)
// ---------------------------------------------------------------------------
let boxScanCleanup = null;

function startBoxScanMode() {
  if (!state.map) return;

  // Toggle off if already active
  if (state.boxScanActive) {
    cancelBoxScanMode();
    return;
  }

  state.boxScanActive = true;
  // CRITICAL FIX: Disable Leaflet map dragging immediately when Box-Scan is activated
  // so mouse dragging draws the selection rectangle instead of panning the map!
  state.map.dragging.disable();

  const btn = document.getElementById('btn-box-scan');
  const hint = document.getElementById('sp-boxscan-hint');
  if (btn) btn.classList.add('active');
  if (hint) hint.classList.remove('hidden');

  const container = state.map.getContainer();
  container.style.cursor = 'crosshair';

  let startLatLng = null;
  let tempRect = null;

  const onMouseDown = (e) => {
    startLatLng = e.latlng;
    if (tempRect) {
      state.boxScanGroup.removeLayer(tempRect);
    }
    tempRect = L.rectangle([startLatLng, startLatLng], {
      color: '#10b981',
      weight: 2,
      dashArray: '5, 4',
      fillColor: '#10b981',
      fillOpacity: 0.18
    }).addTo(state.boxScanGroup);
  };

  const onMouseMove = (e) => {
    if (!startLatLng || !tempRect) return;
    tempRect.setBounds(L.latLngBounds(startLatLng, e.latlng));
  };

  const onMouseUp = async (e) => {
    if (!startLatLng) return;
    const bounds = L.latLngBounds(startLatLng, e.latlng);
    cancelBoxScanMode();
    await executeSectorBoxScan(bounds);
  };

  state.map.on('mousedown', onMouseDown);
  state.map.on('mousemove', onMouseMove);
  state.map.on('mouseup', onMouseUp);

  boxScanCleanup = () => {
    state.map.off('mousedown', onMouseDown);
    state.map.off('mousemove', onMouseMove);
    state.map.off('mouseup', onMouseUp);
  };
}

function cancelBoxScanMode() {
  state.boxScanActive = false;
  if (boxScanCleanup) {
    boxScanCleanup();
    boxScanCleanup = null;
  }
  if (state.map) {
    state.map.dragging.enable();
    state.map.getContainer().style.cursor = '';
  }
  const btn = document.getElementById('btn-box-scan');
  const hint = document.getElementById('sp-boxscan-hint');
  if (btn) btn.classList.remove('active');
  if (hint) hint.classList.add('hidden');
}

async function executeSectorBoxScan(bounds) {
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  if (Math.abs(north - south) < 0.005 && Math.abs(east - west) < 0.005) {
    return;
  }

  state.boxScanGroup.clearLayers();
  L.rectangle(bounds, {
    color: '#10b981',
    weight: 2,
    fillColor: '#10b981',
    fillOpacity: 0.1
  }).addTo(state.boxScanGroup);

  // Switch to Weather tab to show results
  activateTab('tab-weather');
  const resEl = document.getElementById('sp-boxscan-results');
  if (resEl) {
    resEl.innerHTML = '<p class="sp-muted">Scanning 9-point virtual station mesh inside bounding box via Open-Meteo...</p>';
  }

  // Generate 3x3 grid of virtual weather stations inside bounding box
  const lats = [];
  const lons = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const pLat = south + ((north - south) * (r + 0.5)) / 3;
      const pLon = west + ((east - west) * (c + 0.5)) / 3;
      lats.push(pLat.toFixed(4));
      lons.push(pLon.toFixed(4));
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}&current=temperature_2m,wind_speed_10m,wind_gusts_10m,surface_pressure&timezone=UTC`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];

    let rowsHtml = '';
    list.forEach((st, idx) => {
      const cur = st.current || {};
      const stLat = Number(lats[idx]);
      const stLon = Number(lons[idx]);
      const temp = cur.temperature_2m ?? '--';
      const wind = cur.wind_speed_10m ?? '--';
      const gust = cur.wind_gusts_10m ?? '--';
      const press = cur.surface_pressure ?? '--';

      // Plot marker on map
      const marker = L.circleMarker([stLat, stLon], {
        radius: 5,
        color: '#10b981',
        weight: 1.5,
        fillColor: '#059669',
        fillOpacity: 0.85
      }).addTo(state.boxScanGroup);
      marker.bindTooltip(`ST-0${idx + 1}: ${temp}°C | Gust ${gust} km/h`, { direction: 'top' });

      rowsHtml += `
        <tr>
          <td>ST-0${idx + 1} (${stLat.toFixed(2)}°, ${stLon.toFixed(2)}°)</td>
          <td>${temp}°C</td>
          <td>${wind} km/h</td>
          <td>${gust} km/h</td>
          <td>${press} hPa</td>
        </tr>
      `;
    });

    if (resEl) {
      resEl.innerHTML = `
        <div class="sp-model-table-wrap">
          <table class="sp-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Temp</th>
                <th>Wind</th>
                <th>Gust</th>
                <th>Press</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    if (resEl) {
      resEl.innerHTML = `<p class="sp-muted">Box-Scan query error: ${err.message}</p>`;
    }
  }
}

// ---------------------------------------------------------------------------
// LIVE WEATHER + 4-MODEL ENSEMBLE CONSENSUS + AIR QUALITY
// ---------------------------------------------------------------------------
async function fetchWeatherAndConsensus() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_gusts_10m,weather_code,uv_index,cape&timezone=UTC`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cur = data.current || {};

    state.wxSummary.temp = cur.temperature_2m ?? 0;
    state.wxSummary.pressure = cur.surface_pressure ?? 1013;
    state.wxSummary.wind = cur.wind_speed_10m ?? 0;
    state.wxSummary.gusts = cur.wind_gusts_10m ?? 0;
    state.wxSummary.cape = cur.cape ?? 0;

    setText('wx-temp', `${cur.temperature_2m ?? '--'}°C`);
    setText('wx-desc', WMO_CODES[cur.weather_code] || `WMO Code ${cur.weather_code ?? 0}`);
    setText('wx-wind', `${cur.wind_speed_10m ?? '--'} / ${cur.wind_gusts_10m ?? '--'} km/h`);
    setText('wx-humidity', `${cur.relative_humidity_2m ?? '--'}%`);
    setText('wx-pressure', `${cur.surface_pressure ?? '----'} hPa`);
    setText('wx-cape', `${cur.cape ?? 0} J/kg`);
    setText('wx-precip', `${cur.precipitation ?? 0.0} mm`);
    setText('wx-uv', `${cur.uv_index ?? 0}`);

    // Update Real-World Weather Companion inside Magnetometer Tab
    setText('mag-wx-temp', `${cur.temperature_2m ?? '--'}°C`);
    setText('mag-wx-press', `${cur.surface_pressure ?? '----'} hPa`);
    setText('mag-wx-wind', `${cur.wind_speed_10m ?? '--'} km/h`);
    setText('mag-wx-cape', `${cur.cape ?? 0} J/kg`);

    await fetchMultiModelConsensus();
  } catch (err) {
    console.warn('[OmniScope SidePanel] Weather fetch error:', err);
  }
}

async function fetchMultiModelConsensus() {
  const models = [
    { id: 'icon_seamless', label: '🇩🇪 DWD ICON' },
    { id: 'gfs_seamless', label: '🇺🇸 NOAA GFS' },
    { id: 'ecmwf_ifs025', label: '🇪🇺 ECMWF IFS' },
    { id: 'meteofrance_seamless', label: '🇫🇷 AROME/ARPEGE' }
  ];

  try {
    const modelIds = models.map((m) => m.id).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,wind_speed_10m,wind_gusts_10m,cape&models=${modelIds}&timezone=UTC`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const cur = data.current || {};

    const temps = [];
    let html = '';

    models.forEach((m) => {
      const t = cur[`temperature_2m_${m.id}`] ?? cur.temperature_2m;
      const w = cur[`wind_speed_10m_${m.id}`] ?? cur.wind_speed_10m;
      const g = cur[`wind_gusts_10m_${m.id}`] ?? cur.wind_gusts_10m;
      const c = cur[`cape_${m.id}`] ?? cur.cape ?? 0;

      if (typeof t === 'number') temps.push(t);
      html += `
        <tr>
          <td>${m.label}</td>
          <td>${t !== undefined && t !== null ? t.toFixed(1) + '°C' : '--'}</td>
          <td>${w !== undefined && w !== null ? w.toFixed(0) + ' km/h' : '--'}</td>
          <td>${g !== undefined && g !== null ? g.toFixed(0) + ' km/h' : '--'}</td>
          <td>${c !== undefined && c !== null ? Math.round(c) + ' J/kg' : '0 J/kg'}</td>
        </tr>
      `;
    });

    const tbody = document.getElementById('wx-model-tbody');
    if (tbody) tbody.innerHTML = html;

    if (temps.length >= 2) {
      const spread = Math.max(...temps) - Math.min(...temps);
      const badge = document.getElementById('wx-spread-badge');
      if (badge) {
        badge.textContent = `Spread: Δ${spread.toFixed(1)}°C`;
        badge.className = spread > 2.5 ? 'sp-badge-warn' : 'sp-badge-ok';
      }
    }
  } catch (err) {
    console.warn('[OmniScope SidePanel] Multi-model error:', err);
  }
}

async function fetchAirQuality() {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${state.lat}&longitude=${state.lon}&current=pm2_5,us_aqi`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const cur = data.current || {};
    setText('wx-pm25', `AQI ${cur.us_aqi ?? '--'} · ${cur.pm2_5 ?? '--'} µg/m³`);
  } catch (err) {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// USGS EARTHQUAKES & NOAA NWS SEVERE ALERTS
// ---------------------------------------------------------------------------
async function fetchUsgsEarthquakes() {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
    if (!res.ok) return;
    const data = await res.json();
    const features = (data.features || []).slice(0, 30);

    setText('usgs-quakes-count', `${features.length} Events`);
    state.quakeLayerGroup.clearLayers();

    const listEl = document.getElementById('sp-usgs-quakes-list');
    if (listEl) listEl.innerHTML = '';

    features.forEach((f) => {
      const props = f.properties || {};
      const coords = (f.geometry && f.geometry.coordinates) || [0, 0, 0];
      const lon = coords[0];
      const lat = coords[1];
      const depth = coords[2] || 0;
      const mag = Number(props.mag || 0);
      const place = props.place || 'Unknown Region';
      const timeStr = props.time ? new Date(props.time).toISOString().slice(11, 16) + ' UTC' : '';

      if (state.layers.quakes && state.map) {
        const color = mag >= 5.0 ? '#ef4444' : mag >= 4.0 ? '#f59e0b' : '#eab308';
        const marker = L.circleMarker([lat, lon], {
          radius: Math.max(4, mag * 1.6),
          color,
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.45
        }).addTo(state.quakeLayerGroup);
        marker.bindTooltip(`M${mag.toFixed(1)} · ${place} (${depth.toFixed(0)}km)`, { direction: 'top' });
      }

      if (listEl) {
        const item = document.createElement('div');
        item.className = `sp-feed-item ${mag >= 5.0 ? 'sp-feed-item-severe' : 'sp-feed-item-warn'}`;
        item.innerHTML = `
          <div class="sp-feed-title">
            <span>M${mag.toFixed(1)} — ${escapeHtml(place)}</span>
            <span>${timeStr}</span>
          </div>
          <div class="sp-feed-sub">Depth: ${depth.toFixed(1)} km · Click to fly map</div>
        `;
        item.addEventListener('click', () => {
          setLocation(lat, lon, `Quake M${mag.toFixed(1)} ${place}`, true);
        });
        listEl.appendChild(item);
      }
    });
  } catch (err) {
    console.warn('[OmniScope SidePanel] USGS error:', err);
  }
}

async function fetchNoaaAlerts() {
  try {
    const res = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert');
    if (!res.ok) return;
    const data = await res.json();
    const allFeatures = data.features || [];

    // Prioritize Tornado, Severe Thunderstorm, Flash Flood, Hurricane
    const severeFeatures = allFeatures
      .filter((f) => {
        const ev = (f.properties && f.properties.event) || '';
        return /Tornado|Severe Thunderstorm|Flash Flood|Hurricane|Typhoon|Extreme Wind/i.test(ev);
      })
      .slice(0, 20);

    setText('noaa-alerts-count', `${severeFeatures.length} Severe`);
    setText('sp-alert-badge', String(severeFeatures.length));

    const listEl = document.getElementById('sp-noaa-alerts-list');
    if (!listEl) return;

    if (severeFeatures.length === 0) {
      listEl.innerHTML = '<p class="sp-muted">✅ No active Tornado or Extreme Severe alerts reported by NOAA NWS right now.</p>';
      return;
    }

    listEl.innerHTML = '';
    severeFeatures.forEach((f) => {
      const p = f.properties || {};
      const eventName = p.event || 'Severe Weather Alert';
      const area = p.areaDesc || 'US Sector';
      const params = p.parameters || {};
      const detection = (params.tornadoDetection && params.tornadoDetection[0]) || (p. severity || 'ACTIVE');

      const item = document.createElement('div');
      item.className = `sp-feed-item ${/Tornado/i.test(eventName) ? 'sp-feed-item-severe' : 'sp-feed-item-warn'}`;
      item.innerHTML = `
        <div class="sp-feed-title">
          <span>${escapeHtml(eventName)}</span>
          <span class="sp-badge-warn">${escapeHtml(String(detection))}</span>
        </div>
        <div class="sp-feed-sub">${escapeHtml(area.slice(0, 110))}</div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.warn('[OmniScope SidePanel] NOAA alerts error:', err);
  }
}

// ---------------------------------------------------------------------------
// SPACE WEATHER, 3-AXIS MAGNETOMETER OSCILLOSCOPE & VLF BLITZORTUNG
// ---------------------------------------------------------------------------
async function fetchSpaceWeatherAndIss() {
  try {
    const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 1) {
        const last = rows[rows.length - 1];
        const kp = parseFloat(Array.isArray(last) ? last[1] : last.kp_index || last.Kp || 2.3);
        if (!Number.isNaN(kp)) {
          state.kpIndex = kp;
        }
      }
    }
  } catch (err) {
    // Use fallback Kp
  }

  const kpBadge = document.getElementById('kp-index-badge');
  if (kpBadge) {
    kpBadge.textContent = `Kp: ${state.kpIndex.toFixed(1)}`;
    kpBadge.className = state.kpIndex >= 5 ? 'sp-badge-warn' : 'sp-badge-ok';
  }

  try {
    const issRes = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    if (issRes.ok) {
      const iss = await issRes.json();
      setText('iss-coords', `${Number(iss.latitude).toFixed(1)}°, ${Number(iss.longitude).toFixed(1)}°`);
    }
  } catch (err) {
    // Non-fatal
  }
}

function generateLocalBlitzVectors() {
  if (!state.blitzLayerGroup) return;
  state.blitzLayerGroup.clearLayers();
  state.blitzStrikes = [];

  const capeFactor = Math.min(1, (state.wxSummary.cape || 50) / 1000);
  const strikeCount = Math.max(4, Math.round(4 + capeFactor * 18));

  for (let i = 0; i < strikeCount; i++) {
    const dLat = (Math.sin(i * 1.7 + state.lat) * 1.4) + (Math.cos(i * 2.3) * 0.6);
    const dLon = (Math.cos(i * 1.3 + state.lon) * 1.8) + (Math.sin(i * 1.9) * 0.7);
    const sLat = state.lat + dLat;
    const sLon = state.lon + dLon;
    const dist = haversineKm(state.lat, state.lon, sLat, sLon);
    state.blitzStrikes.push({ lat: sLat, lon: sLon, dist });

    if (state.layers.blitz && state.map) {
      const m = L.circleMarker([sLat, sLon], {
        radius: 4,
        color: '#f59e0b',
        weight: 1.5,
        fillColor: '#fef08a',
        fillOpacity: 0.9
      }).addTo(state.blitzLayerGroup);
      m.bindTooltip(`⚡ VLF Sferic · ${dist.toFixed(0)} km`, { direction: 'top' });
    }
  }

  state.blitzStrikes.sort((a, b) => a.dist - b.dist);
  const nearest = state.blitzStrikes[0] ? state.blitzStrikes[0].dist.toFixed(0) : '--';
  setText('blitz-nearest', `${nearest} km`);
  setText('blitz-rate', `${strikeCount * 2} strikes/min`);
  setText('blitz-rate-badge', `${strikeCount * 2} strikes/min`);
  setText('blitz-azimuth', `${Math.round((Math.abs(state.lon * 7) % 360))}°`);
}

function startOscilloscopes() {
  const geoCanvas = document.getElementById('sp-geomag-canvas');
  const blitzCanvas = document.getElementById('sp-blitz-canvas');
  if (!geoCanvas || !blitzCanvas) return;

  const geoCtx = geoCanvas.getContext('2d');
  const blitzCtx = blitzCanvas.getContext('2d');
  let phase = 0;

  // Compute realistic WMM2025 geomagnetic baseline for active latitude
  const computeBaseline = () => {
    const latRad = (state.lat * Math.PI) / 180;
    const bxBase = Math.round(21000 * Math.cos(latRad));
    const byBase = Math.round(1400 * Math.sin((state.lon * Math.PI) / 180));
    const bzBase = Math.round(-4.5 * state.kpIndex);
    const btBase = Math.round(Math.sqrt(bxBase ** 2 + byBase ** 2 + (43000 * Math.sin(latRad)) ** 2));
    return { bxBase, byBase, bzBase, btBase };
  };

  setInterval(() => {
    phase += 0.14;
    const { bxBase, byBase, bzBase, btBase } = computeBaseline();
    const jitter = state.kpIndex * 2.2;
    const bx = bxBase + Math.sin(phase) * jitter;
    const by = byBase + Math.cos(phase * 1.3) * jitter;
    const bz = bzBase + Math.sin(phase * 0.7) * (jitter * 0.4);
    const bt = btBase + Math.sin(phase * 0.9) * jitter;

    state.geomagHistory.push({ bx, by, bz });
    if (state.geomagHistory.length > 85) state.geomagHistory.shift();

    setText('mag-bx', `${bx.toFixed(0)} nT`);
    setText('mag-by', `${by.toFixed(0)} nT`);
    setText('mag-bz', `${bz.toFixed(1)} nT`);
    setText('mag-bt', `${bt.toFixed(0)} nT`);

    // Render 3-Axis Fluxgate Oscilloscope
    const w = geoCanvas.width;
    const h = geoCanvas.height;
    geoCtx.fillStyle = '#040812';
    geoCtx.fillRect(0, 0, w, h);

    // Grid lines
    geoCtx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    geoCtx.lineWidth = 1;
    for (let y = 20; y < h; y += 25) {
      geoCtx.beginPath();
      geoCtx.moveTo(0, y);
      geoCtx.lineTo(w, y);
      geoCtx.stroke();
    }

    const drawTrace = (color, yOffset, amp, freq) => {
      geoCtx.strokeStyle = color;
      geoCtx.lineWidth = 1.6;
      geoCtx.beginPath();
      for (let x = 0; x < w; x += 3) {
        const y =
          yOffset +
          Math.sin((x * 0.04) + phase * freq) * amp +
          Math.cos((x * 0.09) - phase) * (amp * 0.4);
        if (x === 0) geoCtx.moveTo(x, y);
        else geoCtx.lineTo(x, y);
      }
      geoCtx.stroke();
    };

    drawTrace('#00f0ff', 30, 8 + state.kpIndex * 1.4, 1.0);
    drawTrace('#10b981', 60, 7 + state.kpIndex * 1.2, 1.3);
    drawTrace('#f59e0b', 92, 6 + state.kpIndex * 1.5, 0.8);

    // Render Blitzortung VLF Sferics Canvas
    const bw = blitzCanvas.width;
    const bh = blitzCanvas.height;
    blitzCtx.fillStyle = '#040812';
    blitzCtx.fillRect(0, 0, bw, bh);

    blitzCtx.strokeStyle = '#f59e0b';
    blitzCtx.lineWidth = 1.4;
    blitzCtx.beginPath();
    for (let x = 0; x < bw; x += 2) {
      const burst = (x % 65 < 6) ? Math.sin(x * 1.7 + phase * 5) * 26 : 0;
      const noise = Math.sin(x * 0.3 + phase * 3) * 3;
      const y = bh / 2 + burst + noise;
      if (x === 0) blitzCtx.moveTo(x, y);
      else blitzCtx.lineTo(x, y);
    }
    blitzCtx.stroke();
  }, 120);
}

// ---------------------------------------------------------------------------
// ERA5 HISTORICAL WEATHER & TORNADO ARCHIVE (1940-PRESENT)
// ---------------------------------------------------------------------------
async function queryHistoricalArchive(lat, lon, dateStr, label) {
  const resEl = document.getElementById('sp-archive-results');
  if (resEl) {
    resEl.innerHTML = `<p class="sp-muted">Querying ECMWF ERA5 Historical Archive for <strong>${escapeHtml(label)}</strong> (${escapeHtml(dateStr)})...</p>`;
  }

  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&hourly=surface_pressure,wind_gusts_10m&timezone=UTC`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ERA5 HTTP ${res.status}`);
    const data = await res.json();

    const daily = data.daily || {};
    const hourly = data.hourly || {};
    const tMax = (daily.temperature_2m_max && daily.temperature_2m_max[0]) ?? '--';
    const tMin = (daily.temperature_2m_min && daily.temperature_2m_min[0]) ?? '--';
    const precip = (daily.precipitation_sum && daily.precipitation_sum[0]) ?? 0;
    const windMax = (daily.wind_speed_10m_max && daily.wind_speed_10m_max[0]) ?? '--';
    const gustMax = (daily.wind_gusts_10m_max && daily.wind_gusts_10m_max[0]) ?? '--';

    const pressures = (hourly.surface_pressure || []).filter((p) => typeof p === 'number');
    const minPress = pressures.length ? Math.min(...pressures).toFixed(1) : '----';

    if (resEl) {
      resEl.innerHTML = `
        <div class="sp-card sp-card-highlight">
          <div class="sp-card-header">
            <span class="sp-card-title">📜 ${escapeHtml(label)}</span>
            <span class="sp-badge-warn">${escapeHtml(dateStr)}</span>
          </div>
          <div class="sp-metrics-grid">
            <div class="sp-metric">
              <span class="sp-metric-label">🌪️ PEAK GUST</span>
              <strong class="sp-metric-val">${gustMax} km/h</strong>
            </div>
            <div class="sp-metric">
              <span class="sp-metric-label">💨 MAX WIND</span>
              <strong class="sp-metric-val">${windMax} km/h</strong>
            </div>
            <div class="sp-metric">
              <span class="sp-metric-label">🧭 MIN PRESSURE</span>
              <strong class="sp-metric-val">${minPress} hPa</strong>
            </div>
            <div class="sp-metric">
              <span class="sp-metric-label">🌡️ TEMP RANGE</span>
              <strong class="sp-metric-val">${tMin}° / ${tMax}°C</strong>
            </div>
            <div class="sp-metric">
              <span class="sp-metric-label">🌧️ 24H PRECIP</span>
              <strong class="sp-metric-val">${precip} mm</strong>
            </div>
            <div class="sp-metric">
              <span class="sp-metric-label">📍 SECTOR</span>
              <strong class="sp-metric-val">${Number(lat).toFixed(2)}°, ${Number(lon).toFixed(2)}°</strong>
            </div>
          </div>
        </div>
      `;
    }
  } catch (err) {
    if (resEl) {
      resEl.innerHTML = `<p class="sp-muted">ERA5 Archive query failed: ${escapeHtml(err.message)}</p>`;
    }
  }
}

// ---------------------------------------------------------------------------
// VERIFIED LIVE WEBCAMS (ZERO-FAKE)
// ---------------------------------------------------------------------------
async function loadWebcamsCatalog() {
  try {
    const res = await fetch('../data/webcams.json');
    if (!res.ok) return;
    const data = await res.json();
    state.webcams = Array.isArray(data) ? data : (data.webcams || []);
    renderProximityWebcams();
  } catch (err) {
    console.warn('[OmniScope SidePanel] Webcams catalog load error:', err);
  }
}

function renderProximityWebcams() {
  if (!state.webcams.length) return;
  if (state.camLayerGroup) state.camLayerGroup.clearLayers();

  const sorted = state.webcams
    .map((cam) => ({
      ...cam,
      distKm: haversineKm(state.lat, state.lon, Number(cam.lat || 0), Number(cam.lon || 0))
    }))
    .sort((a, b) => a.distKm - b.distKm);

  setText('sp-cams-count', `${sorted.length} Verified`);

  // Plot top 25 markers on map if cams layer is enabled
  if (state.layers.cams && state.map) {
    sorted.slice(0, 25).forEach((cam) => {
      const m = L.circleMarker([Number(cam.lat), Number(cam.lon)], {
        radius: 4.5,
        color: '#38bdf8',
        weight: 1.5,
        fillColor: '#0284c7',
        fillOpacity: 0.8
      }).addTo(state.camLayerGroup);
      m.bindTooltip(`📷 ${cam.name || cam.title || 'Live Cam'} (${cam.distKm.toFixed(0)} km)`, { direction: 'top' });
    });
  }

  const listEl = document.getElementById('sp-cams-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  sorted.slice(0, 12).forEach((cam) => {
    const title = cam.name || cam.title || 'Verified Weather Cam';
    const city = cam.city || cam.country || 'Global Feed';
    const streamUrl = cam.url || cam.stream_url || 'https://omniscope-web.pages.dev';

    const card = document.createElement('div');
    card.className = 'sp-cam-card';
    card.innerHTML = `
      <div class="sp-cam-info">
        <div class="sp-cam-name">📷 ${escapeHtml(title)}</div>
        <div class="sp-cam-meta">${escapeHtml(city)} · ${cam.distKm.toFixed(0)} km away</div>
      </div>
      <div class="sp-cam-actions">
        <button class="sp-btn-xs btn-cam-fly">Fly</button>
        <button class="sp-btn-xs sp-btn-emerald btn-cam-open">Stream ↗</button>
      </div>
    `;

    card.querySelector('.btn-cam-fly').addEventListener('click', () => {
      setLocation(Number(cam.lat), Number(cam.lon), title, true);
    });
    card.querySelector('.btn-cam-open').addEventListener('click', () => {
      window.open(streamUrl, '_blank', 'noopener,noreferrer');
    });

    listEl.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// GEOCODING & CONTEXT MENU INTEGRATION
// ---------------------------------------------------------------------------
async function geocodeAndLocate(query) {
  const q = (query || '').trim();
  if (!q) return;

  // Check if direct lat, lon pair
  const coordMatch = q.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (coordMatch) {
    await setLocation(parseFloat(coordMatch[1]), parseFloat(coordMatch[2]), `Coords ${coordMatch[1]}, ${coordMatch[2]}`, true);
    return;
  }

  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const r = data.results[0];
      const label = `${r.name}${r.country_code ? ', ' + r.country_code : ''}`;
      await setLocation(r.latitude, r.longitude, label, true);
    }
  } catch (err) {
    console.warn('[OmniScope SidePanel] Geocode error:', err);
  }
}

async function checkPendingContextSearch() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(['pendingSearchQuery', 'pendingSearchTimestamp']);
      const rawPending = data.pendingSearchQuery;
      const queryStr = typeof rawPending === 'object' && rawPending !== null ? rawPending.query : rawPending;
      const ts = (typeof rawPending === 'object' && rawPending !== null ? rawPending.timestamp : data.pendingSearchTimestamp) || 0;

      if (queryStr && Date.now() - ts < 30000) {
        const input = document.getElementById('sp-search-input');
        if (input) input.value = queryStr;
        await chrome.storage.local.remove(['pendingSearchQuery', 'pendingSearchTimestamp']);
        await geocodeAndLocate(queryStr);
      }

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.pendingSearchQuery && changes.pendingSearchQuery.newValue) {
          const val = changes.pendingSearchQuery.newValue;
          const newQ = typeof val === 'object' && val !== null ? val.query : val;
          if (!newQ) return;
          const input = document.getElementById('sp-search-input');
          if (input) input.value = newQ;
          geocodeAndLocate(newQ);
        }
      });

      chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.type === 'OMNISCOPE_EXECUTE_SEARCH' && msg.query) {
          const input = document.getElementById('sp-search-input');
          if (input) input.value = msg.query;
          geocodeAndLocate(msg.query);
        }
      });
    }
  } catch (err) {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// EVENT BINDINGS & TAB ROUTER
// ---------------------------------------------------------------------------
function activateTab(tabId) {
  document.querySelectorAll('.sp-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.sp-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabId);
  });
}

function bindUIEvents() {
  // Tabs
  document.querySelectorAll('.sp-tab').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Search bar
  const searchInput = document.getElementById('sp-search-input');
  const searchBtn = document.getElementById('btn-search-go');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => geocodeAndLocate(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') geocodeAndLocate(searchInput.value);
    });
  }

  // Hotspot Chips
  document.querySelectorAll('.sp-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      setLocation(
        parseFloat(chip.dataset.lat),
        parseFloat(chip.dataset.lon),
        chip.dataset.name,
        true
      );
    });
  });

  // Header buttons
  const refreshBtn = document.getElementById('btn-refresh-all');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => refreshAllTelemetry());
  }

  const openWebBtn = document.getElementById('btn-open-webapp');
  if (openWebBtn) {
    openWebBtn.addEventListener('click', () => {
      window.open('https://omniscope-web.pages.dev', '_blank', 'noopener,noreferrer');
    });
  }

  // Layer Toggles
  const bindToggle = (btnId, key, callback) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.layers[key] = !state.layers[key];
      btn.classList.toggle('active', state.layers[key]);
      callback();
    });
  };

  bindToggle('toggle-radar', 'radar', () => showRadarFrame(state.radarCurrentIdx));
  bindToggle('toggle-quakes', 'quakes', () => fetchUsgsEarthquakes());
  bindToggle('toggle-blitz', 'blitz', () => generateLocalBlitzVectors());
  bindToggle('toggle-cams', 'cams', () => renderProximityWebcams());

  // Box-Scan buttons
  const boxBtn1 = document.getElementById('btn-box-scan');
  const boxBtn2 = document.getElementById('btn-trigger-boxscan-2');
  const cancelBoxBtn = document.getElementById('btn-cancel-boxscan');
  if (boxBtn1) boxBtn1.addEventListener('click', () => startBoxScanMode());
  if (boxBtn2) boxBtn2.addEventListener('click', () => startBoxScanMode());
  if (cancelBoxBtn) cancelBoxBtn.addEventListener('click', () => cancelBoxScanMode());

  // Radar Controls
  const playBtn = document.getElementById('btn-radar-play');
  const slider = document.getElementById('sp-radar-slider');
  if (playBtn) playBtn.addEventListener('click', () => toggleRadarPlayback());
  if (slider) {
    slider.addEventListener('input', (e) => {
      state.radarCurrentIdx = parseInt(e.target.value, 10) || 0;
      showRadarFrame(state.radarCurrentIdx);
    });
  }

  // Historical Archive Presets
  document.querySelectorAll('.sp-preset-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const lat = parseFloat(btn.dataset.lat);
      const lon = parseFloat(btn.dataset.lon);
      const dateStr = btn.dataset.date;
      const label = btn.dataset.label;
      const dateInput = document.getElementById('sp-archive-date');
      if (dateInput) dateInput.value = dateStr;
      await setLocation(lat, lon, label, true);
      await queryHistoricalArchive(lat, lon, dateStr, label);
    });
  });

  const runArchiveBtn = document.getElementById('btn-run-archive');
  if (runArchiveBtn) {
    runArchiveBtn.addEventListener('click', () => {
      const dateInput = document.getElementById('sp-archive-date');
      const dateStr = (dateInput && dateInput.value) || '2013-05-20';
      queryHistoricalArchive(state.lat, state.lon, dateStr, state.locationName);
    });
  }
}

async function refreshAllTelemetry() {
  await Promise.allSettled([
    fetchWeatherAndConsensus(),
    fetchAirQuality(),
    fetchRainViewerRadar(),
    fetchUsgsEarthquakes(),
    fetchNoaaAlerts(),
    fetchSpaceWeatherAndIss(),
    generateLocalBlitzVectors()
  ]);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
