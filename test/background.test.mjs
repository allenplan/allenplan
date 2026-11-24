import assert from 'node:assert/strict';
import test from 'node:test';

test('Help opens on first install and stays closed on updates', async (t) => {
  let installed;
  const opened = [];
  globalThis.chrome = {
    runtime: {
      onInstalled: {addListener(listener) { installed = listener; }},
      getURL: (path) => `chrome-extension://test/${path}`,
    },
    tabs: {create: async ({url}) => { opened.push(url); }},
  };
  t.after(() => { delete globalThis.chrome; });
  await import('../extension/background.js');
  await installed({reason: 'install'});
  await installed({reason: 'update'});
  await installed({reason: 'chrome_update'});
  assert.deepEqual(opened, ['chrome-extension://test/help.html#first-install']);
});
