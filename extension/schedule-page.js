import {groupSchedule, isImportedDars, parseDesiredCourses, scheduleQuarters} from './schedule.mjs';
import {generateFromAudit} from './schedule-generation.js';

const generateButton = document.querySelector('#generate-schedule');
const generateHint = document.querySelector('#generate-hint');
const openDarsLink = document.querySelector('#planner-open-dars');
const preferenceFields = document.querySelector('#schedule-preferences');
const preferencesStatus = document.querySelector('#preferences-status');
const courseLimit = document.querySelector('#max-cs-courses');
const desiredCourses = document.querySelector('#desired-courses');
const startQuarter = document.querySelector('#start-quarter');
const startYear = document.querySelector('#start-year');
const PREFERENCES_KEY = 'schedulePreferences';
let generating = false;
let auditAvailable = false;
let auditLoadFailed = false;
let preferencesReady = false;
let latestSave = 0;
let auditChange = 0;

/** Applies supported preferences, including the options in older result URLs. */
function applyPreferences(options) {
  if (['Autumn', 'Winter', 'Spring'].includes(options.startQuarter)) {
    startQuarter.value = options.startQuarter;
  }
  if (Number.isInteger(options.startYear) && options.startYear >= 2026 && options.startYear <= 2032) {
    startYear.value = String(options.startYear);
  }
  if (Number.isInteger(options.maxCourses) && options.maxCourses >= 0 && options.maxCourses <= 4) {
    courseLimit.value = String(options.maxCourses);
  }
  if (typeof options.desiredCourses === 'string') {
    desiredCourses.value = options.desiredCourses;
  } else if (Array.isArray(options.desired) && options.desired.every((code) => typeof code === 'string')) {
    desiredCourses.value = options.desired.join(', ');
  }
}

/** Captures the current form, including unfinished course codes. */
function readPreferences() {
  return {
    maxCourses: Number(courseLimit.value),
    startQuarter: startQuarter.value,
    startYear: Number(startYear.value),
    desiredCourses: desiredCourses.value,
  };
}

/** Saves immediately so there is no pending debounce when the planner closes. */
async function savePreferences() {
  const save = ++latestSave;
  try {
    await chrome.storage.local.set({[PREFERENCES_KEY]: readPreferences()});
    if (save === latestSave) preferencesStatus.hidden = true;
  } catch {
    if (save !== latestSave) return;
    preferencesStatus.textContent = 'Unable to save your preferences. Make another edit to retry.';
    preferencesStatus.hidden = false;
  }
}

/** Loads the saved draft over any preferences restored from an older result URL. */
async function restorePreferences() {
  try {
    const saved = await chrome.storage.local.get(PREFERENCES_KEY);
    applyPreferences(saved[PREFERENCES_KEY] ?? {});
  } catch {
    preferencesStatus.textContent = 'Unable to load your saved preferences.';
    preferencesStatus.hidden = false;
  } finally {
    preferencesReady = true;
    preferenceFields.disabled = false;
    updateAvailability();
  }
}

