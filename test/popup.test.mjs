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
        value: selector === '#max-cs-courses' ? '3' : '',
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        getAttribute(name) { return this.attributes[name]; },
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
  const tabs = ['generate', 'dars', 'settings'].map((name) => {
    const tab = element(`#${name}-tab`);
    tab.setAttribute('aria-controls', `${name}-panel`);
    return tab;
  });
  globalThis.document = {
    querySelector: element, querySelectorAll: () => tabs,
    getElementById: (id) => element(`#${id}`),
  };
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
  assert.equal(ui.element('#dars-tab').getAttribute('aria-selected'), 'true');
  assert.equal(ui.element('#dars-panel').hidden, false);
  assert.equal(ui.element('#generate-panel').hidden, true);
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
  assert.equal(ui.element('#generate-tab').getAttribute('aria-selected'), 'true');
  assert.equal(ui.element('#generate-panel').hidden, false);
  assert.equal(ui.element('#dars-panel').hidden, true);
  assert.equal(ui.element('#generate-schedule').disabled, false);
  await ui.element('#generate-schedule').listeners.click();
  assert.equal(ui.opened.length, 1);
  const url = new URL(ui.opened[0].url);
  assert.equal(url.pathname, '/schedule.html');
  const {groups, warnings} = JSON.parse(decodeURIComponent(url.hash.slice(1)));
  assert.deepEqual(warnings, []);
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

test('placeholder generation loads core choices and passes unresolved warnings to the page', async (t) => {
  const ui = await loadPopup(t, [[], [
    {name: 'CSE 4XX', notes: 'https://example.com/#core'},
    {name: 'XXX', courseType: ['A&H'], credits: 5},
  ]]);
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(url);
    return {ok: true, json: async () => url.endsWith('uw_cse_core_courses.json') ?
      [{code: 'CSE 421'}] : [
        {code: 'CSE 401', credits_min: 4, credits_max: 4, prerequisite_courses: []},
        {code: 'CSE 421', title: 'Algorithms', credits_min: 3, credits_max: 3,
          prerequisite_courses: []},
      ]};
  };
  await ui.element('#generate-schedule').listeners.click();
  assert.equal(requests.length, 2);
  const {groups, warnings} = JSON.parse(
      decodeURIComponent(new URL(ui.opened[0].url).hash.slice(1)));
  assert.deepEqual(groups[0].courses, [{code: 'CSE 421', title: 'Algorithms', credits: '3'}]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /A&H/);
});

test('generation uses the entered desired courses and zero course limit', async (t) => {
  const ui = await loadPopup(t, [['CSE 100'], []]);
  ui.element('#desired-courses').value = 'cse200, CSE 200';
  ui.element('#max-cs-courses').value = '0';
  await ui.element('#generate-schedule').listeners.click();
  const empty = JSON.parse(decodeURIComponent(new URL(ui.opened[0].url).hash.slice(1)));
  assert.ok(empty.groups.every((group) => group.courses.length === 0));
  ui.element('#max-cs-courses').value = '1';
  await ui.element('#generate-schedule').listeners.click();
  const populated = JSON.parse(decodeURIComponent(new URL(ui.opened[1].url).hash.slice(1)));
  assert.equal(populated.groups[0].courses[0].code, 'CSE 200');
});

test('invalid desired-course input explains the format without opening a schedule', async (t) => {
  const ui = await loadPopup(t, [[], []]);
  const originalError = console.error;
  console.error = () => {};
  t.after(() => { console.error = originalError; });
  ui.element('#desired-courses').value = 'CSE 4XX';
  await ui.element('#generate-schedule').listeners.click();
  assert.equal(ui.opened.length, 0);
  assert.match(ui.element('#generate-hint').textContent, /Use course codes like CSE 421/);
  assert.equal(ui.element('#generate-schedule').disabled, false);
});
