import assert from 'node:assert/strict';
import test from 'node:test';

let plannerInstance = 0;

/** Opens the planner with a saved audit and an optional previously generated result. */
async function loadPlanner(t, initial, storage = {}) {
  const originals = new Map(['document', 'window', 'chrome', 'fetch'].map((name) =>
    [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  const node = () => ({
    children: [], listeners: {}, value: '', hidden: false, textContent: '',
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
  });
  const elements = new Map();
  const element = (selector) => {
    if (!elements.has(selector)) {
      const entry = node();
      entry.value = ({'#start-quarter': 'Autumn', '#start-year': '2026', '#max-cs-courses': '3'})[selector] ?? '';
      entry.hidden = selector === '.schedule-results' || selector === '#schedule-warnings';
      elements.set(selector, entry);
    }
    return elements.get(selector);
  };
  globalThis.document = {querySelector: element, createElement: node};
  globalThis.window = {
    location: {hash: initial ? `#${encodeURIComponent(JSON.stringify(initial))}` : ''},
    history: {replaceState: (_state, _title, hash) => { window.location.hash = hash; }},
  };
  let audit = [[], []];
  let onStorageChange;
  globalThis.chrome = {
    runtime: {getURL: (path) => path},
    storage: {
      local: {
        get: async (key) => key === 'importedDars' ? {importedDars: audit} : {[key]: storage[key]},
        set: async (values) => { Object.assign(storage, values); },
      },
      onChanged: {addListener: (handler) => { onStorageChange = handler; }},
    },
  };
  globalThis.fetch = async () => ({ok: true, json: async () => [{
    code: 'CSE 401', title: 'Compilers', credits_min: 4, credits_max: 4,
    prerequisite_courses: [],
  }]});
  await import(`../extension/schedule-page.js?test=${plannerInstance++}`);
  await new Promise((resolve) => setImmediate(resolve));
  return {
    element,
    setAudit(value) {
      audit = value;
      onStorageChange({importedDars: {newValue: value}}, 'local');
    },
  };
}

test('planner restores ungenerated preferences independently of the audit and URL', async (t) => {
  const storage = {};
  const draft = 'CSE 401,\nCSE ';
  await t.test('edit before generating', async (t) => {
    const {element, setAudit} = await loadPlanner(t, undefined, storage);
    for (const [selector, value] of [
      ['#max-cs-courses', '0'], ['#start-quarter', 'Spring'], ['#start-year', '2029'],
      ['#desired-courses', draft],
    ]) {
      element(selector).value = value;
      await element('#schedule-preferences').listeners.input();
    }
    assert.equal(window.location.hash, '');
    setAudit(null);
    assert.deepEqual(storage.schedulePreferences, {
      maxCourses: 0, startQuarter: 'Spring', startYear: 2029, desiredCourses: draft,
    });
  });
  await t.test('reopen over an older result', async (t) => {
    const {element} = await loadPlanner(t, {
      groups: [{quarter: 'Autumn', courses: []}],
      options: {maxCourses: 3, desired: ['CSE 401'], startQuarter: 'Autumn', startYear: 2028},
    }, storage);
    assert.equal(element('#max-cs-courses').value, '0');
    assert.equal(element('#start-quarter').value, 'Spring');
    assert.equal(element('#start-year').value, '2029');
    assert.equal(element('#desired-courses').value, draft);
  });
});

test('fresh planner waits for Generate and can retry after a catalog error', async (t) => {
  const {element, setAudit} = await loadPlanner(t);
  assert.equal(window.location.hash, '');
  assert.equal(element('.schedule-results').hidden, true);
  assert.equal(element('#schedule-status').textContent, '');
  assert.equal(element('#generate-schedule').disabled, false);

  setAudit([[], [{name: 'CSE 4XX', notes: 'https://example.com/#core'}]]);
  globalThis.fetch = async () => ({ok: false});
  await element('#generate-schedule').listeners.click();
  assert.equal(element('.schedule-results').hidden, true);
  assert.match(element('#generate-hint').textContent, /Unable to load the course catalog/);

  globalThis.fetch = async (path) => ({
    ok: true, json: async () => path.endsWith('uw_cse_core_courses.json') ? [{code: 'CSE 421'}] : [
      {code: 'CSE 401', credits_min: 4, credits_max: 4, prerequisite_courses: []},
      {code: 'CSE 421', credits_min: 3, credits_max: 3, prerequisite_courses: []},
    ],
  });
  await element('#generate-schedule').listeners.click();
  assert.equal(element('.schedule-results').hidden, false);
  const {groups} = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
  assert.equal(groups[0].courses[0].code, 'CSE 421');
  assert.equal(element('#schedule-quarters').children.length, 3);
});

test('results page restores preferences, regenerates in place, and tracks audit deletion', async (t) => {
  const {element, setAudit} = await loadPlanner(t, {
    groups: [{quarter: 'Autumn', courses: []}], warnings: [],
    options: {maxCourses: 1, desired: ['CSE 401'], startQuarter: 'Winter', startYear: 2028},
  });
  assert.equal(element('.schedule-results').hidden, false);
  assert.equal(element('#max-cs-courses').value, '1');
  assert.equal(element('#start-quarter').value, 'Winter');
  assert.equal(element('#start-year').value, '2028');
  assert.equal(element('#desired-courses').value, 'CSE 401');
  assert.equal(element('#generate-schedule').disabled, false);

  await element('#generate-schedule').listeners.click();
  let saved = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
  assert.equal(saved.groups[0].courses[0].code, 'CSE 401');
  assert.deepEqual(saved.groups.map((group) => group.quarter), ['Winter 2028', 'Spring 2028', 'Autumn 2028']);
  assert.equal(element('#schedule-quarters').children.length, 3);
  assert.match(element('#schedule-status').textContent, /1 course recommended/);

  element('#desired-courses').value = 'not a course';
  const previousHash = window.location.hash;
  await element('#generate-schedule').listeners.click();
  assert.equal(window.location.hash, previousHash);
  assert.match(element('#generate-hint').textContent, /Invalid course/);

  element('#desired-courses').value = 'CSE 401';
  element('#max-cs-courses').value = '0';
  await element('#generate-schedule').listeners.click();
  saved = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
  assert.ok(saved.groups.every((group) => group.courses.length === 0));
  assert.equal(saved.options.maxCourses, 0);

  setAudit([[], [{name: 'XXX', courseType: ['W'], credits: 2}]]);
  element('#desired-courses').value = '';
  await element('#generate-schedule').listeners.click();
  saved = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
  assert.equal(saved.groups[0].courses[0].isPlaceholder, true);
  assert.equal(saved.groups[0].courses[0].credits, '2');
  const template = element('#schedule-quarters').children[0].children[1].children[0];
  assert.equal(template.className, 'gen-ed-template');
  assert.equal(template.children[0].textContent, 'Writing placeholder');
  assert.match(template.children[1].textContent, /Choose a course/);
  assert.equal(template.children[2].textContent, '2 credits');
  assert.match(element('#schedule-status').textContent, /Includes 1 gen-ed template/);

  setAudit(null);
  assert.equal(element('#generate-schedule').disabled, true);
  const savedHash = window.location.hash;
  await element('#generate-schedule').listeners.click();
  assert.equal(window.location.hash, savedHash);
  assert.match(element('#generate-hint').textContent, /Import your DARS audit/);
  setAudit([[], []]);
  assert.equal(element('#generate-schedule').disabled, false);
});