/** Restores a generated schedule from the URL, or leaves a fresh planner empty. */
function renderSchedule(restoreOptions = false, importedAt = null) {
  if (!window.location.hash) return;
  document.querySelector('.schedule-results').hidden = false;
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
    if (restoreOptions && data.options) applyPreferences(data.options);
    if (restoreOptions && (!auditAvailable || (data.auditImportedAt ?? null) !== importedAt)) {
      clearSchedule();
      return;
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
  const templateCount = groups.reduce((total, group) =>
    total + group.courses.filter((course) => course.isPlaceholder).length, 0);
  document.querySelector('#schedule-status').textContent = courseCount ?
      `${courseCount} course${courseCount === 1 ? '' : 's'} recommended from your degree audit.${templateCount ? ` Includes ${templateCount} gen-ed template${templateCount === 1 ? '' : 's'}.` : ''}` :
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
        if (course.isPlaceholder) item.className = 'gen-ed-template';
        const name = document.createElement('strong');
        name.textContent = [course.code, course.title].filter(Boolean).join(' — ') ||
            'Untitled course';
        item.append(name);
        if (course.isPlaceholder) {
          const explanation = document.createElement('small');
          explanation.textContent = `Gen-ed template (${course.type}). Choose a course that fulfills this requirement.`;
          item.append(explanation);
        }
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

/** Removes the schedule from the page and URL while leaving form values intact. */
function clearSchedule() {
  document.querySelector('.schedule-results').hidden = true;
  document.querySelector('#schedule-status').textContent = '';
  document.querySelector('#schedule-quarters').replaceChildren();
  const notice = document.querySelector('#schedule-warnings');
  notice.hidden = true;
  notice.replaceChildren();
  if (window.location.hash) window.history.replaceState(null, '', chrome.runtime.getURL('schedule.html'));
}

/** Updates generation controls when the saved audit becomes available or changes. */
function updateAvailability() {
  generateButton.disabled = generating || !auditAvailable || !preferencesReady;
  openDarsLink.hidden = auditAvailable || auditLoadFailed;
  generateHint.textContent = auditLoadFailed ?
      'Unable to load your saved audit. Reload this page to try again.' : auditAvailable ?
      'Your imported audit is ready.' :
      'Import your DARS degree audit through the AllenPlan popup to generate a schedule.';
}

/** Reads the current audit without relying on an open popup. */
async function restoreAuditAvailability() {
  const change = auditChange;
  try {
    const {importedDars, importedDarsInfo} = await chrome.storage.local.get(['importedDars', 'importedDarsInfo']);
    if (change !== auditChange) return;
    auditAvailable = isImportedDars(importedDars);
    if (auditAvailable) renderSchedule(true, importedDarsInfo?.importedAt ?? null);
    else clearSchedule();
    updateAvailability();
  } catch {
    if (change !== auditChange) return;
    auditAvailable = false;
    auditLoadFailed = true;
    updateAvailability();
  }
}

/** Generates in this tab and updates its URL so refreshing preserves the result. */
async function regenerateSchedule() {
  if (generating || !preferencesReady) return;
  generating = true;
  generateButton.disabled = true;
  generateHint.textContent = 'Generating your schedule...';
  let status;
  const change = auditChange;
  try {
    const {importedDars, importedDarsInfo} = await chrome.storage.local.get(['importedDars', 'importedDarsInfo']);
    if (change !== auditChange) return;
    auditAvailable = isImportedDars(importedDars);
    if (!auditAvailable) throw new Error('Import your DARS audit through the AllenPlan popup first.');
    const {desiredCourses: draft, ...limits} = readPreferences();
    const options = {...limits, desired: parseDesiredCourses(draft)};
    const {courses, warnings} = await generateFromAudit(importedDars, options);
    if (change !== auditChange) return;
    const data = {groups: groupSchedule(courses, undefined, scheduleQuarters(options)), warnings, options,
      auditImportedAt: importedDarsInfo?.importedAt ?? null};
    window.history.replaceState(null, '', `#${encodeURIComponent(JSON.stringify(data))}`);
    renderSchedule();
    status = 'Schedule updated.';
  } catch (error) {
    status = `Unable to generate your schedule: ${error.message || 'Please try again.'}`;
  } finally {
    generating = false;
    updateAvailability();
    if (change === auditChange && status) generateHint.textContent = status;
  }
}

generateButton.addEventListener('click', regenerateSchedule);
preferenceFields.addEventListener('input', savePreferences);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (Object.hasOwn(changes, 'importedDars') || Object.hasOwn(changes, 'importedDarsInfo'))) {
    auditChange++;
    clearSchedule();
    auditLoadFailed = false;
    if (Object.hasOwn(changes, 'importedDars')) auditAvailable = isImportedDars(changes.importedDars.newValue);
    else restoreAuditAvailability();
    updateAvailability();
  }
});
restoreAuditAvailability().then(restorePreferences);
