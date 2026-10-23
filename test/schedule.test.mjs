import assert from 'node:assert/strict';
import test from 'node:test';
import {groupSchedule} from '../extension/schedule.mjs';

test('always includes the three quarters in academic order', () => {
  assert.deepEqual(groupSchedule([]), [
    {quarter: 'Autumn', courses: []},
    {quarter: 'Winter', courses: []},
    {quarter: 'Spring', courses: []},
  ]);
});

test('groups courses and retains courses with unspecified quarters', () => {
  const courses = [
    Object.freeze({quarter: ' winter ', code: 'CSE 332', credits: 0}),
    {quarter: 'Autumn', name: 'Algorithms'},
    {quarter: 'Summer', title: 'Independent study'},
    {},
  ];
  const groups = groupSchedule(courses);
  assert.equal(groups[0].courses[0].title, 'Algorithms');
  assert.equal(groups[1].courses[0].code, 'CSE 332');
  assert.equal(groups[1].courses[0].credits, '0');
  assert.equal(groups[3].courses.length, 2);
  assert.equal(courses[0].quarter, ' winter ');
});

test('accepts future class instances through a custom adapter', () => {
  class Course {
    /** @return {string} The course label. */
    getLabel() {
      return 'CSE 351';
    }
  }
  const groups = groupSchedule([new Course()], (course) => ({
    quarter: 'Spring', code: course.getLabel(), credits: 4,
  }));
  assert.deepEqual(groups[2].courses, [
    {code: 'CSE 351', title: '', credits: '4'},
  ]);
});
