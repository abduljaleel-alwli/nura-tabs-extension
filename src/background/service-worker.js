// Keys
const SETTINGS_KEY = 'preEnableOnNewTabs';

// Named listener so we can add/remove it
async function tabsOnCreatedListener(tab) {
  try {
    if (!tab?.id) return;
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'src/sidepanel/sidepanel.html',
      enabled: true
    });
  } catch (e) {
    console.error(e);
  }
}

// Enable/disable the onCreated listener based on setting
async function applyTabsListenerFromSetting() {
  const { [SETTINGS_KEY]: enabled } = await chrome.storage.sync.get(SETTINGS_KEY);
  try {
    chrome.tabs.onCreated.removeListener(tabsOnCreatedListener);
  } catch (_) {}
  if (enabled) {
    chrome.tabs.onCreated.addListener(tabsOnCreatedListener);
  }
}

// Ensure behavior on action click opens the side panel (user gesture)
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // set default for the setting if not set
    const existing = await chrome.storage.sync.get(SETTINGS_KEY);
    if (existing[SETTINGS_KEY] === undefined) {
      await chrome.storage.sync.set({ [SETTINGS_KEY]: false });
    }

    await chrome.sidePanel.setOptions({ enabled: true });
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    chrome.notifications?.create('nura_open_panel', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/logo.png'),
      title: 'Nura is ready',
      message: 'Thanks for installing Nura.',
      buttons: [{ title: 'About us' }],
      requireInteraction: true
    });

    // apply initial listener state
    await applyTabsListenerFromSetting();
  } catch (e) {
    console.error(e);
  }
});

// React to setting changes live
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (SETTINGS_KEY in changes) {
    applyTabsListenerFromSetting().catch(console.error);
  }
});

// Open shamlltech.com when the notification button is clicked
chrome.notifications?.onButtonClicked.addListener((notifId, btnIdx) => {
  if (notifId !== 'nura_open_panel' || btnIdx !== 0) return;
  chrome.tabs.create({ url: 'https://www.shamlltech.com' });
  chrome.notifications.clear('nura_open_panel');
});

// Optional explicit click-to-open (also a user gesture)
chrome.action.onClicked.addListener(async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;

  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: 'src/sidepanel/sidepanel.html',
    enabled: true
  });
  await chrome.sidePanel.open({ tabId: tab.id });
});
