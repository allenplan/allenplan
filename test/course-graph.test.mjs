import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { CourseGraph } from '../extension/course-graph.js';

function catalogEntry(code, prerequisite_courses = [], credits = 4) {
  return { code, prerequisite_courses, credits_min: credits, credits_max: credits };
}

test('CourseGraph: Graph from fromCatalog() contains all courses and prereqs', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses);

  courses.forEach((course) => {
    assert.equal(courseGraph.has(course.code), true);
  });

  courses.forEach((course) => {
    course.prerequisite_courses.forEach((group) => {
      group.forEach((prereq) => {
        assert.equal(courseGraph.getDependents(prereq).has(course.code), true);
      });
    });
  });
});

test('CourseGraph: changing the source catalog leaves the graph intact', () => {
  const entry = catalogEntry('CSE 200', [['CSE 100']]);
  const graph = CourseGraph.fromCatalog([entry]);

  entry.prerequisite_courses[0][0] = 'CSE 101';
  entry.prerequisite_courses.push(['CSE 102']);

  assert.deepStrictEqual(graph.getCourse('CSE 200').prereqs, [['CSE 100']]);
  assert.equal(graph.prereqsSatisfied('CSE 200', new Set(['CSE 100'])), true);
  assert.deepStrictEqual(graph.getDependents('CSE 100'), new Set(['CSE 200']));
});

test('CourseGraph: repeated catalog entries with the same prerequisites do not duplicate dependents', () => {
  const entry = catalogEntry('CSE 200', [['CSE 100']]);
  const graph = CourseGraph.fromCatalog([entry, entry]);
  assert.deepStrictEqual(graph.getDependents('CSE 100'), new Set(['CSE 200']));
});

test('CourseGraph: has() functions correctly', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses);

  courses.forEach((course) => {
    assert.equal(courseGraph.has(course.code), true);
  });

  courses.forEach((course) => {
    course.prerequisite_courses.forEach((group) => {
      group.forEach((prereq) => {
        assert.equal(courseGraph.getDependents(prereq).has(course.code), true);
      });
    });
  });

  assert.equal(courseGraph.has('CSE 999'), false);
});

test('CourseGraph: getCourse() has correct credit and prereqs', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses);

  courses.forEach((course) => {
    const match = courseGraph.getCourse(course.code);
    assert.notEqual(match, null);
    assert.equal(Number(course.credits_min), match.credits);
    assert.deepStrictEqual(match.prereqs, course.prerequisite_courses);
  });
});

test('CourseGraph: getDependents() gives all dependents', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses);

  courses.forEach((course) => {
    course.prerequisite_courses.forEach((group) => {
      group.forEach((prereq) => {
        assert.equal(courseGraph.getDependents(prereq).has(course.code), true);
      });
    });
  });
});

test('CourseGraph: modifying the set returned by getDependents() preserves the graph', () => {
  const graph = CourseGraph.fromCatalog([catalogEntry('CSE 200', [['CSE 100']])]);

  graph.getDependents('CSE 100').clear();

  assert.deepStrictEqual(graph.getDependents('CSE 100'), new Set(['CSE 200']));
});

test('CourseGraph: getDependents() returns an empty set for a course not in the graph', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses);
  
  assert.deepStrictEqual([...courseGraph.getDependents('CSE 999')], []);
  assert.equal(courseGraph.has('CSE 999'), false);
});

test('CourseGraph: getDependents() works for a prerequisite outside the catalog', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)

  assert.equal(courseGraph.getDependents('MATH 126').has('CSE 311'), true);
});

test('CourseGraph: prereqsSatisfied() returns correct answer and after change', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses);

  const completed = new Set(['CSE 123', 'MATH 126']);
  assert.equal(courseGraph.prereqsSatisfied('CSE 123', completed), true);
  assert.equal(courseGraph.prereqsSatisfied('CSE 311', completed), true);
  assert.equal(courseGraph.prereqsSatisfied('CSE 312', completed), false);
  completed.add('CSE 311');
  assert.equal(courseGraph.prereqsSatisfied('CSE 312', completed), true);
});

test('CourseGraph: prereqsSatisfied() is false for a course not in the graph', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)

  assert.equal(courseGraph.prereqsSatisfied('CSE 999', new Set(['CSE 123'])), false);
});

