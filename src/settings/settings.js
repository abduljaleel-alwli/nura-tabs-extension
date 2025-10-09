const SETTINGS_KEY = 'preEnableOnNewTabs';

const toggle = document.getElementById('preEnableToggle');
const toast = document.getElementById('toast');
const openSidePanelBtn = document.getElementById('openSidePanel');

// Toast notification helper
function showToast(msg = 'Saved', ms = 1200) {
  toast.textContent = msg;
  toast.hidden = false;
  void toast.offsetWidth; // restart CSS transition
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => (toast.hidden = true), 250);
  }, ms);
}

// Load the current setting from storage
async function init() {
  const obj = await chrome.storage.sync.get(SETTINGS_KEY);
  toggle.checked = Boolean(obj[SETTINGS_KEY]);
}

// Save setting change
toggle.addEventListener('change', async () => {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: toggle.checked });
  showToast(toggle.checked ? 'Enabled' : 'Disabled');
});

// Open the side panel for the current tab
openSidePanelBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;

  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: 'src/sidepanel/sidepanel.html',
    enabled: true,
  });
  await chrome.sidePanel.open({ tabId: tab.id });
});

document.addEventListener('DOMContentLoaded', init);
