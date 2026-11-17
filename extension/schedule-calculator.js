/**
 * Scoring (per course, additive):
 *   desired course            +100
 *   prereq for desired course +10, plus its remaining chain height (so the start of a long chain
 *                              beats a prerequisite that has slack)
 *   fundamental course        +1
 *   core course               +1
 */
export const WEIGHTS = { desired: 100, prereq: 10, fundamental: 1, core: 1 };

/** Room for placeholders in a quarter when no maxTotalCourses / maxTotalCredits is given. */
export const DEFAULT_MAX_TOTAL_COURSES = 5;
export const DEFAULT_MAX_TOTAL_CREDITS = 18;

/**
 * Non-CSE credit requirements from the UW College of Arts & Sciences degree page
 * (https://www.washington.edu/students/gencat/program/S/college_arts_sciences.html).
 *
 * Course types: ENGL (English composition), LANG (foreign language), RSN (reasoning), W (additional
 * writing), A&H, SSc, NSc (the three areas of inquiry), AOI (the 15 areas-of-inquiry credits that
 * may come from any of the three areas, on top of the 20 required in each) and DIV (diversity).
 *
 * Not modeled: the major, an optional minor, and the free electives that bring the total to 180.
 *
 * @param {object} [options]
 * @param {number} [options.divCredits=5] 3 for students admitted before autumn quarter 2023
 * @param {number} [options.langCredits=0] 0-15, depending on placement or high school background
 * @returns {{type: string, label: string, credits: number, flexOf?: string[]}[]} A requirement with
 * `flexOf` is met by credits beyond the 20-credit minimum of those types, and is only suggested
 * once they are all filled.
 */
export function genEdRequirements({ divCredits = 5, langCredits = 0 } = {}) {
  return [
    { type: 'ENGL', label: 'English composition', credits: 5 },
    { type: 'LANG', label: 'Foreign language', credits: langCredits },
    { type: 'RSN', label: 'Reasoning', credits: 5 },
    { type: 'W', label: 'Writing', credits: 10 },
    { type: 'A&H', label: 'Arts & Humanities', credits: 20 },
    { type: 'SSc', label: 'Social Sciences', credits: 20 },
    { type: 'NSc', label: 'Natural Sciences', credits: 20 },
    { type: 'AOI', label: 'Areas of Inquiry (any area)', credits: 15, flexOf: ['A&H', 'SSc', 'NSc'] },
    { type: 'DIV', label: 'Diversity', credits: divCredits },
  ];
}

/**
 * How many credits are still needed in each requirement type.
 *
 * Each taken course is `[name, courseType, credits]`. `courseType` is a type like 'A&H', or an
 * array of types when one course satisfies several (['A&H', 'W']); its credits count toward every
 * type listed. Types that aren't in `requirements` are ignored.
 *
 * @param {[string, string|string[], number][]} takenGenEds
 * @param {{type: string, credits: number, flexOf?: string[]}[]} [requirements]
 * @returns {Map<string, number>} type -> credits still needed (0 when met), in requirement order
 * @throws {TypeError} when an entry isn't `[name, courseType, credits]` with a non-negative number
 */
export function remainingGenEdCredits(takenGenEds, requirements = genEdRequirements()) {
  const earned = new Map();
  for (const entry of takenGenEds) {
    if (!Array.isArray(entry) || entry.length < 3) {
      throw new TypeError(`takenGenEds entries must be [name, courseType, credits]; got ${JSON.stringify(entry)}`);
    }
    const [name, courseType, rawCredits] = entry;
    const credits = Number(rawCredits);
    if (!Number.isFinite(credits) || credits < 0) {
      throw new TypeError(`takenGenEds credits for ${JSON.stringify(name)} must be a non-negative number; got ${JSON.stringify(rawCredits)}`);
    }
    for (const type of new Set([courseType].flat())) {
      earned.set(type, (earned.get(type) ?? 0) + credits);
    }
  }
  const earnedIn = (type) => earned.get(type) ?? 0;
  const required = new Map(requirements.map((r) => [r.type, r.credits]));

  const needs = new Map();
  for (const { type, credits, flexOf } of requirements) {
    let have = earnedIn(type);
    for (const other of flexOf ?? []) {
      have += Math.max(0, earnedIn(other) - (required.get(other) ?? 0));
    }
    needs.set(type, Math.max(0, credits - have));
  }
  return needs;
}

