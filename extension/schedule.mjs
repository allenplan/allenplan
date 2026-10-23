const QUARTERS = ['Autumn', 'Winter', 'Spring'];

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
