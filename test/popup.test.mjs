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
async function loadPopup(t, audit, url) {
  const elements = new Map();
  const element = (id) => elements.get(id);
  for (const id of ['popup-actions', 'popup-status', ...buttonIds]) {
    elements.set(id, {
      hidden: true, disabled: false, textContent: '', className: '',
      addEventListener(event, callback) { this[event] = callback; },
    });
  }
  const tab = {id: 42, active: true, url};
  const opened = [];
  const writes = [];
  const removals = [];
  let onUpdated;
  let onStorageChange;
  t.mock.method(globalThis, 'fetch', () => assert.fail('Popup attempted to generate a schedule'));
  globalThis.document = {querySelector: (selector) => element(selector.slice(1))};
  globalThis.chrome = {
    runtime: {getURL: (path) => `chrome-extension://test/${path}`},
    storage: {
      local: {
        get: async () => ({importedDars: audit}),
        set: async (value) => {
          writes.push(value);
          audit = value.importedDars;
          onStorageChange({importedDars: {newValue: audit}}, 'local');
        },
        remove: async (key) => {
          removals.push(key);
          audit = undefined;
          onStorageChange({importedDars: {}}, 'local');
        },
      },
      onChanged: {addListener(callback) { onStorageChange = callback; }},
    },
    scripting: {executeScript: async () => [{result: {audit: newAudit}}]},
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
  });
  await import(`../extension/popup.js?test=${popupInstance++}`);
  return {
    element, opened, writes, removals,
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
    if (buttons[0] === 'import-dars') {
      assert.equal(ui.element('import-dars').textContent,
          audit ? 'Reimport DARS and open planner' : 'Import DARS and open planner');
    } else {
      assert.equal(ui.element(buttons[0]).className, 'primary');
      await ui.element(buttons[0]).click();
      assert.deepEqual(ui.opened, [buttons[0] === 'open-dars' ? darsUrl : plannerUrl]);
    }
  });
}

test('the saved-audit shortcut on DARS opens the planner without reimporting', async (t) => {
  const ui = await loadPopup(t, existingAudit, darsUrl);
  const scrape = t.mock.method(chrome.scripting, 'executeScript');
  const planner = ui.element('open-planner');
  assert.equal(planner.textContent, 'Open planner with saved audit');
  await planner.click();
  assert.deepEqual(ui.opened, [plannerUrl]);
  assert.equal(scrape.mock.callCount(), 0);
  assert.deepEqual(ui.writes, []);

  await ui.navigate(otherUrl);
  assert.equal(planner.textContent, 'Open planner');
});

for (const previous of [null, existingAudit]) {
  test(`${previous ? 'reimport' : 'first import'} saves before opening the empty planner`, async (t) => {
    const ui = await loadPopup(t, previous, darsUrl);
    t.mock.method(chrome.tabs, 'create', async ({url}) => {
      assert.deepEqual(ui.writes, [{importedDars: newAudit}]);
      ui.opened.push(url);
    });
    await ui.element('import-dars').click();
    assert.deepEqual(ui.opened, [plannerUrl]);
    assert.equal(ui.element('import-dars').textContent, 'Reimport DARS and open planner');
  });
}

test('failed reimport keeps the saved audit, explains the error, and permits retry', async (t) => {
  const ui = await loadPopup(t, existingAudit, darsUrl);
  chrome.scripting.executeScript = async () => [{result: {error: 'Open a completed DARS audit.'}}];
  await ui.element('import-dars').click();
  assert.deepEqual(ui.writes, []);
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
  assert.deepEqual(ui.removals, ['importedDars']);
  assert.deepEqual(ui.visible(), ['open-dars']);
  assert.match(ui.element('popup-status').textContent, /audit deleted/);
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
