import {CourseGraph} from './course-graph.js';
import {ScheduleCalculator} from './schedule-calculator.js';
import {courseCode, resolveRequirements} from './requirement-resolver.js';

const QUARTERS = ['Autumn', 'Winter', 'Spring'];

/**
 * Parses comma-, semicolon-, or newline-separated course codes.
 * @param {string} text User-entered course list.
 * @return {!Array<string>} Unique normalized course codes.
 */
export function parseDesiredCourses(text) {
  const codes = text.split(/[,;\n]+/).map((entry) => entry.trim()).filter(Boolean)
      .map((entry) => {
        const match = /^([A-Z&]+(?:\s+[A-Z&]+)*)\s*(\d{3})$/i.exec(entry);
        if (!match) {
          throw new Error(`Invalid course "${entry}". Use course codes like CSE 421, separated by commas or new lines.`);
        }
        return `${match[1].replace(/\s+/g, ' ').toUpperCase()} ${match[2]}`;
      });
  return [...new Set(codes)];
}

/**
 * Checks the [finishedCourses, requiredCourses] result from retrieveDARS.
 * @param {*} audit The saved audit.
 * @return {boolean} Whether it contains two valid course lists.
 */
export function isImportedDars(audit) {
  return Array.isArray(audit) && audit.length === 2 &&
      audit.every((courses) => Array.isArray(courses) &&
        courses.every((course) => courseCode(course) !== ''));
}

/**
 * Plans courses from an audit and adapts them for the schedule display.
 * @param {!Array<!Array<string|!Object>>} audit Finished and required courses.
 * @param {!Array<!Object>} catalog Bundled course catalog with prerequisites.
 * @param {!Array<!Object>=} coreCatalog Bundled core-course choices.
 * @param {{maxCourses?: number, desired?: !Array<string>}=} options Preferences.
 * @return {!Array<!Object>} Recommended courses with quarter, title and credits.
 */
export function scheduleFromDars(audit, catalog, coreCatalog = [], options = {}) {
  return planDarsSchedule(audit, catalog, coreCatalog, options).courses;
}

/**
 * Resolves requirements and returns a plan with any unresolved goals explained.
 * @param {!Array<!Array<string|!Object>>} audit Finished and required courses.
 * @param {!Array<!Object>} catalog Course catalog.
 * @param {!Array<!Object>=} coreCatalog Allowed core-course choices.
 * @param {{maxCourses?: number, desired?: !Array<string>}=} options Preferences.
 * @return {{courses: !Array<!Object>, warnings: !Array<string>}} Plan and limits.
 */
export function planDarsSchedule(audit, catalog, coreCatalog = [], options = {}) {
  if (!isImportedDars(audit)) {
    throw new Error('Import a valid degree audit before generating a schedule.');
  }
  const [finished, required] = audit;
  const {maxCourses = 3, desired: requested = []} = options;
  if (!Number.isInteger(maxCourses) || maxCourses < 0 || maxCourses > 4) {
    throw new Error('Choose a maximum of 0 to 4 CS classes per quarter.');
  }
  const graph = CourseGraph.fromCatalog(catalog);
  const entries = new Map(catalog.map((entry) => [entry.code, entry]));
  const completed = new Set(finished.map(courseCode));
  const {desired, warnings} = resolveRequirements(
      required, completed, graph, catalog, coreCatalog);
  for (const code of parseDesiredCourses(requested.join(','))) {
    if (completed.has(code) || desired.includes(code)) continue;
    if (graph.getCourse(code)?.schedulable) {
      desired.push(code);
    } else {
      warnings.push(`${code}: this desired course is not supported by the planning catalog.`);
    }
  }
  const plan = ScheduleCalculator.planQuarters(
      graph, completed, QUARTERS, {
        desired,
        maxCourses,
        maxCredits: 18,
      });
  const courses = plan.flatMap(({quarter, courses}) => courses.map((code) => ({
    quarter,
    code,
    title: entries.get(code)?.title ?? '',
    credits: graph.getCourse(code).credits,
  })));
  const scheduled = new Set(courses.map((course) => course.code));
  for (const code of desired) {
    if (!scheduled.has(code)) {
      warnings.push(`${code}: could not fit this goal into the three-quarter plan with its prerequisites.`);
    }
  }
  return {courses, warnings};
}

/**
 * Temporary mapping; replace or pass an adapter when the class API is defined.
 * @param {!Object} course A class instance; no serialization is required.
 * @return {!Object} Display fields: quarter, code, title, and credits.
 */
export function adaptCourse(course) {
  return {
    quarter: course.quarter,
    code: course.code,
    title: course.title ?? course.name,
    credits: course.credits,
  };
}

/**
 * Groups classes without mutating them or guessing unspecified quarters.
 * Adapters can read properties or call methods on future class instances.
 * @param {!Array<!Object>} classes Recommended classes.
 * @param {function(!Object): !Object=} adapter Maps each class to display fields.
 * @return {!Array<!Object>} Ordered quarter groups with normalized display text.
 */
export function groupSchedule(classes, adapter = adaptCourse) {
  const groups = QUARTERS.map((quarter) => ({quarter, courses: []}));
  const unassigned = {quarter: 'Quarter to be assigned', courses: []};
  for (const course of classes) {
    const display = adapter(course);
    const quarter = String(display.quarter ?? '').trim().toLowerCase();
    const group = groups.find((entry) =>
      entry.quarter.toLowerCase() === quarter) ?? unassigned;
    group.courses.push({
      code: String(display.code ?? '').trim(),
      title: String(display.title ?? '').trim(),
      credits: String(display.credits ?? '').trim(),
    });
  }
  return unassigned.courses.length ? [...groups, unassigned] : groups;
}
