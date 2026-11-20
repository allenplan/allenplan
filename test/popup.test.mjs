import assert from 'node:assert/strict';
import test from 'node:test';

const darsUrl = 'https://myplan.uw.edu/audit/#/degree';
const plannerUrl = 'chrome-extension://test/schedule.html';
const otherUrl = 'https://example.org/';
const existingAudit = [['CSE 100'], ['CSE 200']];
const newAudit = [[{name: 'CSE 101'}], [{name: 'CSE 201'}]];
const buttonIds = ['import-dars', 'open-planner', 'open-dars', 'delete-imported-data'];
let popupInstance = 0;

/** Opens a popup with a mock active tab and local storage. */
async function loadPopup(t, audit, url, {major = 'Computer Science', info} = {}) {
  const elements = new Map();
  const element = (id) => elements.get(id);
  for (const id of ['popup-actions', 'popup-status', 'audit-major', 'saved-audit', 'open-help', ...buttonIds]) {
    elements.set(id, {
      hidden: true, disabled: false, textContent: id === 'open-planner' ? 'Open planner' : '', className: '',
      addEventListener(event, callback) { this[event] = callback; },
    });
  }
  const tab = {id: 42, active: true, url};
  const opened = [];
  const writes = [];
  const removals = [];
  let onUpdated;
  let onStorageChange;
  let nextMajorCheck;
  globalThis.window = {
    setTimeout(callback) { nextMajorCheck = callback; return 1; },
    clearTimeout() { nextMajorCheck = null; },
  };
  t.mock.method(globalThis, 'fetch', () => assert.fail('Popup attempted to generate a schedule'));
  globalThis.document = {querySelector: (selector) => element(selector.slice(1))};
  globalThis.chrome = {
    runtime: {getURL: (path) => `chrome-extension://test/${path}`},
    storage: {
      local: {
        get: async () => ({importedDars: audit, importedDarsInfo: info}),
        set: async (value) => {
          writes.push(value);
          audit = value.importedDars;
          info = value.importedDarsInfo;
          onStorageChange({importedDars: {newValue: audit}}, 'local');
        },
        remove: async (key) => {
          removals.push(key);
          audit = undefined;
          info = undefined;
          onStorageChange({importedDars: {}}, 'local');
        },
      },
      onChanged: {addListener(callback) { onStorageChange = callback; }},
    },
    scripting: {executeScript: async ({args}) => {
      if (!major) return [{result: {error: 'Open a supported audit in DARS.'}}];
      return [{result: args[2] ? {major, audit: newAudit} : {major}}];
    }},
    tabs: {
      query: async () => [tab],
      create: async ({url}) => { opened.push(url); },
      onUpdated: {addListener(callback) { onUpdated = callback; }},
      onActivated: {addListener() {}},
    },
  };
  t.after(() => {
    delete globalThis.document;
    delete globalThis.chrome;
    delete globalThis.window;
  });
  await import(`../extension/popup.js?test=${popupInstance++}`);
  await new Promise((resolve) => setImmediate(resolve));
  return {
    element, opened, writes, removals,
    async changeDegree(value) {
      major = value;
      await nextMajorCheck();
    },
    visible: () => element('popup-actions').hidden ? [] : buttonIds.filter((id) => !element(id).hidden),
    async navigate(url, pendingUrl) {
      Object.assign(tab, {url, pendingUrl});
      onUpdated(tab.id, {status: 'loading'}, tab);
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

const cases = [
  ['no audit on DARS', null, darsUrl, ['import-dars']],
  ['no audit elsewhere', null, otherUrl, ['open-dars']],
  ['no audit on the planner', null, plannerUrl, ['open-dars']],
  ['saved audit on DARS', existingAudit, darsUrl, ['import-dars', 'open-planner', 'delete-imported-data']],
  ['saved audit on a planner result', existingAudit, plannerUrl + '#result', ['open-dars', 'delete-imported-data']],
  ['saved audit elsewhere', existingAudit, otherUrl, ['open-planner', 'open-dars', 'delete-imported-data']],
];

for (const [name, audit, url, buttons] of cases) {
  test(name, async (t) => {
    const ui = await loadPopup(t, audit, url);
    assert.deepEqual(ui.visible(), buttons);
    assert.equal(ui.element('open-help').hidden, false);
    if (buttons[0] === 'import-dars') {
      assert.equal(ui.element('import-dars').textContent,
          audit ? 'Reimport DARS' : 'Import DARS');
      assert.equal(ui.element('import-dars').disabled, false);
      assert.equal(ui.element('audit-major').textContent, 'Computer Science audit · Opens planner');
    } else {
      assert.equal(ui.element(buttons[0]).className, 'primary');
      await ui.element(buttons[0]).click();
      assert.deepEqual(ui.opened, [buttons[0] === 'open-dars' ? darsUrl : plannerUrl]);
    }
  });
}

test('Help is hidden on the Help page and available again after navigation', async (t) => {
  const ui = await loadPopup(t, existingAudit, 'chrome-extension://test/help.html#planner');
  assert.equal(ui.element('open-help').hidden, true);
  assert.deepEqual(ui.visible(), ['open-planner', 'open-dars', 'delete-imported-data']);
  await ui.navigate(otherUrl);
  assert.equal(ui.element('open-help').hidden, false);
});

test('the saved-audit shortcut on DARS opens the planner without reimporting', async (t) => {
  const ui = await loadPopup(t, existingAudit, darsUrl);
  const scrape = t.mock.method(chrome.scripting, 'executeScript');
  const planner = ui.element('open-planner');
  assert.equal(planner.textContent, 'Open planner');
  await planner.click();
  assert.deepEqual(ui.opened, [plannerUrl]);
  assert.equal(scrape.mock.callCount(), 0);
  assert.deepEqual(ui.writes, []);

  await ui.navigate(otherUrl);
  assert.equal(planner.textContent, 'Open planner');
});

test('reimport saves the audit and focuses an existing planner in another window', async (t) => {
  const ui = await loadPopup(t, existingAudit, darsUrl);
  const activeTabQuery = chrome.tabs.query;
  chrome.tabs.query = async (query) => query.active ? activeTabQuery(query) : [
    {id: 17}, {id: 18, url: plannerUrl + '#generated', windowId: 9},
  ];
  chrome.tabs.update = async (id, properties) => {
    assert.equal(ui.writes.length, 1);
    assert.equal(id, 18);
    assert.deepEqual(properties, {active: true});
    return {id, windowId: 9};
  };
  const focused = [];
  chrome.windows = {update: async (id, properties) => { focused.push([id, properties]); }};
  await ui.element('import-dars').click();
  assert.deepEqual(focused, [[9, {focused: true}]]);
  assert.deepEqual(ui.opened, []);
});

for (const previous of [null, existingAudit]) {
  test(`${previous ? 'reimport' : 'first import'} saves before opening the empty planner`, async (t) => {
    const ui = await loadPopup(t, previous, darsUrl);
    t.mock.method(chrome.tabs, 'create', async ({url}) => {
      assert.equal(ui.writes.length, 1);
      const [{importedDars, importedDarsInfo}] = ui.writes;
      assert.deepEqual(importedDars, newAudit);
      assert.equal(importedDarsInfo.major, 'Computer Science');
      assert.equal(new Date(importedDarsInfo.importedAt).toISOString(), importedDarsInfo.importedAt);
      ui.opened.push(url);
    });
    await ui.element('import-dars').click();
    assert.deepEqual(ui.opened, [plannerUrl]);
    assert.equal(ui.element('import-dars').textContent, 'Reimport DARS');
  });
}

test('failed reimport keeps the saved audit and its details and permits retry', async (t) => {
  const importedAt = '2026-11-19T12:00:00.000Z';
  const info = {major: 'Computer Engineering', importedAt};
  const ui = await loadPopup(t, existingAudit, darsUrl, {info});
  chrome.scripting.executeScript = async () => [{result: {error: 'Open a completed DARS audit.'}}];
  await ui.element('import-dars').click();
  assert.deepEqual(ui.writes, []);
  const date = new Date(importedAt).toLocaleDateString(undefined, {dateStyle: 'medium'});
  assert.equal(ui.element('saved-audit').textContent, `Saved audit · Computer Engineering · ${date}`);
  assert.deepEqual(ui.opened, []);
  assert.deepEqual(ui.visible(), ['import-dars', 'open-planner', 'delete-imported-data']);
  assert.match(ui.element('popup-status').textContent, /Open a completed DARS audit/);
  assert.equal(ui.element('popup-actions').disabled, false);
});

test('tab creation failure after import offers the planner without reimporting', async (t) => {
  const ui = await loadPopup(t, null, darsUrl);
  const create = chrome.tabs.create;
  chrome.tabs.create = async () => { throw new Error('Tab unavailable'); };
  await ui.element('import-dars').click();
  assert.match(ui.element('popup-status').textContent, /Audit saved/);
  assert.ok(ui.visible().includes('open-planner'));
  chrome.tabs.create = create;
  await ui.element('open-planner').click();
  assert.deepEqual(ui.opened, [plannerUrl]);
  assert.equal(ui.writes.length, 1);
});

test('deletion permits retry on failure and updates the popup on success', async (t) => {
  const ui = await loadPopup(t, existingAudit, plannerUrl);
  const remove = chrome.storage.local.remove;
  chrome.storage.local.remove = async () => { throw new Error('Storage unavailable'); };
  await ui.element('delete-imported-data').click();
  assert.match(ui.element('popup-status').textContent, /Unable to delete/);
  assert.ok(ui.visible().includes('delete-imported-data'));
  chrome.storage.local.remove = remove;
  await ui.element('delete-imported-data').click();
  assert.deepEqual(ui.removals, [['importedDars', 'importedDarsInfo']]);
  assert.equal(ui.element('saved-audit').hidden, true);
  assert.deepEqual(ui.visible(), ['open-dars']);
  assert.match(ui.element('popup-status').textContent, /audit deleted/);
});

test('an ineligible audit blocks only import and the heading updates on the same page', async (t) => {
  const ui = await loadPopup(t, existingAudit, darsUrl, {major: null});
  const button = ui.element('import-dars');
  assert.equal(button.disabled, true);
  assert.match(ui.element('audit-major').textContent, /Open a supported audit/);
  assert.equal(ui.element('saved-audit').textContent, 'Previously imported audit');
  await button.click();
  assert.deepEqual(ui.writes, []);
  await ui.element('open-planner').click();
  assert.deepEqual(ui.opened, [plannerUrl]);

  await ui.changeDegree('Computer Science: Data Science');
  assert.equal(button.disabled, false);
  assert.match(ui.element('audit-major').textContent, /Computer Science: Data Science audit/);
  await button.click();
  assert.equal(ui.writes[0].importedDarsInfo.major, 'Computer Science: Data Science');
});

test('navigation away from DARS removes the import action', async (t) => {
  const ui = await loadPopup(t, null, darsUrl);
  await ui.navigate(darsUrl, otherUrl);
  assert.deepEqual(ui.visible(), ['open-dars']);
  await ui.element('import-dars').click();
  assert.deepEqual(ui.writes, []);
  await ui.navigate(darsUrl);
  assert.deepEqual(ui.visible(), ['import-dars']);
});
