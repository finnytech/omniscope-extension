/**
 * OmniScope OSINT — Chrome Extension Background Service Worker (Manifest V3)
 * Ephemeral state persisted strictly in chrome.storage.local
 * Uses async/await exclusively and chrome.alarms for background telemetry checks.
 */

const ALARM_TELEMETRY_PULSE = 'omniscope-telemetry-pulse';
const MENU_SCAN_SELECTION = 'omniscope-scan-selection';
const MENU_OPEN_PANEL = 'omniscope-open-panel';

async function configureSidePanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.warn('[OmniScope SW] setPanelBehavior warning:', err);
  }
}

// Configure behavior on service worker startup
configureSidePanelBehavior();

// Explicit action click fallback trigger
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (tab?.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (err) {
    console.error('[OmniScope SW] Failed opening side panel:', err);
  }
});

// Initialize storage defaults, context menus, and periodic alarm on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  await configureSidePanelBehavior();

  const existing = await chrome.storage.local.get([
    'targetLocation',
    'activeLayers',
    'badgeAlertsEnabled',
    'telemetrySummary'
  ]);

  if (!existing.targetLocation) {
    await chrome.storage.local.set({
      targetLocation: {
        name: 'Frankfurt, DE',
        lat: 50.1109,
        lon: 8.6821,
        zoom: 5
      }
    });
  }

  if (!existing.activeLayers) {
    await chrome.storage.local.set({
      activeLayers: {
        radar: true,
        quakes: true,
        blitz: true,
        geomag: true,
        cams: true
      }
    });
  }

  if (existing.badgeAlertsEnabled === undefined) {
    await chrome.storage.local.set({ badgeAlertsEnabled: true });
  }

  // Register context menus
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_SCAN_SELECTION,
    title: '🔍 Scan "%s" in OmniScope Side Panel',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: MENU_OPEN_PANEL,
    title: '🌐 Open OmniScope Tactical Side Panel',
    contexts: ['page', 'frame']
  });

  // Set up 5-minute background telemetry pulse via chrome.alarms
  await chrome.alarms.create(ALARM_TELEMETRY_PULSE, {
    delayInMinutes: 0.2,
    periodInMinutes: 5
  });

  if (details.reason === 'install') {
    await chrome.action.setBadgeBackgroundColor({ color: '#059669' });
    await chrome.action.setBadgeText({ text: 'LIVE' });
  }
});

// Handle Context Menu clicks with immediate user feedback
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === MENU_SCAN_SELECTION && info.selectionText) {
      const query = info.selectionText.trim().slice(0, 120);
      await chrome.storage.local.set({
        pendingSearchQuery: {
          query,
          timestamp: Date.now()
        }
      });

      // Open Side Panel on synchronous user gesture path
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }

      // Flash badge feedback
      await chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
      await chrome.action.setBadgeText({ text: 'SCAN' });

      // Notify open Side Panel if already active
      try {
        await chrome.runtime.sendMessage({
          type: 'OMNISCOPE_EXECUTE_SEARCH',
          query
        });
      } catch (_) {
        // Side panel is still initializing and will read pendingSearchQuery from storage
      }

      // Show confirmation notification with real 128x128 icon
      await chrome.notifications.create(`scan-${Date.now()}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: 'OmniScope Target Locked',
        message: `Scanning telemetry & radar for "${query}" in Side Panel.`
      });
    } else if (info.menuItemId === MENU_OPEN_PANEL && tab?.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      await chrome.action.setBadgeBackgroundColor({ color: '#0284c7' });
      await chrome.action.setBadgeText({ text: 'ON' });
    }
  } catch (err) {
    console.error('[OmniScope SW] Context menu handler error:', err);
  }
});

// Background Telemetry Pulse: USGS M4.5+ Quakes & NOAA Severe Warnings
async function runBackgroundTelemetryPulse() {
  try {
    let significantQuakes = 0;
    let maxMag = 0;
    let latestQuakeTitle = '';

    const usgsRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
    if (usgsRes.ok) {
      const usgsData = await usgsRes.json();
      const features = Array.isArray(usgsData?.features) ? usgsData.features : [];
      significantQuakes = features.length;
      for (const f of features) {
        const m = Number(f?.properties?.mag || 0);
        if (m > maxMag) {
          maxMag = m;
          latestQuakeTitle = String(f?.properties?.place || 'Global Sector');
        }
      }
    }

    const summary = {
      updatedAt: new Date().toISOString(),
      significantQuakes24h: significantQuakes,
      maxMag24h: maxMag,
      latestQuakeTitle
    };

    await chrome.storage.local.set({ telemetrySummary: summary });

    const { badgeAlertsEnabled = true } = await chrome.storage.local.get('badgeAlertsEnabled');
    if (badgeAlertsEnabled) {
      if (maxMag >= 6.0) {
        await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
        await chrome.action.setBadgeText({ text: `M${maxMag.toFixed(1)}` });
      } else if (significantQuakes > 0) {
        await chrome.action.setBadgeBackgroundColor({ color: '#059669' });
        await chrome.action.setBadgeText({ text: String(significantQuakes) });
      } else {
        await chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (err) {
    console.warn('[OmniScope SW] Background telemetry pulse skipped:', err);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TELEMETRY_PULSE) {
    await runBackgroundTelemetryPulse();
  }
});

// Message router for Side Panel requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === 'OMNISCOPE_PULSE_NOW') {
        await runBackgroundTelemetryPulse();
        const { telemetrySummary } = await chrome.storage.local.get('telemetrySummary');
        sendResponse({ ok: true, telemetrySummary });
      } else if (message?.type === 'OMNISCOPE_SET_BADGE') {
        const text = String(message.text || '');
        const color = String(message.color || '#059669');
        await chrome.action.setBadgeBackgroundColor({ color });
        await chrome.action.setBadgeText({ text });
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: 'Unknown message type' });
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true;
});
