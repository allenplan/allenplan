import assert from 'node:assert/strict';
import test from 'node:test';
import {groupSchedule, isImportedDars, scheduleFromDars} from '../extension/schedule.mjs';

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

const catalog = [100, 200, 300].map((number, index) => ({
  code: `CSE ${number}`,
  title: `Course ${number}`,
  credits_min: 4,
  credits_max: 4,
  max_total_credits: null,
  prerequisite_courses: index ? [[`CSE ${number - 100}`]] : [],
}));

test('plans from serialized DARS courses, excluding completed prerequisites', () => {
  const audit = [[{name: ' cse   100 '}], [{name: 'CSE 300'}]];
  const before = structuredClone(audit);
  const courses = scheduleFromDars(audit, catalog);
  assert.deepEqual(courses, [
    {quarter: 'Autumn', code: 'CSE 200', title: 'Course 200', credits: 4},
    {quarter: 'Winter', code: 'CSE 300', title: 'Course 300', credits: 4},
  ]);
  assert.deepEqual(audit, before);
  assert.equal(groupSchedule(courses)[2].courses.length, 0);
});

test('rejects missing or malformed audits but accepts empty course lists', () => {
  for (const audit of [null, undefined, [], {}, [[], null], [[{}], []]]) {
    assert.equal(isImportedDars(audit), false);
    assert.throws(() => scheduleFromDars(audit, catalog), /valid degree audit/);
  }
  assert.equal(isImportedDars([[], []]), true);
  assert.deepEqual(scheduleFromDars([[], []], catalog), []);
});

test('does not recommend completed goals or unrelated courses', () => {
  assert.deepEqual(scheduleFromDars([['CSE 300'], ['CSE 300']], catalog), []);
  assert.deepEqual(scheduleFromDars([[], ['MATH 999']], catalog), []);
});
