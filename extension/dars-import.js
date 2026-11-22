import {isImportedDars} from './schedule.mjs';

/**
 * Runs the bundled scraper against the active tab's live audit document.
 * @return {!Promise<!Array<!Array<!Object>>>} Finished and required courses.
 */
export async function importDarsFromTab() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const url = new URL(tab?.pendingUrl || tab?.url || 'about:blank');
  if (!Number.isInteger(tab?.id) || url.origin !== 'https://myplan.uw.edu' ||
      !url.pathname.startsWith('/audit/')) {
    throw new Error('Open your DARS degree audit and try again.');
  }
  const [execution] = await chrome.scripting.executeScript({
    target: {tabId: tab.id},
    world: 'ISOLATED',
    args: [chrome.runtime.getURL('darsScraper.js')],
    // This function is serialized into the tab; it must not use outer bindings.
    func: async (moduleUrl) => {
      try {
        const pageUrl = new URL(document.URL);
        if (pageUrl.origin !== 'https://myplan.uw.edu' ||
            !pageUrl.pathname.startsWith('/audit/')) {
          throw new Error('The tab navigated away from DARS. Open your audit again.');
        }
        if (!document.querySelector('.page-heading')?.innerText.includes('DARS')) {
          throw new Error('Open a completed DARS audit and wait for it to finish loading.');
        }
        const {retrieveDARS} = await import(moduleUrl);
        return {audit: await retrieveDARS()};
      } catch (error) {
        return {error: error.message || String(error)};
      }
    },
  });
  if (execution?.result?.error) {
    throw new Error(execution.result.error);
  }
  const audit = execution?.result?.audit;
  if (!isImportedDars(audit)) {
    throw new Error('The scraper did not return valid course lists. Reload your audit and try again.');
  }
  return audit;
}
