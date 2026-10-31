/**
 * A directed graph of courses, where courses point to their dependents.
 */
export class CourseGraph {
  /** @type {Map<string, {code: string, credits: number, prereqs: string[][], schedulable: boolean}>} */
  #courses = new Map();
  /** @type {Map<string, Set<string>>} prerequisite -> courses that list it in any group */
  #dependents = new Map();

  /**
   * Builds a graph from the catalog JSON (uw_cse_courses.json).
   * @param {object[]} catalog
   * @returns {CourseGraph}
   */
  static fromCatalog(catalog) {
    const graph = new CourseGraph();
    for (const entry of catalog) {
      graph.addCourse(entry.code, {
        credits: entry.credits_min ?? 0,
        prereqs: entry.prerequisite_courses,
        schedulable: CourseGraph.#isSchedulable(entry),
      });
    }
    return graph;
  }

  /**
   * Whether a catalog entry is something the planner should place on a schedule e.g., undergraduate
   * CSE courses with a fixed credit value that can only be taken once. Variable-credit / repeatable
   * topics courses (CSE 390, 490, ...) and graduate courses are excluded.
   */
  static #isSchedulable(entry) {
    // Extract course code
    const match = /^CSE (\d+)$/.exec(entry.code);
    if (!match) return false;
    const level = Number(match[1]);
    return (
      level < 500 &&
      entry.credits_min != null &&
      entry.credits_min === entry.credits_max &&
      entry.max_total_credits == null
    );
  }

  /**
   * Add or update the given course in the graph, setting dependents to depend on that course as a
   * prerequisite. Also adds dependents to the graph if not already present.
   * @param {string} code
   * @param {{credits?: number, prereqs?: string[][], schedulable?: boolean}} [info]
   */
  addCourse(code, { credits = 0, prereqs = [], schedulable = false } = {}) {
    this.#courses.set(code, { code, credits, prereqs, schedulable });
    if (!this.#dependents.has(code)) this.#dependents.set(code, new Set());
    for (const group of prereqs) {
      for (const prereq of group) {
        if (!this.#dependents.has(prereq)) this.#dependents.set(prereq, new Set());
        this.#dependents.get(prereq).add(code);
      }
    }
  }

  /**
   * Whether or not the course graph contains the class with the given code.
   * @param {String} code 
   */
  has(code) {
    return this.#courses.has(code);
  }

  /**
   * Returns the class with the given code, or undefined if it is not present in the course graph.
   * @param {String} code 
   * @returns {{code: string, credits: number, prereqs: string[][], schedulable: boolean} | undefined}
   */
  getCourse(code) {
    return this.#courses.get(code);
  }

  /**
   * Return all dependents of a course with the given code, or an empty set if it is not present in
   * the course graph.
   * @param {String} code 
   * @returns {Set<string>} courses that list `code` as a prerequisite (read-only; do not mutate).
   */
  getDependents(code) {
    return this.#dependents.get(code) ?? new Set();
  }

  /**
   * Returns if the course with the given code has all prereqs satisfied, given a set of completed
   * courses. Returns false if the course with the given code is not present in the course graph.
   * @param {string} code
   * @param {Set<string>} completed
   */
  prereqsSatisfied(code, completed) {
    const course = this.#courses.get(code);
    if (!course) return false;
    return course.prereqs.every((group) => group.some((prereq) => completed.has(prereq)));
  }

  /**
   * Returns a list of all courses the student can take, given a set of completed courses.
   * @param {Set<string>} completed
   * @returns {string[]}
   */
  getEligibleCourses(completed) {
    const result = [];
    for (const course of this.#courses.values()) {
      if (course.schedulable && !completed.has(course.code) && this.prereqsSatisfied(course.code, completed)) {
        result.push(course.code);
      }
    }
    return result;
  }

  /**
   * Returns a graph consisting of the shortest chain of classes including the target class and all
   * neccessary prerequisite courses.
   * @param {string} target
   * @param {Set<string>} completed
   * @param {Map<string, {courses: Set<string>, edges: Map<string, Set<string>>}>} [memo]
   * @returns {{courses: Set<string>, edges: Map<string, Set<string>>}}
   */
  requiredFor(target, completed, memo = new Map(), visiting = new Set()) {
    if (completed.has(target)) return { courses: new Set(), edges: new Map() };
    if (memo.has(target)) return memo.get(target);

    const result = { courses: new Set([target]), edges: new Map() };
    const course = this.#courses.get(target);
    if (course && !visiting.has(target)) {
      visiting.add(target);
      for (const group of course.prereqs) {
        if (group.some((prereq) => completed.has(prereq))) continue;

        let best = null;
        let bestAlt = null;
        for (const alt of group) {
          const candidate = this.requiredFor(alt, completed, memo, visiting);
          if (best === null || candidate.courses.size < best.courses.size) {
            best = candidate;
            bestAlt = alt;
          }
        }
        this.#merge(result, best);
        this.#addEdge(result.edges, bestAlt, target);
      }
      visiting.delete(target);
    }
    memo.set(target, result);
    return result;
  }

  /**
   * Adds an edge to a graph. Solely used in requiredFor().
   * @param {Map<string, Set<string>>} edges 
   * @param {string} from 
   * @param {string} to 
   */
  #addEdge(edges, from, to) {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from).add(to);
  }

  /**
   * Merges two graphs used in requiredFor().
   * @param {{courses: Set<string>, edges: Map<string, Set<string>>}} into 
   * @param {{courses: Set<string>, edges: Map<string, Set<string>>}} from 
   */
  #merge(into, from) {
    from.courses.forEach((c) => into.courses.add(c));
    from.edges.forEach((tos, from_) => tos.forEach((to) => this.#addEdge(into.edges, from_, to)));
  }
}
