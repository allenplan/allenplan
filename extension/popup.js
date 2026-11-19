import {importDarsFromTab} from './dars-import.js';
import {isImportedDars} from './schedule.mjs';

const DARS_ROOT = 'https://myplan.uw.edu/audit/';
const PLANNER_URL = chrome.runtime.getURL('schedule.html');

const actions = document.querySelector('#popup-actions');
const importButton = document.querySelector('#import-dars');
const plannerButton = document.querySelector('#open-planner');
const darsButton = document.querySelector('#open-dars');
const deleteButton = document.querySelector('#delete-imported-data');
const status = document.querySelector('#popup-status');
let latestRead = 0;

/** Shows the actions available for the active tab and the saved audit. */
async function refreshActions() {
  const read = ++latestRead;
  try {
    const [saved, [tab]] = await Promise.all([
      chrome.storage.local.get('importedDars'),
      chrome.tabs.query({active: true, currentWindow: true}),
    ]);
    // A newer tab or storage event may have completed while this read was pending.
    if (read !== latestRead) return;
    const hasAudit = isImportedDars(saved.importedDars);
    const currentUrl = tab?.url || '';
    const nextUrl = tab?.pendingUrl || currentUrl;
    const onDars = currentUrl.startsWith(DARS_ROOT) && nextUrl.startsWith(DARS_ROOT);
    const onPlanner = nextUrl.split(/[?#]/, 1)[0] === PLANNER_URL;

    importButton.hidden = !onDars;
    importButton.textContent = hasAudit ? 'Reimport DARS and open planner' : 'Import DARS and open planner';
    plannerButton.hidden = !hasAudit || onPlanner;
    plannerButton.textContent = onDars ? 'Open planner with saved audit' : 'Open planner';
    plannerButton.className = onDars ? 'secondary' : 'primary';
    darsButton.hidden = onDars;
    darsButton.className = hasAudit && !onPlanner ? 'secondary' : 'primary';
    deleteButton.hidden = !hasAudit;
    actions.hidden = false;
  } catch {
    if (read !== latestRead) return;
    actions.hidden = true;
    status.textContent = 'Unable to read the active page or saved audit. Reopen AllenPlan to try again.';
  }
}

/** Opens the planner without generating a schedule. */
function openPlanner() {
  return chrome.tabs.create({url: PLANNER_URL});
}

/**
 * Disables the action group while an operation runs and reports errors in place.
 * @param {!HTMLButtonElement} button
 * @param {string} failureMessage
 * @param {function(): !Promise<*>} action
 */
function bindAction(button, failureMessage, action) {
  button.addEventListener('click', async () => {
    if (actions.hidden || actions.disabled || button.hidden) return;
    actions.disabled = true;
    status.textContent = '';
    try {
      await action();
    } catch (error) {
      status.textContent = `${failureMessage} ${error.message || 'Please try again.'}`;
    } finally {
      actions.disabled = false;
    }
  });
}

bindAction(importButton, 'Unable to import your degree audit.', async () => {
  const importedDars = await importDarsFromTab();
  await chrome.storage.local.set({importedDars});
  try {
    await openPlanner();
  } catch {
    status.textContent = 'Audit saved. Try opening the planner again.';
  }
});
bindAction(plannerButton, 'Unable to open the planner.', openPlanner);
bindAction(darsButton, 'Unable to open DARS.', () => chrome.tabs.create({url: DARS_ROOT + '#/degree'}));
bindAction(deleteButton, 'Unable to delete your degree audit.', async () => {
  await chrome.storage.local.remove('importedDars');
  status.textContent = 'Imported audit deleted.';
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.hasOwn(changes, 'importedDars')) refreshActions();
});
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (tab.active && (change.url || change.status)) refreshActions();
});
chrome.tabs.onActivated.addListener(refreshActions);
refreshActions();
