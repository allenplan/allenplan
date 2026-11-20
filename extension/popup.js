import {DARS_ROOT, getDarsMajor, importDarsFromTab, isDarsTab} from './dars-import.js';
import {isImportedDars} from './schedule.mjs';

const PLANNER_URL = chrome.runtime.getURL('schedule.html');

const actions = document.querySelector('#popup-actions');
const importButton = document.querySelector('#import-dars');
const plannerButton = document.querySelector('#open-planner');
const darsButton = document.querySelector('#open-dars');
const deleteButton = document.querySelector('#delete-imported-data');
const status = document.querySelector('#popup-status');
const majorHint = document.querySelector('#audit-major');
const savedAudit = document.querySelector('#saved-audit');
let latestRead = 0;
let checkedMajor = null;
let majorTimer;

/** Checks the degree heading while the popup is open, including changes within MyPlan's audit page. */
async function refreshMajor(tabId, read) {
  let major = null;
  let hint;
  try {
    major = await getDarsMajor(tabId);
    hint = `${major} audit · Opens planner`;
  } catch (error) {
    hint = error.message;
  }
  if (read !== latestRead) return;
  checkedMajor = major;
  importButton.disabled = !major;
  if (majorHint.textContent !== hint) majorHint.textContent = hint;
  majorHint.hidden = false;
  majorTimer = window.setTimeout(() => refreshMajor(tabId, read), 1500);
}

/** Describes the saved audit, including audits imported before metadata was recorded. */
function savedAuditLabel(info) {
  const importedAt = new Date(info?.importedAt);
  if (!info?.major || Number.isNaN(importedAt.getTime())) return 'Previously imported audit';
  return `Saved audit · ${info.major} · ${importedAt.toLocaleDateString(undefined, {dateStyle: 'medium'})}`;
}

/** Shows the actions available for the active tab and the saved audit. */
async function refreshActions() {
  const read = ++latestRead;
  window.clearTimeout(majorTimer);
  importButton.disabled = true;
  checkedMajor = null;
  try {
    const [saved, [tab]] = await Promise.all([
      chrome.storage.local.get(['importedDars', 'importedDarsInfo']),
      chrome.tabs.query({active: true, currentWindow: true}),
    ]);
    // A newer tab or storage event may have completed while this read was pending.
    if (read !== latestRead) return;
    const hasAudit = isImportedDars(saved.importedDars);
    const currentUrl = tab?.url || '';
    const nextUrl = tab?.pendingUrl || currentUrl;
    const onDars = isDarsTab(tab);
    const onPlanner = isPlannerUrl(nextUrl);

    importButton.hidden = !onDars;
    importButton.textContent = hasAudit ? 'Reimport DARS' : 'Import DARS';
    plannerButton.hidden = !hasAudit || onPlanner;
    plannerButton.className = onDars ? 'secondary' : 'primary';
    darsButton.hidden = onDars;
    darsButton.className = hasAudit && !onPlanner ? 'secondary' : 'primary';
    deleteButton.hidden = !hasAudit;
    savedAudit.hidden = !hasAudit;
    savedAudit.textContent = hasAudit ? savedAuditLabel(saved.importedDarsInfo) : '';
    majorHint.hidden = !onDars;
    actions.hidden = false;
    if (onDars) await refreshMajor(tab.id, read);
  } catch {
    if (read !== latestRead) return;
    actions.hidden = true;
    status.textContent = 'Unable to read the active page or saved audit. Reopen AllenPlan to try again.';
  }
}

/** Matches the planner even when the URL includes a generated schedule. */
function isPlannerUrl(url) {
  return url?.split(/[?#]/, 1)[0] === PLANNER_URL;
}

/** Activates an open planner tab or opens a new one. */
async function openPlanner() {
  const tabs = await chrome.tabs.query({});
  const planner = tabs.find((tab) => isPlannerUrl(tab.pendingUrl ?? tab.url));
  if (planner) {
    let activated;
    try {
      activated = await chrome.tabs.update(planner.id, {active: true});
    } catch (error) {
      // The tab may have closed since the query. Surface other activation failures.
      if ((await chrome.tabs.query({})).some((tab) => tab.id === planner.id)) throw error;
    }
    if (activated) return chrome.windows.update(activated.windowId, {focused: true});
  }
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
    if (actions.hidden || actions.disabled || button.hidden || button.disabled) return;
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
  const {audit, major} = await importDarsFromTab(checkedMajor);
  await chrome.storage.local.set({
    importedDars: audit,
    importedDarsInfo: {major, importedAt: new Date().toISOString()},
  });
  try {
    await openPlanner();
  } catch {
    status.textContent = 'Audit saved. Try opening the planner again.';
  }
});
bindAction(plannerButton, 'Unable to open the planner.', openPlanner);
bindAction(darsButton, 'Unable to open DARS.', () => chrome.tabs.create({url: DARS_ROOT + '#/degree'}));
bindAction(deleteButton, 'Unable to delete your degree audit.', async () => {
  await chrome.storage.local.remove(['importedDars', 'importedDarsInfo']);
  status.textContent = 'Imported audit deleted.';
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (Object.hasOwn(changes, 'importedDars') ||
      Object.hasOwn(changes, 'importedDarsInfo'))) refreshActions();
});
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (tab.active && (change.url || change.status)) refreshActions();
});
chrome.tabs.onActivated.addListener(refreshActions);
refreshActions();
