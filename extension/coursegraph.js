/**
 * A directed graph of courses, where courses point to their dependents.
 */
export class CourseGraph {
  #adjList;

  /**
   * Creates a empty course graph.
   */
  constructor() {
    this.adjList = new Map();
  }
  
  /**
   * Add the given course to the graph, with no dependents.
   * @param {String} course 
   */
  addCourse(course) {
    if (!this.adjList.has(course)) {
      this.adjList.set(course, []);
    }
  }

  /**
   * Add or update the given course in the graph, setting dependent to depend on that course as a
   * prerequisite. Also adds dependent to the graph if not already present.
   * @param {String} course 
   * @param {String} dependent 
   */
  addCourseWithDependent(course, dependent) {
    this.addCourse(course);
    this.addCourse(dependent);
    if (!this.adjList.get(course).includes(dependent)) this.adjList.get(course).push(dependent);
  }

  /**
   * Remove a course from the graph. Should only be called on courses that depend on no other
   * courses.
   * @param {String} course 
   */
  deleteCourse(course) {
    this.adjList.delete(course);
  }

  /**
   * Calculate how many prerequisite courses each specific course depends on.
   * @returns {Map<String, Number>} A map of each course in the graph to how many courses it
   * depends on (how many prerequisite courses it has).
   */
  #calculateIndegrees() {
    const indegrees = new Map();
    this.adjList.forEach((dependents, dependency) => {
      if (!indegrees.has(dependency)) indegrees.set(dependency, 0);
      dependents.forEach((dependent) => {
        if (!indegrees.has(dependent)) {
          indegrees.set(dependent, 0);
        }
        indegrees.set(dependent, indegrees.get(dependent) + 1);
      });
    });
    return indegrees;
  }

  /**
   * Returns a list of CSE courses with no prerequisite courses.
   * @returns {String[]}
   */
  getPossibleCourses() {
    const result = [];
    const indegrees = this.#calculateIndegrees();
    indegrees.forEach((indegree, course) => {
      if (indegree == 0 && course.includes('CSE')) result.push(course);
    });
    return result;
  }

  /**
   * Returns a copy of the underlying adjacency list, for testing.
   * @returns {Map<String, String[]>}
   */
  getAdjListForTesting() {
    return structuredClone(this.adjList);
  }
}