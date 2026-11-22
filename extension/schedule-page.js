import {groupSchedule, isImportedDars, parseDesiredCourses} from './schedule.mjs';
import {generateFromAudit} from './schedule-generation.js';

const generateButton = document.querySelector('#generate-schedule');
const generateHint = document.querySelector('#generate-hint');
let generating = false;
let auditAvailable = false;

/** Renders the normalized schedule passed by the popup in the URL fragment. */
function renderSchedule() {
  let groups;
  let warnings;
  try {
    const data = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
    // Continue to support schedule tabs opened before warnings were introduced.
    groups = Array.isArray(data) ? data : data.groups;
    warnings = Array.isArray(data) ? [] : data.warnings ?? [];
    if (!Array.isArray(groups) || !groups.every((group) => group &&
        typeof group.quarter === 'string' && Array.isArray(group.courses)) || !Array.isArray(warnings) ||
        !warnings.every((warning) => typeof warning === 'string')) {
      throw new Error('Invalid schedule');
    }
    const options = data.options;
    if (options && Number.isInteger(options.maxCourses) &&
        options.maxCourses >= 0 && options.maxCourses <= 4) {
      document.querySelector('#max-cs-courses').value = String(options.maxCourses);
    }
    if (options && Array.isArray(options.desired) &&
        options.desired.every((code) => typeof code === 'string')) {
      document.querySelector('#desired-courses').value = options.desired.join(', ');
    }
  } catch {
    document.querySelector('#schedule-status').textContent =
        'Unable to load this schedule. Use the controls above to generate a new one.';
    return;
  }
  const container = document.querySelector('#schedule-quarters');
  const notice = document.querySelector('#schedule-warnings');
  notice.replaceChildren();
  notice.hidden = warnings.length === 0;
  if (warnings.length) {
    const heading = document.createElement('h3');
    heading.textContent = 'Requirements needing attention';
    const list = document.createElement('ul');
    for (const warning of warnings) {
      const item = document.createElement('li');
      item.textContent = warning;
      list.append(item);
    }
    notice.append(heading, list);
  }
  const courseCount = groups.reduce((total, group) => total + group.courses.length, 0);
  document.querySelector('#schedule-status').textContent = courseCount ?
      `${courseCount} course${courseCount === 1 ? '' : 's'} recommended from your degree audit.` :
      'No courses scheduled. Check your course limit and remaining requirements in the supported catalog.';
  container.replaceChildren();
  for (const {quarter, courses} of groups) {
    const section = document.createElement('section');
    section.className = 'card quarter';
    const heading = document.createElement('h3');
    heading.textContent = quarter;
    section.append(heading);
    if (courses.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No courses recommended yet.';
      section.append(empty);
    } else {
      const list = document.createElement('ul');
      for (const course of courses) {
        const item = document.createElement('li');
        const name = document.createElement('strong');
        name.textContent = [course.code, course.title].filter(Boolean).join(' — ') ||
            'Untitled course';
        item.append(name);
        if (course.credits !== '') {
          const credits = document.createElement('small');
          credits.textContent = `${course.credits} credits`;
          item.append(credits);
        }
        list.append(item);
      }
      section.append(list);
    }
    container.append(section);
  }
}

/** Updates generation controls when the saved audit becomes available or changes. */
function updateAvailability() {
  generateButton.disabled = generating || !auditAvailable;
  generateHint.textContent = auditAvailable ?
      'Adjust your preferences and generate a new schedule below.' :
      'Import your DARS degree audit through the AllenPlan popup to generate a schedule.';
}

/** Reads the current audit without relying on an open popup. */
async function restoreAuditAvailability() {
  try {
    const {importedDars} = await chrome.storage.local.get('importedDars');
    auditAvailable = isImportedDars(importedDars);
    updateAvailability();
  } catch {
    auditAvailable = false;
    updateAvailability();
    generateHint.textContent = 'Unable to load your saved audit. Reload this page to try again.';
  }
}

/** Generates in this tab and updates its URL so refreshing preserves the result. */
async function regenerateSchedule() {
  if (generating) return;
  generating = true;
  generateButton.disabled = true;
  generateHint.textContent = 'Generating your schedule...';
  let status;
  try {
    const {importedDars} = await chrome.storage.local.get('importedDars');
    auditAvailable = isImportedDars(importedDars);
    if (!auditAvailable) throw new Error('Import your DARS audit through the AllenPlan popup first.');
    const options = {
      maxCourses: Number(document.querySelector('#max-cs-courses').value),
      desired: parseDesiredCourses(document.querySelector('#desired-courses').value),
    };
    const {courses, warnings} = await generateFromAudit(importedDars, options);
    const data = {groups: groupSchedule(courses), warnings, options};
    window.history.replaceState(null, '', `#${encodeURIComponent(JSON.stringify(data))}`);
    renderSchedule();
    status = 'Schedule updated.';
  } catch (error) {
    status = `Unable to generate your schedule: ${error.message || 'Please try again.'}`;
  } finally {
    generating = false;
    updateAvailability();
    generateHint.textContent = status;
  }
}

generateButton.addEventListener('click', regenerateSchedule);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.hasOwn(changes, 'importedDars')) {
    auditAvailable = isImportedDars(changes.importedDars.newValue);
    updateAvailability();
  }
});
renderSchedule();
restoreAuditAvailability();