test('CourseGraph: prereqsSatisfied() is true with nothing completed when a course has no prerequisites', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)

  assert.equal(courseGraph.prereqsSatisfied('CSE 121', new Set()), true);
});

test('CourseGraph: prereqsSatisfied() needs one course from every group, and any one from each', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)
  
  assert.equal(courseGraph.prereqsSatisfied('CSE 311', new Set(['CSE 123'])), false);
  assert.equal(courseGraph.prereqsSatisfied('CSE 311', new Set(['MATH 126'])), false);
  assert.equal(courseGraph.prereqsSatisfied('CSE 311', new Set(['CSE 143', 'MATH 135'])), true);
});

test('CourseGraph: getEligibleCourses() returns correct answer and after change', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses);

  const completed = new Set(['CSE 123', 'MATH 126']);
  const eligibleCourses = courseGraph.getEligibleCourses(completed);

  courses.forEach((course) => {
    let eligible = true;
    if (!completed.has(course.code)) {
      course.prerequisite_courses.forEach((group) => {
        let hasPrereq = false;
        group.forEach((prereq) => {
          if (completed.has(prereq)) hasPrereq = true;
        });
        if (!hasPrereq) {
          eligible = false;
        }
      });
      assert.equal(eligibleCourses.includes(course.code), eligible && courseGraph.getCourse(course.code)?.schedulable);
    }
  })
});

test('CourseGraph: getEligibleCourses() with nothing completed returns only schedulable courses with no prerequisites', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)

  const eligible = courseGraph.getEligibleCourses(new Set());
  assert.ok(eligible.includes('CSE 121'));
  assert.ok(!eligible.includes('CSE 311')); // has prerequisites
  assert.ok(!eligible.includes('CSE 190')); // no prerequisites, but repeatable/variable credit
  eligible.forEach((code) => {
    assert.equal(courseGraph.getCourse(code).schedulable, true);
    assert.deepStrictEqual(courseGraph.getCourse(code).prereqs, []);
  });
});

test('CourseGraph: getEligibleCourses() leaves out courses that are already completed', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)

  const eligible = courseGraph.getEligibleCourses(new Set(['CSE 121']));
  assert.ok(!eligible.includes('CSE 121'));
});

test('CourseGraph: getEligibleCourses() does not modify the completed set', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)

  const completed = new Set(['CSE 123', 'MATH 126']);
  courseGraph.getEligibleCourses(completed);
  assert.deepStrictEqual([...completed].sort(), ['CSE 123', 'MATH 126']);
});

test('CourseGraph: getEligibleCourses() returns an empty list for an empty graph or one with nothing schedulable', () => {
  assert.deepStrictEqual(CourseGraph.fromCatalog([]).getEligibleCourses(new Set()), []);

  const graph = CourseGraph.fromCatalog([catalogEntry('CSE 100', [], null)]);
  assert.deepStrictEqual(graph.getEligibleCourses(new Set()), []);
});

test('CourseGraph: shortestChainToTarget() finds shortest chain to CSE 403', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)
  
  const { courses: requiredCourses } = courseGraph.shortestChainToTarget('CSE 403', new Set(['CSE 121', 'CSE 122', 'MATH 126']));

  assert.deepStrictEqual([...requiredCourses].sort(), ['CSE 123', 'CSE 311', 'CSE 331', 'CSE 332', 'CSE 403']);
});

test('CourseGraph: changing a record returned by getCourse() leaves the graph intact', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)

  const course = courseGraph.getCourse('CSE 143');
  course.credits = 0;
  course.prereqs[0][0] = 'CSE 101';
  course.prereqs.push(['CSE 102']);

  assert.deepStrictEqual(courseGraph.getCourse('CSE 143'), {
    code: 'CSE 143',
    credits: 5,
    prereqs: [['CSE 142']],
    schedulable: true,
  });
  assert.equal(courseGraph.prereqsSatisfied('CSE 143', new Set(['CSE 142'])), true);
});

test('CourseGraph: getCourse() returns undefined for unknown courses and outside prerequisites', async () => {
  const json = await fs.readFile('./extension/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);
  const courseGraph = CourseGraph.fromCatalog(courses)

  assert.equal(courseGraph.getCourse('CSE 999'), undefined);
  assert.equal(courseGraph.getCourse('MATH 126'), undefined);
  assert.equal(courseGraph.has('MATH 126'), false);
});
