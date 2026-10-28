import assert from 'node:assert/strict';
import test from 'node:test';
import {retrieveFinishedClasses} from '../extension/darsScraper.js'
import {Course} from '../extension/classes.js'

const class1 = new Course("HSTAA 231", "W", "5");
const class2 = new Course("CSE 391", "CSE", "1");
const class3 = new Course("HSTAA 231", "DIV", "5");
test('Empty List of Finished Classes: 0 iterations', () => {
    let empty_list = [];
    let empty_input = [];
    assert.deepStrictEqual(retrieveFinishedClasses(empty_input), empty_list);
  });

test('One Finished Class: 1 iteration', () => {
  let input = [["CSE 391", "CSE", "1"]];
  assert.deepStrictEqual(retrieveFinishedClasses(input), [class2]);
});

test('Two Finished Classes: 2+ iteration', () => {
  let input = [["CSE 391", "CSE", "1"], ["HSTAA 231", "DIV", "5"]];
  assert.deepStrictEqual(retrieveFinishedClasses(input), [class2, class3]);
});

test('Two Finished Classes with one duplicate name (DIV and W): 2+ iterations', () => {
  let input = [["CSE 391", "CSE", "1"], ["HSTAA 231", "DIV", "5"], ["HSTAA 231", "W", "5"]];
  assert.deepStrictEqual(retrieveFinishedClasses(input), [class2, class3, class1]);
});