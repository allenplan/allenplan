/**
 * Scoring (per course, additive):
 *   desired course            +100
 *   prereq for desired course +10, plus its remaining chain height (so the start of a long chain
 *                              beats a prerequisite that has slack)
 *   fundamental course        +1
 *   core course               +1
 */
export const WEIGHTS = { desired: 100, prereq: 10, fundamental: 1, core: 1 };

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
   * @param {number} [options.maxCourses=3]
   * @param {number} [options.maxCredits=18]
   * @param {(a: string, b: string) => boolean} [options.conflicts]
   * @returns {{quarter: string, courses: string[], credits: number}[]}
   */
  static planQuarters(graph, completed, quarters, options) {
    const {
      desired,
      fundamental = new Set(),
      core = new Set(),
      maxCourses = 3,
      maxCredits = 18,
      conflicts,
    } = options;
    const done = new Set(completed);
    const credits = (code) => graph.getCourse(code)?.credits ?? 0;

    return quarters.map((quarter) => {
      const scores = ScheduleCalculator.scoreEligible(graph, done, { desired, fundamental, core });
      const { courses } = ScheduleCalculator.bestSchedule(scores, { maxCourses, maxCredits, credits, conflicts, includeZeroScore: false });
      // Mark courses taken in previous quarter as complete
      courses.forEach((c) => done.add(c));
      return { quarter, courses, credits: courses.reduce((sum, c) => sum + credits(c), 0) };
    });
  }
}
