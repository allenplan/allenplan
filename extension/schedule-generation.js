import {planDarsSchedule} from './schedule.mjs';

/**
 * Loads bundled catalogs and generates a schedule with the selected preferences.
 * @param {!Array<!Array<!Object>>} audit Saved DARS result.
 * @param {!Object} options Course limit and desired courses.
 * @return {!Promise<!Object>} Recommended courses and unresolved requirements.
 */
export async function generateFromAudit(audit, options) {
  const [catalog, coreCatalog] = await Promise.all(
      ['uw_cse_courses.json', 'uw_cse_core_courses.json'].map(async (path) => {
        const response = await fetch(chrome.runtime.getURL(path));
        if (!response.ok) throw new Error('Unable to load the course catalog.');
        return response.json();
      }));
  return planDarsSchedule(audit, catalog, coreCatalog, options);
}