/** Upper-case type -> readable name, e.g. 'SSC' -> 'Social Sciences'. */
function friendlyNames() {
  return new Map(genEdRequirements().map((r) => [r.type.toUpperCase(), r.label]));
}

/** Normalizes a DARS-style row's `courseType` (a type or an array of types) to upper-case types. */
function typesOf(requirement) {
  return [requirement?.courseType ?? []].flat().map((type) => String(type).trim().toUpperCase());
}

/**
 * Separates DARS-style remaining requirements into the rows `resolveRequirements()` understands
 * and the non-CSE category rows it can't pick courses for, e.g. `{name: 'XXX', courseType:
 * ['A&H', 'SSC', 'NSC'], credits: 15}`. Without this, the resolver warns "no supported course
 * choices are available" for every such row.
 *
 * Pass `resolverRequirements` to the resolver and `genEds` to `planQuarters` as `remainingGenEds`.
 * A row is a gen-ed row when its name is XXX and its types don't include CSE; everything else,
 * including XXX (CSE) electives and specific course codes, is left for the resolver untouched.
 *
 * @param {Array<string|object>} requirements remaining requirements
 * @returns {{
 *   resolverRequirements: Array<string|object>,
 *   genEds: {courseType: string[], credits: number}[],
 *   warnings: string[],
 * }} gen-ed rows with a missing or non-positive credit total are dropped with a warning
 */
export function splitGenEdRequirements(requirements) {
  const resolverRequirements = [];
  const genEds = [];
  const warnings = [];
  for (const requirement of requirements) {
    const value = typeof requirement === 'string' ? requirement : requirement?.code ?? requirement?.name;
    const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toUpperCase() : '';
    const types = typesOf(requirement);
    if (name !== 'XXX' || types.length === 0 || types.includes('CSE')) {
      resolverRequirements.push(requirement);
      continue;
    }
    const credits = Number(requirement.credits);
    if (!Number.isFinite(credits) || credits <= 0) {
      warnings.push(`XXX (${types.join('/')}): a positive credit total is needed to place a placeholder.`);
      continue;
    }
    genEds.push({ courseType: types, credits });
  }
  return { resolverRequirements, genEds, warnings };
}

/**
 * What the planner still has to place: one entry per requirement, with `need` credits remaining.
 * `waitFor` lists types that must be filled before this one is suggested.
 */
function buildGenEdNeeds({ takenGenEds, remainingGenEds, requirements }) {
  if (remainingGenEds !== null) {
    // Rows are already "remaining", so nothing is subtracted. A row with several types means
    // credits from any one of them; rows with the same types are pooled.
    const friendly = friendlyNames();
    const pooled = new Map();
    for (const row of remainingGenEds) {
      const types = typesOf(row);
      const credits = Number(row?.credits);
      if (types.length === 0 || !Number.isFinite(credits) || credits <= 0) {
        throw new TypeError(`remainingGenEds rows need courseType and positive credits; got ${JSON.stringify(row)}`);
      }
      const type = types.join('/');
      if (pooled.has(type)) {
        pooled.get(type).need += credits;
      } else {
        pooled.set(type, { type, label: types.map((t) => friendly.get(t) ?? t).join(' / '), need: credits, waitFor: [] });
      }
    }
    return [...pooled.values()];
  }
  const remaining = remainingGenEdCredits(takenGenEds, requirements);
  return requirements.map((r) => ({ type: r.type, label: r.label, need: remaining.get(r.type), waitFor: r.flexOf ?? [] }));
}

/**
 * The schedule calculator.
 */
export class ScheduleCalculator {
  /**
   * Score every eligible course.
   *
   * @param {CourseGraph} graph
   * @param {Set<string>} completed
   * @param {object} goals
   * @param {string[]} goals.desired
   * @param {Set<string>} goals.fundamental
   * @param {Set<string>} goals.core
   * @returns {Map<string, number>} eligible course -> score
   */
  static scoreEligible(graph, completed, { desired, fundamental, core }) {
    // Creates a map of all the cheapest requirement chains for every desired course.
    const memo = new Map();
    const needed = new Set();
    const edges = new Map();
    for (const target of desired) {
      const req = graph.requiredFor(target, completed, memo);
      req.courses.forEach((c) => needed.add(c));
      req.edges.forEach((tos, from) => {
        if (!edges.has(from)) edges.set(from, new Set());
        tos.forEach((to) => edges.get(from).add(to));
      });
    }

    // dist(c) = length of the longest chain from course c to a desired course.
    const dists = new Map();
    const dist = (c) => {
      if (dists.has(c)) return dists.get(c);
      let h = 1;
      for (const next of edges.get(c) ?? []) {
        h = Math.max(h, 1 + dist(next))
      }
      dists.set(c, h);
      return h;
    };

    // Score courses with weights, and distance
    const scores = new Map();
    for (const code of graph.getEligibleCourses(completed)) {
      let score = 0;
      if (desired.includes(code)) {
        score += WEIGHTS.desired;
      } else if (needed.has(code)) {
        score += WEIGHTS.prereq + dist(code);
      }
      if (fundamental.has(code)) score += WEIGHTS.fundamental;
      if (core.has(code)) score += WEIGHTS.core;
      scores.set(code, score);
    }

    return scores;
  }

