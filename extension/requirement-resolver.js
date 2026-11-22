/**
 * Reads normalized course codes from strings or serialized DARS courses.
 * @param {string|!Object} course Course or requirement.
 * @return {string} Normalized code.
 */
export function courseCode(course) {
  const value = typeof course === 'string' ? course : course?.code ?? course?.name;
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toUpperCase() : '';
}

/**
 * Selects concrete goals for remaining DARS requirements without changing them.
 * Level placeholders represent course slots; XXX represents category credits.
 * Each selected course is assigned to at most one remaining requirement.
 * Selection is greedy: reserve exact goals, then narrow slots, then credits,
 * preferring courses with the fewest additional prerequisites.
 * @param {!Array<string|!Object>} requirements Remaining requirements.
 * @param {!Set<string>} completed Previously completed courses.
 * @param {!CourseGraph} graph Catalog prerequisite graph.
 * @param {!Array<!Object>} catalog Course catalog.
 * @param {!Array<!Object>} coreCatalog Allowed core courses.
 * @return {{desired: !Array<string>, warnings: !Array<string>}} Resolved goals.
 */
export function resolveRequirements(requirements, completed, graph, catalog, coreCatalog) {
  const desired = new Set();
  const warnings = [];
  const core = new Set(coreCatalog.map(courseCode));
  const available = catalog.filter((entry) =>
    graph.getCourse(entry.code)?.schedulable && !completed.has(entry.code));
  const pending = [];
  const creditGroups = new Map();

  for (const requirement of requirements) {
    const name = courseCode(requirement);
    if (/^[A-Z& ]+ \d{3}$/.test(name)) {
      if (completed.has(name)) continue;
      if (graph.getCourse(name)?.schedulable) {
        desired.add(name);
      } else {
        warnings.push(`${name}: this course is not supported by the planning catalog.`);
      }
      continue;
    }
    const rawTypes = requirement?.courseType ?? [];
    const types = (Array.isArray(rawTypes) ? rawTypes : [rawTypes])
        .map((type) => String(type).trim().toUpperCase());
    const coreOnly = /#core\b/.test(requirement?.notes ?? '');
    let matches;
    let credits = null;
    if (/^CSE [1-4][\dX]{2}(?:\/[1-4][\dX]{2})*$/.test(name)) {
      const patterns = name.slice(4).split('/').map((level) =>
        new RegExp(`^CSE ${level.replace(/X/g, '\\d')}$`));
      matches = (entry) => patterns.some((pattern) => pattern.test(entry.code));
    } else if (name === 'XXX' && types.includes('CSE')) {
      // The bundled catalog supports upper-division CSE elective choices.
      matches = (entry) => /^CSE [34]\d{2}$/.test(entry.code);
      credits = Number(requirement.credits);
      if (!Number.isFinite(credits) || credits <= 0) {
        warnings.push('XXX (CSE): a positive credit total is needed to choose electives.');
        continue;
      }
    } else {
      warnings.push(`${name}${types.length ? ` (${types.join('/')})` : ''}: no supported course choices are available for this requirement.`);
      continue;
    }
    const candidates = available.filter((entry) =>
      matches(entry) && (!coreOnly || core.has(entry.code)));
    const label = `${name}${coreOnly ? ' (core)' : ''}`;
    if (credits !== null) {
      // Pool matching credit requirements so surplus credits aren't lost between rows.
      const key = `${name}:${coreOnly}`;
      const group = creditGroups.get(key);
      if (group) {
        group.remaining += credits;
      } else {
        const group = {label, candidates, remaining: credits, byCredits: true};
        creditGroups.set(key, group);
        pending.push(group);
      }
    } else {
      pending.push({label, candidates, remaining: 1, byCredits: false});
    }
  }

  // Count prerequisites already selected for another goal only once in ranking.
  const planned = new Set(desired);
  for (const code of desired) {
    graph.requiredFor(code, completed).courses.forEach((needed) => planned.add(needed));
  }
  pending.sort((a, b) => Number(a.byCredits) - Number(b.byCredits) ||
      a.candidates.length - b.candidates.length);
  for (const requirement of pending) {
    while (requirement.remaining > 0) {
      const choices = [];
      for (const entry of requirement.candidates) {
        if (desired.has(entry.code)) continue;
        const chain = graph.requiredFor(entry.code, completed).courses;
        // Reject missing, unschedulable, or cyclic prerequisite chains.
        const done = new Set(completed);
        let progress = true;
        while (progress && !done.has(entry.code)) {
          progress = false;
          for (const code of chain) {
            const course = graph.getCourse(code);
            if (!done.has(code) && course?.schedulable && course.credits <= 18 &&
                graph.prereqsSatisfied(code, done)) {
              done.add(code);
              progress = true;
            }
          }
        }
        if (!done.has(entry.code)) continue;
        const extra = [...chain].filter((code) => !planned.has(code)).length;
        const credits = graph.getCourse(entry.code).credits;
        if (credits <= 0) continue;
        const excess = requirement.byCredits ? Math.max(0, credits - requirement.remaining) : 0;
        choices.push({entry, chain, extra, credits, excess});
      }
      choices.sort((a, b) => a.extra - b.extra || a.excess - b.excess ||
          a.entry.code.localeCompare(b.entry.code));
      const choice = choices[0];
      if (!choice) {
        warnings.push(`${requirement.label}: could not assign ${requirement.remaining} remaining ${requirement.byCredits ? 'credits' : 'course slot'} from available courses and prerequisites.`);
        break;
      }
      desired.add(choice.entry.code);
      choice.chain.forEach((code) => planned.add(code));
      requirement.remaining -= requirement.byCredits ? choice.credits : 1;
    }
  }
  return {desired: [...desired], warnings};
}
