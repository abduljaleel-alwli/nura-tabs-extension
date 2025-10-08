// Enable "open on action click" so clicking the extension icon opens the panel
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setOptions({ enabled: true });
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    // Optional: show a notification with a button to open the panel (counts as a user gesture)
    if (chrome.notifications) {
      chrome.notifications.create('nura_open_panel', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/logo.png'),
        title: 'Nura is ready',
        message: 'Thanks for installing Nura.',
        buttons: [{ title: 'About us' }],
        requireInteraction: true
      });
    }
  } catch (e) {
    console.error(e);
  }
});

// Open shamlltech.com when the notification button is clicked
chrome.notifications?.onButtonClicked.addListener((notifId, btnIdx) => {
  if (notifId !== 'nura_open_panel' || btnIdx !== 0) return;
  chrome.tabs.create({ url: 'https://www.shamlltech.com' });
  chrome.notifications.clear('nura_open_panel');
});


// Fallback: if you still want explicit click-to-open via code (also a user gesture)
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

// Pre-enable panel on new tabs (no auto-open; just ensures it's enabled)
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    if (tab.id) {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'src/sidepanel/sidepanel.html',
        enabled: true
      });
    }
  } catch (e) {
    console.error(e);
  }
});