  /**
   * Pick the best set of courses for one quarter.
   *
   * Scores are additive and courses chosen in the same quarter can't be prerequisites of each other
   * (eligibility is computed from *previous* quarters), so with only a course-count cap the answer
   * is simply the top-k by score. The branch-and-bound below also respects a credit cap and an
   * optional pairwise `conflicts(a, b)` (e.g. overlapping meeting times) and is exact. It stays
   * fast because candidates are sorted by score and a branch is cut as soon as even taking the best
   * remaining courses can't beat the incumbent.
   *
   * @param {Map<string, number>} scores
   * @param {object} options
   * @param {number} options.maxCourses
   * @param {number} [options.maxCredits]
   * @param {(code: string) => number} [options.credits]
   * @param {(a: string, b: string) => boolean} [options.conflicts]
   * @param {boolean} [options.includeZeroScore=false] pad with courses that advance no goal e.g.,
   *                                                   seminar classes
   * @returns {{courses: string[], score: number}}
   */
  static bestSchedule(
    scores,
    { maxCourses, maxCredits = Infinity, credits = () => 0, conflicts = () => false, includeZeroScore = false },
  ) {
    // Sort and filter candidates by score
    const candidates = [...scores.entries()]
      .filter(([, s]) => includeZeroScore || s > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    let best = { courses: [], score: 0 };
    const chosen = [];

    // Calculate best possible score
    const upperBound = (start, slots) => {
      let sum = 0;
      for (let i = start; i < candidates.length && slots > 0; i++, slots--) {
        sum += candidates[i][1];
      }
      return sum;
    };

    const search = (start, score, creditsUsed) => {
      if (score > best.score) best = { courses: [...chosen], score };
      if (chosen.length === maxCourses) return;
      for (let i = start; i < candidates.length; i++) {
        // Score cannot be higher, kill this path
        if (score + upperBound(i, maxCourses - chosen.length) <= best.score) return;
        const [code, s] = candidates[i];
        const cr = credits(code);
        if (creditsUsed + cr > maxCredits) continue;
        if (chosen.some((other) => conflicts(code, other))) continue;
        chosen.push(code);
        search(i + 1, score + s, creditsUsed + cr);
        chosen.pop();
      }
    };

    search(0, 0, 0);

    // Optionally pad schedule with no-goal courses, which have score 0
    if (includeZeroScore) {
      const picked = new Set(best.courses);
      let creditsUsed = best.courses.reduce((sum, c) => sum + credits(c), 0);
      for (const [code] of candidates) {
        if (best.courses.length >= maxCourses) break;
        if (picked.has(code)) continue;
        const cr = credits(code);
        if (creditsUsed + cr > maxCredits) continue;
        if (best.courses.some((other) => conflicts(code, other))) continue;
        best.courses.push(code);
        picked.add(code);
        creditsUsed += cr;
      }
    }

    return best;
  }

  /**
   * Calculate the best schedule for multiple consecutive quarters.
   *
   * @param {CourseGraph} graph
   * @param {Set<string>|string[]} completed
   * @param {string[]} quarters labels, in order, e.g. ['Winter 2027', 'Spring 2027']
   * @param {object} options
   * @param {string[]} options.desired
   * @param {Set<string>} [options.fundamental]
   * @param {Set<string>} [options.core]
   * @param {number} [options.maxCourses=3] most CSE courses in one quarter
   * @param {number} [options.maxCredits=18] most CSE credits in one quarter
   * @param {number} [options.maxTotalCourses] most courses of any kind in one quarter (CSE courses
   * plus placeholders). When given it also limits CSE courses; when omitted it doesn't, and
   * placeholders use DEFAULT_MAX_TOTAL_COURSES.
   * @param {number} [options.maxTotalCredits] same, for credits (DEFAULT_MAX_TOTAL_CREDITS)
   * @param {(a: string, b: string) => boolean} [options.conflicts]
   * @param {[string, string|string[], number][]} [options.takenGenEds] non-CSE courses already taken,
   * each `[name, courseType, credits]`. Passing this (even as `[]`) turns on placeholders for the
   * types that still need credits; leaving it out gives the original CSE-only plan.
   * @param {{courseType: string|string[], credits: number}[]} [options.remainingGenEds] gen-ed credits
   * still needed, as returned in `genEds` by splitGenEdRequirements() from DARS rows. These are
   * already net of what was taken, so nothing is subtracted; when given, it is used instead of
   * `takenGenEds`/`requirements`. A row with several types (['A&H', 'SSC', 'NSC']) means credits
   * from any one of them, and its placeholder's `type` is the types joined by '/'.
   * @param {object[]} [options.requirements=genEdRequirements()] the requirements to plan for
   * @param {number} [options.placeholderCredits=5] credits in a full-size placeholder
   * @returns {{quarter: string, courses: string[], credits: number}[]} `courses` and `credits` cover
   * CSE courses only. With `takenGenEds`, each quarter also has `placeholders`
   * (`{type, label, credits}[]`), `totalCredits` and `totalCourses`, which include the placeholders.
   */
  static planQuarters(graph, completed, quarters, options) {
    const {
      desired,
      fundamental = new Set(),
      core = new Set(),
      maxCourses = 3,
      maxCredits = 18,
      maxTotalCourses,
      maxTotalCredits,
      conflicts,
      takenGenEds = null,
      remainingGenEds = null,
      requirements = genEdRequirements(),
      placeholderCredits = 5,
    } = options;
    const done = new Set(completed);
    const credits = (code) => graph.getCourse(code)?.credits ?? 0;

    const planGenEds = takenGenEds !== null || remainingGenEds !== null;
    const needs = planGenEds ? buildGenEdNeeds({ takenGenEds, remainingGenEds, requirements }) : [];
    const needOf = new Map(needs.map((n) => [n.type, n]));
    const totalCourseCap = maxTotalCourses ?? DEFAULT_MAX_TOTAL_COURSES;
    const totalCreditCap = maxTotalCredits ?? DEFAULT_MAX_TOTAL_CREDITS;

    return quarters.map((quarter) => {
      const scores = ScheduleCalculator.scoreEligible(graph, done, { desired, fundamental, core });
      const { courses } = ScheduleCalculator.bestSchedule(scores, {
        // Explicit totals also limit CSE courses; omitted totals leave the original caps alone.
        maxCourses: Math.min(maxCourses, maxTotalCourses ?? Infinity),
        maxCredits: Math.min(maxCredits, maxTotalCredits ?? Infinity),
        credits,
        conflicts,
        includeZeroScore: false,
      });
      // Mark courses taken in previous quarter as complete
      courses.forEach((c) => done.add(c));
      const cseCredits = courses.reduce((sum, c) => sum + credits(c), 0);
      if (!planGenEds) return { quarter, courses, credits: cseCredits };

      // CSE courses come first. Room left over goes to placeholders for the type with the most
      // credits still needed, so the types fill evenly across quarters.
      const placeholders = [];
      let creditsLeft = totalCreditCap - cseCredits;
      let slotsLeft = totalCourseCap - courses.length;
      while (slotsLeft > 0) {
        let pick = null;
        for (const n of needs) {
          const size = Math.min(placeholderCredits, n.need);
          if (n.need <= 0 || size > creditsLeft) continue;
          // A flexible requirement waits until the types it draws from are all met.
          if (n.waitFor.some((other) => (needOf.get(other)?.need ?? 0) > 0)) continue;
          if (pick === null || n.need > pick.n.need) pick = { n, size };
        }
        if (pick === null) break;
        placeholders.push({ type: pick.n.type, label: `${pick.n.label} placeholder`, credits: pick.size });
        pick.n.need -= pick.size;
        creditsLeft -= pick.size;
        slotsLeft -= 1;
      }

      const placeholderTotal = placeholders.reduce((sum, p) => sum + p.credits, 0);
      return {
        quarter,
        courses,
        credits: cseCredits,
        placeholders,
        totalCredits: cseCredits + placeholderTotal,
        totalCourses: courses.length + placeholders.length,
      };
    });
  }
}
