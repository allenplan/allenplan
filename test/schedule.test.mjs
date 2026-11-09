import assert from 'node:assert/strict';
import test from 'node:test';
import {groupSchedule, isImportedDars, scheduleFromDars, planDarsSchedule, parseDesiredCourses} from '../extension/schedule.mjs';

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

/** Creates a catalog course with optional prerequisites and credits. */
function entry(code, prereqs = [], credits = 4) {
  return {code, title: code, credits_min: credits, credits_max: credits,
    prerequisite_courses: prereqs};
}

const choices = [
  entry('CSE 301'), entry('CSE 302'), entry('CSE 401'), entry('CSE 402'),
  entry('CSE 403', [['CSE 301']]),
];

test('a 4XX slot selects one uncompleted 400-level course', () => {
  const audit = [['CSE 401'], [{name: 'CSE 4XX', credits: 4}]];
  const before = structuredClone(audit);
  const {courses, warnings} = planDarsSchedule(audit, choices);
  assert.deepEqual(courses.map((c) => c.code), ['CSE 402']);
  assert.deepEqual(warnings, []);
  assert.deepEqual(audit, before);
});

test('repeated and overlapping placeholders reserve different courses', () => {
  const {courses, warnings} = planDarsSchedule([[], [
    {name: 'CSE 3XX/4XX'}, {name: 'CSE 4XX'}, {name: 'CSE 4XX'},
  ]], choices);
  assert.equal(courses.length, 3);
  assert.equal(new Set(courses.map((c) => c.code)).size, 3);
  assert.equal(courses.filter((c) => /^CSE 4/.test(c.code)).length, 2);
  assert.deepEqual(warnings, []);
});

test('core slots use the core list and count courses rather than nominal credits', () => {
  const catalog = [entry('CSE 401'), entry('CSE 421', [], 3)];
  const {courses, warnings} = planDarsSchedule([[], [{
    name: 'CSE 4XX', credits: 4, notes: 'https://example.com/#core',
  }]], catalog, [{code: 'CSE 421'}]);
  assert.deepEqual(courses.map((c) => c.code), ['CSE 421']);
  assert.deepEqual(warnings, []);
});

test('CSE category credit totals pool repeated rows without reusing courses', () => {
  const {courses, warnings} = planDarsSchedule([[], [
    {name: 'XXX', courseType: ['CSE'], credits: 1},
    {name: 'XXX', courseType: ['CSE'], credits: 5},
  ]], choices);
  assert.equal(courses.length, 2);
  assert.equal(courses.reduce((sum, c) => sum + c.credits, 0), 8);
  assert.deepEqual(warnings, []);
});

test('exact goals do not also fill additional placeholder slots', () => {
  const {courses} = planDarsSchedule([[], ['CSE 401', 'CSE 4XX']], choices);
  assert.deepEqual(courses.map((c) => c.code), ['CSE 401', 'CSE 402']);
});

test('placeholder goals schedule prerequisite chains in earlier quarters', () => {
  const {courses, warnings} = planDarsSchedule([[], ['CSE 4XX']], [
    entry('CSE 301'), entry('CSE 401', [['CSE 301']]),
  ]);
  assert.deepEqual(courses.map(({code, quarter}) => [code, quarter]), [
    ['CSE 301', 'Autumn'], ['CSE 401', 'Winter'],
  ]);
  assert.deepEqual(warnings, []);
});

test('rejects blocked choices and reports unsupported categories and exhausted slots', () => {
  const {courses, warnings} = planDarsSchedule([[], [
    'CSE 4XX', 'CSE 4XX', {name: 'XXX', courseType: ['A&H'], credits: 5},
  ]], [entry('CSE 401', [['MATH 999']]), entry('CSE 402')]);
  assert.deepEqual(courses.map((c) => c.code), ['CSE 402']);
  assert.equal(warnings.length, 2);
  assert.ok(warnings.some((warning) => warning.includes('A&H')));
  assert.ok(warnings.some((warning) => warning.includes('remaining course slot')));
});

test('quarter course and credit limits still apply and deferred goals are reported', () => {
  const catalog = Array.from({length: 8}, (_, i) => entry(`CSE ${400 + i}`, [], 7));
  const {courses, warnings} = planDarsSchedule([[], Array(8).fill('CSE 4XX')], catalog);
  assert.equal(courses.length, 6);
  for (const quarter of ['Autumn', 'Winter', 'Spring']) {
    assert.equal(courses.filter((c) => c.quarter === quarter).length, 2);
  }
  assert.equal(warnings.length, 2);
});

test('desired course input normalizes, deduplicates and rejects incomplete codes', () => {
  assert.deepEqual(parseDesiredCourses(' cse421, CSE 421;\ncse 451\nE E 469'),
      ['CSE 421', 'CSE 451', 'E E 469']);
  assert.deepEqual(parseDesiredCourses(''), []);
  assert.throws(() => parseDesiredCourses('CSE 4XX'), /Invalid course/);
});

test('all dropdown limits, including zero and four, cap each quarter', () => {
  const catalog = Array.from({length: 12}, (_, i) => entry(`CSE ${400 + i}`));
  const required = catalog.map((course) => course.code);
  for (let maxCourses = 0; maxCourses <= 4; maxCourses++) {
    const {courses} = planDarsSchedule([[], required], catalog, [], {maxCourses});
    for (const quarter of ['Autumn', 'Winter', 'Spring']) {
      assert.equal(courses.filter((course) => course.quarter === quarter).length, maxCourses);
    }
  }
});

test('user desired courses supplement audit goals while retaining prerequisites', () => {
  const {courses, warnings} = planDarsSchedule([[], ['CSE 401']], [
    entry('CSE 301'), entry('CSE 401'), entry('CSE 402', [['CSE 301']]),
  ], [], {maxCourses: 1, desired: ['CSE 402']});
  assert.equal(courses.length, 3);
  const codes = courses.map((course) => course.code);
  assert.ok(codes.includes('CSE 401'));
  assert.ok(codes.indexOf('CSE 301') < codes.indexOf('CSE 402'));
  assert.deepEqual(warnings, []);
});
