import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { CourseGraph } from '../extension/coursegraph.js';

test('CourseGraph: Test constructor', () => {
  const courseGraph = new CourseGraph();
  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), new Map());
});

test('CourseGraph: Test addCourse', () => {
  const courseGraph = new CourseGraph();
  const map = new Map();

  courseGraph.addCourse('CSE 121');
  map.set('CSE 121', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);

  courseGraph.addCourse('CSE 121');
  map.set('CSE 121', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);
  
  courseGraph.addCourse('CSE 110');
  map.set('CSE 110', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);
});

test('CourseGraph: Test addCourseWithDependent', () => {
  const courseGraph = new CourseGraph();
  const map = new Map();
  
  courseGraph.addCourseWithDependent('CSE 121', 'CSE 122');
  map.set('CSE 121', ['CSE 122']);
  map.set('CSE 122', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 123');
  map.set('CSE 122', ['CSE 123']);
  map.set('CSE 123', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 123');
  map.set('CSE 122', ['CSE 123']);
  map.set('CSE 123', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);

  courseGraph.addCourseWithDependent('CSE 0', 'CSE 123');
  map.set('CSE 0', ['CSE 123']);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 125');
  map.set('CSE 122', ['CSE 123', 'CSE 125']);
  map.set('CSE 125', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);
});

test('CourseGraph: Test deleteCourse', () => {
  const courseGraph = new CourseGraph();
  const map = new Map();
  
  courseGraph.addCourseWithDependent('CSE 121', 'CSE 122');
  map.set('CSE 121', ['CSE 122']);
  map.set('CSE 122', []);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 123');
  map.set('CSE 122', ['CSE 123']);
  map.set('CSE 123', []);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 123');
  map.set('CSE 122', ['CSE 123']);
  map.set('CSE 123', []);

  courseGraph.addCourseWithDependent('CSE 0', 'CSE 123');
  map.set('CSE 0', ['CSE 123']);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 125');
  map.set('CSE 122', ['CSE 123', 'CSE 125']);
  map.set('CSE 125', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);
  courseGraph.deleteCourse('CSE 121');
  map.delete('CSE 121');
  courseGraph.deleteCourse('CSE XYZ');
  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);
});

test('CourseGraph: Test getPossibleCourses', () => {
  const courseGraph = new CourseGraph();
  const map = new Map();
  
  courseGraph.addCourseWithDependent('CSE 121', 'CSE 122');
  map.set('CSE 121', ['CSE 122']);
  map.set('CSE 122', []);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 123');
  map.set('CSE 122', ['CSE 123']);
  map.set('CSE 123', []);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 123');
  map.set('CSE 122', ['CSE 123']);
  map.set('CSE 123', []);

  courseGraph.addCourseWithDependent('CSE 0', 'CSE 123');
  map.set('CSE 0', ['CSE 123']);

  courseGraph.addCourseWithDependent('CSE 122', 'CSE 125');
  map.set('CSE 122', ['CSE 123', 'CSE 125']);
  map.set('CSE 125', []);

  assert.deepStrictEqual(courseGraph.getAdjListForTesting(), map);
  assert.deepStrictEqual(courseGraph.getPossibleCourses(), ['CSE 121', 'CSE 0']);
  courseGraph.deleteCourse('CSE 121');
  assert.deepStrictEqual(courseGraph.getPossibleCourses(), ['CSE 122', 'CSE 0']);
  courseGraph.addCourseWithDependent('CSE 100', 'CSE 122');
  assert.deepStrictEqual(courseGraph.getPossibleCourses(), ['CSE 0', 'CSE 100']);
});

test('CourseGraph: Test with sample data from CSE course listing', async () => {
  const courseGraph = new CourseGraph();
  const json = await fs.readFile('./test/uw_cse_courses.json', 'utf8', async (err, data) => {
    return data;
  });
  const courses = await JSON.parse(json);

  courses.forEach(course => {
    courseGraph.addCourse(course.code);
    course.prerequisite_courses.forEach(prerequisiteEntry => {
      prerequisiteEntry.forEach(prerequisite => {
        courseGraph.addCourseWithDependent(prerequisite, course.code);
      })
    })
  });

  // Example: Courses you have taken
  const taken = ['CSE 121', 'CSE 122', 'CSE 123', 'CSE 311', 'CSE 331', 'CSE 332'];
  taken.forEach((takenCourse) => {
    courseGraph.deleteCourse(takenCourse);
    // Also remove all equivalent courses
    courses.forEach((course) => {
      course.prerequisite_courses.forEach((prerequisiteCourseSet) => {
        if (prerequisiteCourseSet.includes(takenCourse)) {
          prerequisiteCourseSet.forEach((prerequisite) => {
            courseGraph.deleteCourse(prerequisite);
          });
        }
      });
    });
  });

  const possibleCourses = courseGraph.getPossibleCourses();
  // CSE 311 has been taken, and is the only prerequisite for CSE 312
  assert.equal(possibleCourses.includes('CSE 312'), true);
  // CSE 331 and 332 have been taken, and are the only prerequisites for CSE 403
  assert.equal(possibleCourses.includes('CSE 403'), true);
  // CSE 410 requires CSE 373, which has not yet been taken
  assert.equal(possibleCourses.includes('CSE 410'), false);
  // CSE 373 requires either CSE 123 or CSE 143, and CSE 123 has been taken
  assert.equal(possibleCourses.includes('CSE 373'), true);
  // CSE 373 is 'taken'
  courseGraph.deleteCourse('CSE 373');
  // Now that CSE 373 is taken, CSE 410 should be possible to take
  // Call getPossibleCourses again to update the list
  assert.equal(courseGraph.getPossibleCourses().includes('CSE 410'), true);
});