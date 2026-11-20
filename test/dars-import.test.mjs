import assert from 'node:assert/strict';
import test from 'node:test';
import {getDarsMajor, importDarsFromTab} from '../extension/dars-import.js';

/** Runs the injected function against the audit document, as Chrome would. */
function installAudit(t, title) {
  const heading = {innerText: 'DARS degree audit'};
  const degree = {textContent: title};
  const page = {
    URL: 'https://myplan.uw.edu/audit/#/degree',
    getElementsByClassName: () => [heading],
    querySelectorAll: () => [],
    querySelector: (selector) => {
      if (selector === '.page-heading') return heading;
      if (selector === '.audit-summary h1') return degree.textContent ? degree : null;
      return {children: [null, null, {children: [{children: [{className: 'Earned'}]}]}]};
    },
  };
  const originalChrome = globalThis.chrome;
  const originalDocument = globalThis.document;
  t.after(() => {
    globalThis.chrome = originalChrome;
    globalThis.document = originalDocument;
  });
  globalThis.document = {URL: 'chrome-extension://test/popup.html'};
  globalThis.chrome = {
    tabs: {query: async () => [{id: 42, url: page.URL}]},
    runtime: {getURL: (path) => new URL(`../extension/${path}`, import.meta.url).href},
    scripting: {executeScript: async ({func, args}) => {
      const popupDocument = globalThis.document;
      globalThis.document = page;
      try {
        return [{result: await func(...args)}];
      } finally {
        globalThis.document = popupDocument;
      }
    }},
  };
  return {page, heading, degree};
}

for (const [title, major] of [
  ['BS in Computer Science', 'Computer Science'],
  ['Bachelor of Science (Computer Science)', 'Computer Science'],
  [' \u00a0Bachelor of Science (Computer Science:\n Data Science) ', 'Computer Science: Data Science'],
  ['BS in Computer Engineering', 'Computer Engineering'],
]) {
  test(`preview and import recognize the degree heading "${title.trim()}"`, async (t) => {
    const {page} = installAudit(t, title);
    const courseReads = t.mock.method(page, 'querySelectorAll');
    assert.equal(await getDarsMajor(42), major);
    assert.equal(courseReads.mock.callCount(), 0);
    assert.deepEqual(await importDarsFromTab(major), {major, audit: [[], []]});
    assert.ok(courseReads.mock.callCount() > 0);
  });
}

test('missing, unsupported and changed degrees cannot reach the scraper', async (t) => {
  const {page, degree} = installAudit(t, '');
  const courseReads = t.mock.method(page, 'querySelectorAll');
  for (const title of ['', 'BS in Computer Science and Engineering', 'Minor in Computer Science',
    'Bachelor of Science (Data Science)', 'BS in Electrical Engineering']) {
    degree.textContent = title;
    await assert.rejects(getDarsMajor(42), /Open a Computer Science.*Computer Engineering audit/);
    await assert.rejects(importDarsFromTab('Computer Science'), /Open a Computer Science.*Computer Engineering audit/);
  }
  degree.textContent = 'BS in Computer Engineering';
  await assert.rejects(importDarsFromTab('Computer Science'), /changed to Computer Engineering/);
  assert.equal(courseReads.mock.callCount(), 0);
});

test('rejects other pages, invalid course lists and injection failure', async (t) => {
  const {page, heading} = installAudit(t, 'BS in Computer Science');
  heading.innerText = 'MyPlan';
  await assert.rejects(importDarsFromTab(), /audit in DARS/);
  heading.innerText = 'DARS degree audit';
  page.URL = 'https://example.com/';
  await assert.rejects(importDarsFromTab(), /Open your DARS/);

  page.URL = 'https://myplan.uw.edu/audit/#/degree';
  chrome.scripting.executeScript = async () => [{result: {major: 'Computer Science', audit: null}}];
  await assert.rejects(importDarsFromTab(), /valid course lists/);
  chrome.scripting.executeScript = async () => { throw new Error('Cannot access tab'); };
  await assert.rejects(importDarsFromTab(), /Cannot access tab/);
});
