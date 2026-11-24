import {isImportedDars} from './schedule.mjs';

export const DARS_ROOT = 'https://myplan.uw.edu/audit/';
const MAJORS = ['Computer Science', 'Computer Science: Data Science', 'Computer Engineering'];

/** Checks both the current URL and any pending navigation before accessing an audit. */
export function isDarsTab(tab) {
  return Boolean(tab?.url?.startsWith(DARS_ROOT)) &&
      (!tab.pendingUrl || tab.pendingUrl.startsWith(DARS_ROOT));
}

/**
 * Reads the live degree heading. Supplying a scraper URL also imports that audit.
 * @param {number} tabId
 * @param {?string} scraperUrl
 * @param {?string} expectedMajor Major shown when the user clicked import.
 * @return {!Promise<!Object>} The verified major and, on import, the course lists.
 */
async function readAudit(tabId, scraperUrl = null, expectedMajor = null) {
  const [execution] = await chrome.scripting.executeScript({
    target: {tabId}, world: 'ISOLATED',
    args: [DARS_ROOT, MAJORS, scraperUrl, expectedMajor],
    // Chrome serializes this function into the tab. All inputs must be explicit.
    func: async (root, majors, moduleUrl, selectedMajor) => {
      try {
        if (!document.URL.startsWith(root)) throw new Error('Open your DARS degree audit and try again.');
        const scraper = moduleUrl ? await import(moduleUrl) : null;
        // Read the heading after loading the module, immediately before scraping.
        const heading = document.querySelector('.audit-summary h1')?.textContent.replace(/\s+/g, ' ').trim();
        const guidance = `Open a ${majors[0]}, ${majors[1]}, or ${majors[2]} audit in DARS.`;
        if (!heading || !document.querySelector('.page-heading')?.innerText.includes('DARS')) {
          throw new Error(guidance);
        }
        // DARS uses both "Bachelor of Science (…)" and "BS in …" degree titles.
        const program = heading.replace(/^(?:Bachelor of Science|B\.?S\.?)\s+(?:in\s+)?/i, '')
            .replace(/^\((.*)\)$/, '$1').trim().replace(/\s*:\s*/g, ': ');
        const major = majors.find((name) => name.toLowerCase() === program.toLowerCase());
        if (!major) throw new Error(`The open audit is for ${heading}. ${guidance}`);
        if (selectedMajor && selectedMajor !== major) {
          throw new Error(`The open audit changed to ${major}. Review it and try again.`);
        }
        return scraper ? {major, audit: await scraper.retrieveDARS()} : {major};
      } catch (error) {
        return {error: error.message || String(error)};
      }
    },
  });
  if (!execution?.result?.major) {
    throw new Error(execution?.result?.error || 'Unable to read the degree heading. Reopen your DARS audit.');
  }
  return execution.result;
}

/** Reads the major for the popup without scraping courses. */
export async function getDarsMajor(tabId) {
  return (await readAudit(tabId)).major;
}

/** Rechecks the selected major and returns it together with the scraped course lists. */
export async function importDarsFromTab(expectedMajor) {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!Number.isInteger(tab?.id) || !isDarsTab(tab)) {
    throw new Error('Open your DARS degree audit and try again.');
  }
  const result = await readAudit(tab.id, chrome.runtime.getURL('darsScraper.js'), expectedMajor);
  if (!isImportedDars(result.audit)) {
    throw new Error('The scraper did not return valid course lists. Reload your audit and try again.');
  }
  return result;
}
