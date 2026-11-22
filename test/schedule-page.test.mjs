import assert from 'node:assert/strict';
import test from 'node:test';

test('results page restores preferences, regenerates in place, and tracks audit deletion', async (t) => {
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
    if (!elements.has(selector)) elements.set(selector, node());
    return elements.get(selector);
  };
  globalThis.document = {querySelector: element, createElement: node};
  const initial = {
    groups: [{quarter: 'Autumn', courses: []}], warnings: [],
    options: {maxCourses: 1, desired: ['CSE 401']},
  };
  globalThis.window = {
    location: {hash: `#${encodeURIComponent(JSON.stringify(initial))}`},
    history: {replaceState: (_state, _title, hash) => { window.location.hash = hash; }},
  };
  let audit = [[], []];
  let onStorageChange;
  globalThis.chrome = {
    runtime: {getURL: (path) => path},
    storage: {
      local: {get: async () => ({importedDars: audit})},
      onChanged: {addListener: (handler) => { onStorageChange = handler; }},
    },
  };
  globalThis.fetch = async () => ({ok: true, json: async () => [{
    code: 'CSE 401', title: 'Compilers', credits_min: 4, credits_max: 4,
    prerequisite_courses: [],
  }]});
  await import('../extension/schedule-page.js');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(element('#max-cs-courses').value, '1');
  assert.equal(element('#desired-courses').value, 'CSE 401');
  assert.equal(element('#generate-schedule').disabled, false);

  await element('#generate-schedule').listeners.click();
  let saved = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
  assert.equal(saved.groups[0].courses[0].code, 'CSE 401');
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

  audit = null;
  onStorageChange({importedDars: {newValue: null}}, 'local');
  assert.equal(element('#generate-schedule').disabled, true);
  const savedHash = window.location.hash;
  await element('#generate-schedule').listeners.click();
  assert.equal(window.location.hash, savedHash);
  assert.match(element('#generate-hint').textContent, /Import your DARS audit/);
  audit = [[], []];
  onStorageChange({importedDars: {newValue: audit}}, 'local');
  assert.equal(element('#generate-schedule').disabled, false);
});
