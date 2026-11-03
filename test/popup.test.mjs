import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

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
  globalThis.document = {querySelector: element, querySelectorAll: () => []};
  globalThis.chrome = {
    runtime: {getURL: (path) => `chrome-extension://test/${path}`},
    storage: {local: {
      get: async () => ({importedDars: await audit}),
      set: async (value) => { stored.push(value); },
    }},
    tabs: {
      query: async () => [{url: 'https://myplan.uw.edu/audit/#/degree'}],
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
  return {element, opened, stored, fetched};
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

test('sample import saves both course lists and enables generation immediately', async (t) => {
  const ui = await loadPopup(t, null);
  await ui.element('#import-dars').listeners.click();
  assert.equal(ui.stored.length, 1);
  const [finished, required] = ui.stored[0].importedDars;
  assert.equal(finished.length, 34);
  assert.equal(required.length, 8);
  assert.ok(finished.some((course) => course.name === 'CSE 332'));
  assert.ok(required.every((course) => /^CSE \d{3}$/.test(course.name)));
  assert.equal(ui.element('#dars-hint').textContent, 'Sample degree audit imported.');
  assert.equal(ui.element('#generate-schedule').disabled, false);
  const bundledCatalog = JSON.parse(await readFile(
      new URL('../extension/uw_cse_courses.json', import.meta.url), 'utf8'));
  globalThis.fetch = async () => ({ok: true, json: async () => bundledCatalog});
  await ui.element('#generate-schedule').listeners.click();
  assert.equal(ui.opened.length, 1);
  const groups = JSON.parse(decodeURIComponent(new URL(ui.opened[0].url).hash.slice(1)));
  const scheduled = groups.flatMap((group) => group.courses.map((course) => course.code));
  assert.deepEqual([...scheduled].sort(), required.map((course) => course.name).sort());
  assert.ok(!scheduled.some((code) => finished.some((course) => course.name === code)));
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
