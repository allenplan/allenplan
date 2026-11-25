import {courseCode, schedulableChain} from './requirement-resolver.js';

const MINIMUM = {upper: 4, additional: 2, capstoneOrCore: 1, credits: 33};

/** Apply distinct courses to the narrowest available slots and count their credits once. */
function remainingAfter(needs, courses) {
  let upper = 0;
  let core = 0;
  let capstones = 0;
  let credits = 0;
  for (const course of courses) {
    if (course.upper) upper++;
    if (course.core) core++;
    else capstones++;
    credits += course.credits;
  }
  const usedUpper = Math.min(needs.upper, upper);
  const usedAdditional = Math.min(needs.additional, core - usedUpper);
  return {
    upper: needs.upper - usedUpper,
    additional: needs.additional - usedAdditional,
    capstoneOrCore: Math.max(0, needs.capstoneOrCore - (core - usedUpper - usedAdditional + capstones)),
    credits: Math.max(0, needs.credits - credits),
  };
}

/** Read standard CS requirements from a new audit or a saved audit with major metadata. */
export function readCsCore(major, required, finished, catalog, coreCatalog) {
  const marker = required.find((row) => courseCode(row) === 'CSE CORE REQUIREMENTS');
  const standardCs = major ? major === 'Computer Science' : Boolean(marker);
  if (!standardCs) return null;

  const entries = new Map(catalog.map((course) => [course.code, course]));
  const aliases = new Map();
  const courses = new Map();
  for (const course of [...coreCatalog, ...catalog.filter((entry) => entry.capstone)]) {
    const code = courseCode(course);
    // CSE 331 fulfills the standard CS fundamentals requirement exclusively.
    if (code === 'CSE 331') continue;
    courses.set(code, {
      code, core: !course.capstone, upper: !course.capstone && /^CSE [4-9]\d{2}$/.test(code),
      credits: Number(entries.get(code)?.credits_min ?? course.credits ?? 0),
    });
    for (const alias of course.cross_listed ?? []) aliases.set(courseCode(alias), code);
  }

  const completed = new Set(finished.map(courseCode));
  const earned = new Map();
  for (const row of finished) {
    const code = aliases.get(courseCode(row)) ?? courseCode(row);
    const course = courses.get(code);
    if (!course) continue;
    const reported = Number(row.credits ?? course.credits);
    const credits = Number.isFinite(reported) && reported >= 0 ? reported : course.credits;
    if (!earned.has(code) || credits > earned.get(code).credits) {
      earned.set(code, {...course, credits});
    }
    completed.add(code);
  }
  for (const [alias, code] of aliases) {
    if (completed.has(code)) completed.add(alias);
  }
  const remaining = remainingAfter(MINIMUM, earned.values());
  const requirements = [];
  let legacyUpper = 0;
  let legacyOther = 0;
  for (const row of required) {
    const name = courseCode(row);
    if (row === marker) continue;
    if (/#core\b/.test(row.notes ?? '') && name === 'CSE 4XX') legacyUpper++;
    else if (/#core\b/.test(row.notes ?? '') && name === 'CSE 3XX/4XX') legacyOther++;
    else requirements.push(row);
  }
  // Old imports represented each remaining slot as a row. Their broad rows
  // combined the additional-core and capstone-or-core slots under one name.
  if (legacyUpper) remaining.upper = legacyUpper;
  if (legacyOther > remaining.additional + remaining.capstoneOrCore) {
    remaining.capstoneOrCore = Math.min(1, legacyOther);
    remaining.additional = legacyOther - remaining.capstoneOrCore;
  }
  for (const key of Object.keys(remaining)) {
    const net = marker?.coreRemaining?.[key];
    if (Number.isFinite(net) && net >= 0) remaining[key] = net;
  }
  return {remaining, requirements, courses, completed, aliases};
}

/** Evaluate the courses actually placed, including prerequisites and student requests. */
function evaluate(plan, policy, maxCourseCredits) {
  const codes = new Set(plan.flatMap((term) => term.courses));
  const qualifying = [...codes].map((code) => policy.courses.get(code)).filter(Boolean);
  const needs = remainingAfter(policy.remaining, qualifying);
  const slots = needs.upper + needs.additional + needs.capstoneOrCore;
  // A chain can fill several slots immediately but still require more classes
  // overall than picking two directly eligible, higher-credit courses.
  const minimumSize = codes.size + Math.max(slots, Math.ceil(needs.credits / maxCourseCredits));
  const surplusUpper = Math.max(0, qualifying.filter((course) => course.upper).length - policy.remaining.upper);
  return {codes, needs, minimumSize, surplusUpper};
}

/** Prefer the fewest classes to finish, then narrower slots and less surplus upper-level work. */
function comparePlans(a, b) {
  return a.minimumSize - b.minimumSize || a.needs.upper - b.needs.upper ||
      a.needs.additional - b.needs.additional ||
      a.needs.capstoneOrCore - b.needs.capstoneOrCore ||
      a.surplusUpper - b.surplusUpper || a.needs.credits - b.needs.credits || a.codes.size - b.codes.size;
}

/**
 * Extend the three-quarter plan one feasible goal at a time. Trying the normal
 * scheduler accounts for overlapping prerequisite chains, quarter capacity and
 * goals already scheduled, including core courses taken en route to another goal.
 */
export function planCsCore(policy, graph, desired, planFor, warnings) {
  const goals = [...desired];
  let plan = planFor(goals);
  if (Object.values(policy.remaining).every((value) => value === 0)) return plan;
  const candidates = [];
  for (const course of policy.courses.values()) {
    if (course.credits <= 0 || policy.completed.has(course.code)) continue;
    const chain = schedulableChain(graph, course.code, policy.completed);
    if (chain) candidates.push({...course, chain});
  }
  const maxCourseCredits = Math.max(1, ...candidates.map((course) => course.credits));
  let current = evaluate(plan, policy, maxCourseCredits);
  while (Object.values(current.needs).some((value) => value > 0)) {
    let best;
    let preparation;
    const outstanding = Object.keys(current.needs).filter((key) => current.needs[key] > 0);
    for (const candidate of candidates) {
      if (current.codes.has(candidate.code) || (!candidate.core && !current.needs.capstoneOrCore)) continue;
      // Skip courses that cannot advance any remaining requirement.
      const after = remainingAfter(current.needs, [candidate]);
      if (outstanding.every((key) => after[key] === current.needs[key])) continue;
      const trial = planFor([...goals, candidate.code]);
      const result = evaluate(trial, policy, maxCourseCredits);
      if ([...current.codes].some((code) => !result.codes.has(code))) continue;
      if (!result.codes.has(candidate.code)) {
        // A feasible chain may extend into a fourth quarter. Use otherwise
        // empty slots to start one such chain if no qualifying course fits.
        const stepsLeft = [...candidate.chain].filter((code) => !result.codes.has(code)).length;
        if (result.codes.size > current.codes.size && (!preparation || stepsLeft < preparation.stepsLeft)) {
          preparation = {trial, result, stepsLeft};
        }
        continue;
      }
      // Fill the most restrictive feasible requirement first. A credit-only
      // recommendation should not displace a feasible 400-level core goal.
      const priority = outstanding.findIndex((key) => result.needs[key] < current.needs[key]);
      if (priority >= 0 && (!best || priority < best.priority ||
          (priority === best.priority && comparePlans(result, best.result) < 0))) {
        best = {code: candidate.code, trial, result, priority};
      }
    }
    if (!best) {
      if (preparation) {
        plan = preparation.trial;
        current = preparation.result;
      }
      break;
    }
    goals.push(best.code);
    plan = best.trial;
    current = best.result;
  }
  const labels = {
    upper: '400-level core course', additional: 'additional core course',
    capstoneOrCore: 'capstone or additional core course',
  };
  const outstanding = Object.entries(current.needs).filter(([, amount]) => amount > 0)
      .map(([key, amount]) => key === 'credits' ? `${amount} of the 33 credits` :
        `${amount} ${labels[key]}${amount === 1 ? '' : 's'}`);
  if (outstanding.length) warnings.push(`The three-quarter plan leaves ${outstanding.join(', ')} remaining.`);
  return plan;
}
