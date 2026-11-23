import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { CourseGraph } from '../extension/course-graph.js';
import { ScheduleCalculator } from '../extension/schedule-calculator.js';

/** Catalog entry for focused CE scheduling tests. */
function entry(code, prerequisite_courses = [], credits = 4) {
  return { code, credits_min: credits, credits_max: credits, max_total_credits: null, prerequisite_courses };
}

/** Builds CE scheduling inputs from the combined CSE and E E catalogs. */
async function loadComputerEngineeringSchedulingInputs() {
  const [cseJson, eeJson, fundamentalJson, coreJson] = await Promise.all([
    fs.readFile('./extension/uw_cse_courses.json', 'utf8'),
    fs.readFile('./extension/uw_ee_courses.json', 'utf8'),
    fs.readFile('./extension/uw_ce_fundamental_courses.json', 'utf8'),
    fs.readFile('./extension/uw_ce_core_courses.json', 'utf8'),
  ]);
  const catalog = [...JSON.parse(cseJson), ...JSON.parse(eeJson)];
  const fundamental = new Set(JSON.parse(fundamentalJson).map((course) => course.code));
  const core = new Set(JSON.parse(coreJson).map((course) => course.code));
  return { graph: CourseGraph.fromCatalog(catalog), fundamental, core };
}

test('CE ScheduleCalculator: scoreEligible() weights fundamental courses above core courses', async () => {
  const { graph, fundamental, core } = await loadComputerEngineeringSchedulingInputs();
  const completed = new Set(['CSE 123', 'CSE 311', 'CSE 331', 'CSE 332', 'CSE 344', 'CSE 351']);
  const scores = ScheduleCalculator.scoreEligible(graph, completed, {
    desired: [],
    fundamental,
    core,
  });

  assert.equal(scores.get('CSE 312'), 2);
  assert.equal(scores.get('CSE 369'), 2);
  assert.equal(scores.get('CSE 403'), 1);
  assert.equal(scores.get('CSE 444'), 1);
  assert.equal(scores.get('CSE 484'), 1);
});

test('CE ScheduleCalculator: planQuarters() selects an eligible fundamental before a core course', async () => {
  const { graph, fundamental, core } = await loadComputerEngineeringSchedulingInputs();
  const [quarter] = ScheduleCalculator.planQuarters(
    graph,
    ['CSE 123', 'CSE 311', 'CSE 331', 'CSE 332', 'CSE 344', 'CSE 351'],
    ['Q1'],
    {
      desired: [],
      fundamental,
      core,
      computerEngineering: true,
      maxCourses: 1,
    },
  );

  assert.deepStrictEqual(quarter.courses, ['CSE 312']);
});

test('CE ScheduleCalculator: planQuarters() schedules CSE 484 after its fundamental prerequisites', async () => {
  const { graph } = await loadComputerEngineeringSchedulingInputs();
  const plan = ScheduleCalculator.planQuarters(
    graph,
    ['CSE 123', 'CSE 311'],
    ['Q1', 'Q2'],
    {
      desired: ['CSE 484'],
      fundamental: new Set(),
      core: new Set(),
      computerEngineering: true,
      maxCourses: 2,
    },
  );

  assert.deepStrictEqual(plan.map((quarter) => quarter.courses), [
    ['CSE 332', 'CSE 351'],
    ['CSE 484'],
  ]);
});

test('CE ScheduleCalculator: CE mode suppresses alternatives to a completed core requirement', async () => {
  const { graph } = await loadComputerEngineeringSchedulingInputs();
  const completed = ['CSE 123', 'CSE 311', 'CSE 332', 'CSE 351', 'CSE 403'];
  const options = {
    desired: ['CSE 484'],
    fundamental: new Set(),
    core: new Set(),
    maxCourses: 1,
  };

  const [defaultQuarter] = ScheduleCalculator.planQuarters(graph, completed, ['Q1'], options);
  assert.deepStrictEqual(defaultQuarter.courses, ['CSE 484']);

  const [ceQuarter] = ScheduleCalculator.planQuarters(graph, completed, ['Q1'], {
    ...options,
    computerEngineering: true,
  });
  assert.deepStrictEqual(ceQuarter.courses, []);
});

test('CE ScheduleCalculator: planQuarters() only treats CE alternatives as completed in CE mode', () => {
  const coreAlternatives = ['CSE 403', 'CSE 474', 'E E 474', 'CSE 480', 'CSE 484'];
  const graph = CourseGraph.fromCatalog([
    entry('CSE 371'),
    entry('CSE 400', [['E E 205']]),
    entry('CSE 401', [['E E 215']]),
    ...coreAlternatives.filter((code) => code.startsWith('CSE ')).map((code) => entry(code)),
  ]);

  const defaultPlan = ScheduleCalculator.planQuarters(graph, ['E E 371'], ['Q1'], {
    desired: ['CSE 371'],
  });
  assert.deepStrictEqual(defaultPlan[0].courses, ['CSE 371']);

  const crossListed = ScheduleCalculator.planQuarters(graph, ['E E 371'], ['Q1'], {
    desired: ['CSE 371'],
    computerEngineering: true,
  });
  assert.deepStrictEqual(crossListed[0].courses, []);

  const alternatives = ScheduleCalculator.planQuarters(graph, ['E E 205'], ['Q1'], {
    desired: ['CSE 401'],
    computerEngineering: true,
  });
  assert.deepStrictEqual(alternatives[0].courses, ['CSE 401']);

  const reverseAlternatives = ScheduleCalculator.planQuarters(graph, ['E E 215'], ['Q1'], {
    desired: ['CSE 400'],
    computerEngineering: true,
  });
  assert.deepStrictEqual(reverseAlternatives[0].courses, ['CSE 400']);

  for (const completed of coreAlternatives) {
    const remaining = coreAlternatives.filter((code) => code.startsWith('CSE ') && code !== completed);
    const plan = ScheduleCalculator.planQuarters(graph, [completed], ['Q1'], {
      desired: remaining,
      computerEngineering: true,
    });
    assert.deepStrictEqual(plan[0].courses, []);
  }
});
