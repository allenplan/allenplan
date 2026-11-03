import assert from 'node:assert/strict';
import test from 'node:test';

const catalog = [{
  code: 'CSE 200', title: 'Next course', credits_min: 4, credits_max: 4,
  prerequisite_courses: [['CSE 100']],
}];
let popupInstance = 0;

/**
 * Loads the real popup module with minimal DOM and extension API substitutes.
 * @param {!Object} t Test context used to restore globals.
 * @param {*} audit Saved DARS result or a promise resolving to it.
 * @return {!Promise<!Object>} Controls and observed API calls.
 */
async function loadPopup(t, audit) {
  const originals = new Map(['document', 'chrome', 'fetch']
      .map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  });
  const elements = new Map();
  const element = (selector) => {
    if (!elements.has(selector)) {
      elements.set(selector, {
        disabled: true, hidden: false, textContent: '', listeners: {},
        addEventListener(event, callback) { this.listeners[event] = callback; },
        focus() {},
      });
    }
    return elements.get(selector);
  };
  const opened = [];
  const stored = [];
  const fetched = [];
  const executions = [];
  globalThis.document = {querySelector: element, querySelectorAll: () => []};
  globalThis.chrome = {
    runtime: {getURL: (path) => `chrome-extension://test/${path}`},
    storage: {local: {
      get: async () => ({importedDars: await audit}),
      set: async (value) => { stored.push(value); },
    }},
    scripting: {executeScript: async (options) => {
      executions.push(options);
      return [{result: {audit: [[{name: 'CSE 100'}], [{name: 'CSE 200'}]]}}];
    }},
    tabs: {
      query: async () => [{id: 42, url: 'https://myplan.uw.edu/audit/#/degree'}],
      create: async (options) => { opened.push(options); },
      onUpdated: {addListener() {}},
      onActivated: {addListener() {}},
    },
  };
  globalThis.fetch = async (url) => {
    fetched.push(url);
    return {ok: true, json: async () => catalog};
  };
  await import(`../extension/popup.js?test=${popupInstance++}`);
  await new Promise((resolve) => setImmediate(resolve));
  return {element, opened, stored, fetched, executions};
}

test('missing audit disables generation and prevents catalog/tab requests', async (t) => {
  const ui = await loadPopup(t, null);
  assert.equal(ui.element('#generate-schedule').disabled, true);
  await ui.element('#generate-schedule').listeners.click();
  assert.deepEqual(ui.opened, []);
  assert.deepEqual(ui.fetched, []);
});

test('waits for restoration and sends calculated courses to schedule.html', async (t) => {
  let restore;
  const pending = new Promise((resolve) => { restore = resolve; });
  const ui = await loadPopup(t, pending);
  assert.equal(ui.element('#generate-schedule').disabled, true);
  restore([[{name: 'CSE 100'}], [{name: 'CSE 200'}]]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ui.element('#generate-schedule').disabled, false);
  await ui.element('#generate-schedule').listeners.click();
  assert.equal(ui.opened.length, 1);
  const url = new URL(ui.opened[0].url);
  assert.equal(url.pathname, '/schedule.html');
  const groups = JSON.parse(decodeURIComponent(url.hash.slice(1)));
  assert.deepEqual(groups[0], {
    quarter: 'Autumn',
    courses: [{code: 'CSE 200', title: 'Next course', credits: '4'}],
  });
  assert.equal(groups[1].courses.length, 0);
  assert.equal(groups[2].courses.length, 0);
  assert.equal(ui.element('#generate-schedule').disabled, false);
});

test('webpage import saves scraped courses and enables generation', async (t) => {
  const ui = await loadPopup(t, null);
  await ui.element('#import-dars').listeners.click();
  assert.equal(ui.executions.length, 1);
  assert.deepEqual(ui.executions[0].target, {tabId: 42});
  assert.equal(ui.executions[0].world, 'ISOLATED');
  assert.deepEqual(ui.executions[0].args, ['chrome-extension://test/darsScraper.js']);
  assert.deepEqual(ui.stored, [{
    importedDars: [[{name: 'CSE 100'}], [{name: 'CSE 200'}]],
  }]);
  assert.equal(ui.element('#dars-hint').textContent, 'Degree audit imported.');
  assert.equal(ui.element('#generate-schedule').disabled, false);
  await ui.element('#generate-schedule').listeners.click();
  assert.equal(ui.opened.length, 1);
});

test('failed imports preserve the saved audit and display the scraper error', async (t) => {
  const ui = await loadPopup(t, [[{name: 'CSE 100'}], [{name: 'CSE 200'}]]);
  const originalError = console.error;
  console.error = () => {};
  t.after(() => { console.error = originalError; });
  chrome.scripting.executeScript = async () => [{result: {error: 'Audit is still loading.'}}];
  await ui.element('#import-dars').listeners.click();
  assert.deepEqual(ui.stored, []);
  assert.match(ui.element('#dars-hint').textContent, /Audit is still loading/);
  assert.equal(ui.element('#generate-schedule').disabled, false);
  assert.equal(ui.element('#import-dars').disabled, false);
});

test('catalog failure reports an error and permits retry without opening a tab', async (t) => {
  const ui = await loadPopup(t, [[], ['CSE 200']]);
  globalThis.fetch = async () => ({ok: false});
  const originalError = console.error;
  console.error = () => {};
  t.after(() => { console.error = originalError; });
  await ui.element('#generate-schedule').listeners.click();
  assert.deepEqual(ui.opened, []);
  assert.equal(ui.element('#generate-schedule').disabled, false);
  assert.match(ui.element('#generate-hint').textContent, /Unable to generate/);
});
