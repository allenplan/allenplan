import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { CourseGraph } from '../extension/course-graph.js';
import { ScheduleCalculator, splitGenEdRequirements } from '../extension/schedule-calculator.js';
import { resolveRequirements } from '../extension/requirement-resolver.js';

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

test('ScheduleCalculator: splitGenEdRequirements() does not modify the requirements it is given', () => {
  const requirements = ['CSE 403', { name: 'XXX', courseType: ['A&H', 'SSc'], credits: 10 }];
  const copy = structuredClone(requirements);
  splitGenEdRequirements(requirements);
  assert.deepStrictEqual(requirements, copy);
});

test('ScheduleCalculator: planQuarters() does not use up the remainingGenEds rows, so the same rows can plan again', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const remainingGenEds = [{ courseType: ['W'], credits: 10 }];
  const options = { ...goals, remainingGenEds, maxTotalCourses: 2 };
  const first = ScheduleCalculator.planQuarters(graph, [], ['Q1', 'Q2', 'Q3'], options);
  const second = ScheduleCalculator.planQuarters(graph, [], ['Q1', 'Q2', 'Q3'], options);
  assert.deepStrictEqual(second, first);
  assert.deepStrictEqual(remainingGenEds, [{ courseType: ['W'], credits: 10 }]);
});

test('ScheduleCalculator: planQuarters() adds no placeholders when the CSE courses already fill the credit limit', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const [first] = ScheduleCalculator.planQuarters(graph, [], ['Q1'], {
    ...goals,
    remainingGenEds: [{ courseType: ['W'], credits: 10 }],
    maxTotalCredits: 4, // CSE 100 is 4 credits, so nothing is left
  });
  assert.deepStrictEqual(first.courses, ['CSE 100']);
  assert.deepStrictEqual(first.placeholders, []);
});

test('ScheduleCalculator: rows the splitter keeps still get the resolver\'s own warnings', async () => {
  const realCatalog = JSON.parse(await fs.readFile('./extension/uw_cse_courses.json', 'utf8'));
  const graph = CourseGraph.fromCatalog(realCatalog);
  const { resolverRequirements } = splitGenEdRequirements([
    { name: 'XXX', courseType: 'W', credits: 10 }, // handled by placeholders, so no warning
    'ENGL 131', // a specific non-CSE course is not in the planning catalog
  ]);
  const { warnings } = resolveRequirements(resolverRequirements, new Set(), graph, realCatalog, []);
  assert.deepStrictEqual(warnings, ['ENGL 131: this course is not supported by the planning catalog.']);
});

test('ScheduleCalculator: planQuarters() adds placeholders for remainingGenEds', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const [first] = ScheduleCalculator.planQuarters(graph, [], ['Q1'], {
    ...goals,
    remainingGenEds: [{ courseType: ['W'], credits: 10 }],
  });
  assert.deepStrictEqual(first.courses, ['CSE 100']);
  assert.ok(first.placeholders.length > 0);
  assert.deepStrictEqual(first.placeholders[0], { type: 'W', label: 'Writing placeholder', credits: 5 });
  assert.equal(first.totalCourses, first.courses.length + first.placeholders.length);
  assert.equal(first.totalCredits, first.credits + 5 * first.placeholders.length);
});

test('ScheduleCalculator: planQuarters() adds placeholders for takenGenEds using the default requirements', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  // Nothing taken, so every requirement is still needed. CSE 100 (4 cr) leaves room for two 5-credit
  // placeholders under the default 18-credit limit.
  const [first] = ScheduleCalculator.planQuarters(graph, [], ['Q1'], { ...goals, takenGenEds: [] });
  assert.deepStrictEqual(first.placeholders.map((p) => p.type), ['A&H', 'SSc']);
});

test('ScheduleCalculator: planQuarters() adds no placeholders when every requirement is already met', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const takenGenEds = [
    ['ENGL 131', 'ENGL', 5],
    ['MATH 126', 'RSN', 5],
    ['ENGL 281', 'W', 10],
    ['ART 101', 'A&H', 20],
    ['SOC 110', 'SSc', 20],
    ['BIOL 180', 'NSc', 20],
    ['ANY 100', 'AOI', 15],
    ['DIV 100', 'DIV', 5],
  ];
  const plan = ScheduleCalculator.planQuarters(graph, [], ['Q1', 'Q2'], { ...goals, takenGenEds });
  assert.ok(plan.every((q) => q.placeholders.length === 0));
});

test('ScheduleCalculator: planQuarters() adds no placeholders field unless gen eds are given', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const [first] = ScheduleCalculator.planQuarters(graph, [], ['Q1'], goals);
  assert.equal('placeholders' in first, false);
});

test('ScheduleCalculator: planQuarters() keeps adding placeholders in later quarters until the credits are placed', () => {
  const graph = CourseGraph.fromCatalog(catalog);
  const plan = ScheduleCalculator.planQuarters(graph, [], ['Q1', 'Q2', 'Q3', 'Q4'], {
    ...goals,
    remainingGenEds: [{ courseType: ['W'], credits: 10 }],
    maxTotalCourses: 2,
  });
  const quartersWithPlaceholders = plan.filter((q) => q.placeholders.length > 0).length;
  const placed = plan.flatMap((q) => q.placeholders).reduce((sum, p) => sum + p.credits, 0);
  assert.equal(quartersWithPlaceholders, 2); // one 5-credit placeholder in each of two quarters
  assert.equal(placed, 10);
});
