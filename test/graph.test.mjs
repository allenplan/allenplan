import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { CourseGraph } from '../extension/coursegraph.js';

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

test('CourseGraph: addCourse() adds and update courses correctly', () => {
  const courseGraph = new CourseGraph();
  courseGraph.addCourse('CSE 121');
  assert.deepStrictEqual(courseGraph.getCourse('CSE 121'), { code: 'CSE 121', credits: 0, prereqs: [], schedulable: false });
  courseGraph.addCourse('CSE 121', { credits: 4, prereqs: [['CSE 123']], schedulable: true });
  assert.deepStrictEqual(courseGraph.getCourse('CSE 121'), { code: 'CSE 121', credits: 4, prereqs: [['CSE 123']], schedulable: true });
  courseGraph.addCourse('CSE 122');
  assert.deepStrictEqual(courseGraph.getCourse('CSE 122'), { code: 'CSE 122', credits: 0, prereqs: [], schedulable: false });
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

  courseGraph.addCourse('CSE 121', { credits: 400, prereqs: [['CSE 100']], schedulable: true });
  assert.equal(courseGraph.has('CSE 121'), true);
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
    if (match.prereqs === undefined) {
      assert.deepStrictEqual(match.prerequisite_courses, []);
    } else {
      assert.deepStrictEqual(course.prereqs, match.prerequisite_courses);
    }
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

test('CourseGraph: requiredFor() finds shortest chain to CSE 403', async () => {
  const catalog = JSON.parse(await fs.readFile(new URL('../extension/uw_cse_courses.json', import.meta.url), 'utf8'));
  const graph = CourseGraph.fromCatalog(catalog);

  const { courses } = graph.requiredFor('CSE 403', new Set(['CSE 121', 'CSE 122', 'MATH 126']));

  assert.deepStrictEqual([...courses].sort(), ['CSE 123', 'CSE 311', 'CSE 331', 'CSE 332', 'CSE 403']);
});