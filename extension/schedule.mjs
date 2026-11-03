import {CourseGraph} from './course-graph.js';
import {ScheduleCalculator} from './schedule-calculator.js';
import {courseCode, resolveRequirements} from './requirement-resolver.js';

const QUARTERS = ['Autumn', 'Winter', 'Spring'];

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
 * @return {!Array<!Object>} Recommended courses with quarter, title and credits.
 */
export function scheduleFromDars(audit, catalog, coreCatalog = []) {
  return planDarsSchedule(audit, catalog, coreCatalog).courses;
}

/**
 * Resolves requirements and returns a plan with any unresolved goals explained.
 * @param {!Array<!Array<string|!Object>>} audit Finished and required courses.
 * @param {!Array<!Object>} catalog Course catalog.
 * @param {!Array<!Object>=} coreCatalog Allowed core-course choices.
 * @return {{courses: !Array<!Object>, warnings: !Array<string>}} Plan and limits.
 */
export function planDarsSchedule(audit, catalog, coreCatalog = []) {
  if (!isImportedDars(audit)) {
    throw new Error('Import a valid degree audit before generating a schedule.');
  }
  const [finished, required] = audit;
  const graph = CourseGraph.fromCatalog(catalog);
  const entries = new Map(catalog.map((entry) => [entry.code, entry]));
  const completed = new Set(finished.map(courseCode));
  const {desired, warnings} = resolveRequirements(
      required, completed, graph, catalog, coreCatalog);
  const plan = ScheduleCalculator.planQuarters(
      graph, finished.map(courseCode), QUARTERS, {
        desired: required.map(courseCode),
        maxCourses: 2,
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
