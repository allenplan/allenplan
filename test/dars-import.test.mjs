import assert from 'node:assert/strict';
import test from 'node:test';
import {importDarsFromTab} from '../extension/dars-import.js';

test('runs the actual scraper using the injected page document', async (t) => {
  const originalChrome = globalThis.chrome;
  const originalDocument = globalThis.document;
  t.after(() => {
    globalThis.chrome = originalChrome;
    globalThis.document = originalDocument;
  });
  const heading = {innerText: 'DARS degree audit'};
  // A loaded audit with no remaining requirements and no completed courses.
  const page = {
    URL: 'https://myplan.uw.edu/audit/#/degree',
    getElementsByClassName: () => [heading],
    querySelectorAll: () => [],
    querySelector: (selector) => selector === '.page-heading' ? heading : {
      children: [null, null, {children: [{children: [{className: 'Earned'}]}]}],
    },
  };
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
  assert.deepEqual(await importDarsFromTab(), [[], []]);

  heading.innerText = 'Loading';
  await assert.rejects(importDarsFromTab(), /wait for it to finish loading/);
  heading.innerText = 'DARS degree audit';
  page.URL = 'https://example.com/';
  // await assert.rejects(importDarsFromTab(), /Open your DARS/);

  page.URL = 'https://myplan.uw.edu/audit/#/degree';
  chrome.scripting.executeScript = async () => [{result: {audit: null}}];
  await assert.rejects(importDarsFromTab(), /valid course lists/);
  chrome.scripting.executeScript = async () => { throw new Error('Cannot access tab'); };
  await assert.rejects(importDarsFromTab(), /Cannot access tab/);
});
