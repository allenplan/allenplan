import assert from 'node:assert/strict';
import test from 'node:test';
import { CourseGraph } from '../extension/course-graph.js';
import { ScheduleCalculator } from '../extension/schedule-calculator.js';

/** Catalog entry in the same shape as uw_cse_courses.json. */
function entry(code, prerequisite_courses = [], credits = 4) {
  return { code, credits_min: credits, credits_max: credits, max_total_credits: null, prerequisite_courses };
}

// CSE 100 -> CSE 200 -> CSE 300 is a chain; CSE 150 is unrelated.
const catalog = [
  entry('CSE 100'),
  entry('CSE 150'),
  entry('CSE 200', [['CSE 100']]),
  entry('CSE 300', [['CSE 200']]),
];
const goals = { desired: ['CSE 300'], fundamental: new Set(), core: new Set() };

// ---------- scoreEligible ----------

test('ScheduleCalculator: scoreEligible() only scores eligible courses', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const scores = ScheduleCalculator.scoreEligible(graph, new Set(), goals);
  assert.deepStrictEqual([...scores.keys()].sort(), ['CSE 100', 'CSE 150']);
});

test('ScheduleCalculator: scoreEligible() applies correct scores to different course types', () => {
  const graph = CourseGraph.fromCatalog(catalog);
 
  // Prereq of desired course adds 10 plus chain length
  const early = ScheduleCalculator.scoreEligible(graph, new Set(), goals);
  assert.equal(early.get('CSE 100'), 13); // 10 + chain of 3 (100 -> 200 -> 300)
  assert.equal(early.get('CSE 150'), 0);
 
  // Desired courses add 100
  const late = ScheduleCalculator.scoreEligible(graph, new Set(['CSE 100', 'CSE 200']), goals);
  assert.equal(late.get('CSE 300'), 100);
 
  // Fundamental and core courses each add 1
  const bonus = ScheduleCalculator.scoreEligible(graph, new Set(), {
    desired: ['CSE 300'],
    fundamental: new Set(['CSE 150']),
    core: new Set(['CSE 150']),
  });
  assert.equal(bonus.get('CSE 150'), 2);
});

const scores = new Map([
  ['CSE 100', 5],
  ['CSE 150', 3],
  ['CSE 200', 9],
  ['CSE 300', 0],
]);

test('ScheduleCalculator: bestSchedule() picks the highest-scoring courses up to maxCourses', () => {
  const { courses, score } = ScheduleCalculator.bestSchedule(scores, { maxCourses: 2 });
  assert.deepStrictEqual(courses.sort(), ['CSE 100', 'CSE 200']);
  assert.equal(score, 14);
});

test('ScheduleCalculator: bestSchedule() respects the credit cap', () => {
  const credits = () => 4;
  const { courses } = ScheduleCalculator.bestSchedule(scores, { maxCourses: 3, maxCredits: 8, credits });
  assert.equal(courses.length, 2);
});

test('ScheduleCalculator: bestSchedule() skips conflicting courses', () => {
  const conflicts = (a, b) => [a, b].includes('CSE 200') && [a, b].includes('CSE 100');
  const { courses } = ScheduleCalculator.bestSchedule(scores, { maxCourses: 2, conflicts });
  assert.deepStrictEqual(courses.sort(), ['CSE 150', 'CSE 200']); // 200 + 150 beats 100 + 150
});

test('ScheduleCalculator: bestSchedule() pads schedule with zero-score courses when includeZeroScore is set', () => {
  const { courses } = ScheduleCalculator.bestSchedule(scores, { maxCourses: 4, includeZeroScore: true });
  assert.ok(courses.includes('CSE 300'));
});

test('ScheduleCalculator: planQuarters() courses unlock future courses', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const plan = ScheduleCalculator.planQuarters(graph, [], ['Q1', 'Q2', 'Q3'], { ...goals, maxCourses: 1 });
  assert.deepStrictEqual(plan.map((q) => q.courses), [['CSE 100'], ['CSE 200'], ['CSE 300']]);
});

test('ScheduleCalculator: planQuarters() does not repeat courses', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const plan = ScheduleCalculator.planQuarters(graph, ['CSE 100'], ['Q1', 'Q2'], { ...goals, maxCourses: 1 });
  const all = plan.flatMap((q) => q.courses);
  assert.ok(!all.includes('CSE 100'));
  assert.equal(new Set(all).size, all.length);
});