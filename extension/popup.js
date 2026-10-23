import { nextCount } from './counter.mjs';
import {groupSchedule} from './schedule.mjs';

let count = 0;
const button = document.querySelector('#count');

button.addEventListener('click', () => {
  count = nextCount(count);
  button.textContent = `Count: ${count}`;
});

/**
 * Opens a schedule tab, adapting class instances before transferring display data.
 * @param {!Array<!Object>} classes Recommended class instances.
 * @param {function(!Object): !Object=} adapter Maps a class to display fields.
 * @return {!Promise<!chrome.tabs.Tab>} The newly opened schedule tab.
 */
export function showSchedule(classes, adapter) {
  const data = encodeURIComponent(JSON.stringify(groupSchedule(classes, adapter)));
  return chrome.tabs.create({
    url: `${chrome.runtime.getURL('schedule.html')}#${data}`,
  });
}

const tabs = [...document.querySelectorAll('[role="tab"]')];

/**
 * Selects a tab and displays its associated panel.
 * @param {!HTMLButtonElement} selectedTab The tab to activate.
 */
function selectTab(selectedTab) {
  for (const tab of tabs) {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    let index = tabs.indexOf(tab);
    switch (event.key) {
      case 'ArrowRight':
        index = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        index = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        index = 0;
        break;
      case 'End':
        index = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectTab(tabs[index]);
    tabs[index].focus();
  });
}

document.querySelector('#generate-schedule').addEventListener(
    'click', () => showSchedule([]));

const DARS_URL = 'https://myplan.uw.edu/audit/#/degree';
const importButton = document.querySelector('#import-dars');
const darsHint = document.querySelector('#dars-hint');
let importing = false;

/**
 * Checks whether a URL belongs to the MyPlan audit section.
 * @param {string|undefined} value The tab URL to check.
 * @return {boolean} Whether the URL is an eligible audit page.
 */
function isAuditUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://myplan.uw.edu' &&
        url.pathname.startsWith('/audit/');
  } catch {
    return false;
  }
}

/**
 * Checks whether the active tab is a MyPlan audit page.
 * @return {!Promise<boolean>} Whether importing is allowed.
 */
async function updateImportAvailability() {
  importButton.disabled = true;
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const allowed = isAuditUrl(activeTab?.url) &&
        (!activeTab.pendingUrl || isAuditUrl(activeTab.pendingUrl));
    importButton.disabled = importing || !allowed;
    darsHint.textContent = allowed ?
        'Ready to preview importing your degree audit.' :
        'Open your DARS degree audit to enable Import.';
    return allowed;
  } catch {
    darsHint.textContent = 'Unable to check this page. Reopen AllenPlan on your DARS degree audit.';
    return false;
  }
}

/** Opens the DARS degree audit page in a new tab. */
function openDars() {
  chrome.tabs.create({url: DARS_URL});
}

/** Displays the placeholder import screen after verifying the active page. */
async function importDars() {
  if (importing || !await updateImportAvailability()) {
    return;
  }
  importing = true;
  importButton.disabled = true;
  document.querySelector('#dars-controls').hidden = true;
  const loading = document.querySelector('#dars-loading');
  loading.hidden = false;
  loading.focus();
}

document.querySelector('#open-dars').addEventListener('click', openDars);
importButton.addEventListener('click', importDars);
chrome.tabs.onUpdated.addListener(() => updateImportAvailability());
chrome.tabs.onActivated.addListener(() => updateImportAvailability());
updateImportAvailability();
