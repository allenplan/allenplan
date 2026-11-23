import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { CourseGraph } from '../extension/course-graph.js';
import { ScheduleCalculator } from '../extension/schedule-calculator.js';

/** Builds Data Science scheduling inputs from the combined CSE and CSE D catalogs. */
async function loadDataScienceSchedulingInputs() {
  const [cseJson, csedJson, cseCoreJson, cseFundamentalJson, csedFundamentalJson] = await Promise.all([
    fs.readFile('./extension/uw_cse_courses.json', 'utf8'),
    fs.readFile('./extension/uw_csed_courses.json', 'utf8'),
    fs.readFile('./extension/uw_cse_core_courses.json', 'utf8'),
    fs.readFile('./extension/uw_cse_fundamental_courses.json', 'utf8'),
    fs.readFile('./extension/uw_csed_fundamental_courses.json', 'utf8'),
  ]);
  const catalog = [...JSON.parse(cseJson), ...JSON.parse(csedJson)];
  const fundamentalCourses = [...JSON.parse(cseFundamentalJson), ...JSON.parse(csedFundamentalJson)];
  const fundamental = new Set(fundamentalCourses.map((course) => course.code));
  const core = new Set(JSON.parse(cseCoreJson).map((course) => course.code));
  return { graph: CourseGraph.fromCatalog(catalog), fundamental, core };
}

test('Data Science ScheduleCalculator: scoreEligible() scores eligible fundamental courses', async () => {
  const { graph, fundamental } = await loadDataScienceSchedulingInputs();
  const completed = new Set(['CSE 312', 'CSE 332', 'CSE 344', 'MATH 208']);
  const scores = ScheduleCalculator.scoreEligible(graph, completed, {
    desired: [],
    fundamental,
    core: new Set(),
  });

  for (const code of ['CSE 421', 'CSE 442', 'CSE 444', 'CSE 446']) {
    assert.equal(scores.get(code), 2);
  }
  assert.equal(fundamental.has('SOC 225'), true);
  assert.equal(scores.has('SOC 225'), false); // Variable-credit non-CSE courses are not schedulable.
});

test('Data Science ScheduleCalculator: planQuarters() prioritizes a fundamental over core courses', async () => {
  const { graph, fundamental, core } = await loadDataScienceSchedulingInputs();
  const [quarter] = ScheduleCalculator.planQuarters(
    graph,
    ['CSE 312', 'CSE 332', 'CSE 344', 'MATH 208', 'CSE 421', 'CSE 442', 'CSE 444'],
    ['Q1'],
    {
      desired: [],
      fundamental,
      core,
      maxCourses: 1,
    },
  );

  assert.deepStrictEqual(quarter.courses, ['CSE 446']);
  assert.equal(quarter.credits, 4);
});

test('Data Science ScheduleCalculator: planQuarters() schedules a desired fundamental course', async () => {
  const { graph, fundamental, core } = await loadDataScienceSchedulingInputs();
  const [quarter] = ScheduleCalculator.planQuarters(
    graph,
    ['CSE 332', 'CSE 344'],
    ['Q1'],
    {
      desired: ['CSE 444'],
      fundamental,
      core,
      maxCourses: 1,
    },
  );

  assert.deepStrictEqual(quarter.courses, ['CSE 444']);
  assert.equal(quarter.credits, 4);
});
