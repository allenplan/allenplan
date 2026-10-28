import assert from 'node:assert/strict';
import test from 'node:test';
import {CourseOffering} from '../extension/classes.js'
import {retrieveOfferingsFromList} from '../extension/courseOfferingsScraper.js'

// Course Offering Test Classes //
const expected_CourseOffering1 = 
      new CourseOffering("CSE 121", "Found 121",
                         "First Class", "LC",
                         "4-4", "MWF", "1230-120");
const expected_CourseOffering2 = 
      new CourseOffering("CSE 121", "Found 121",
                         "N/A", "QZ",
                         "N/A", "TTh", "130-220");
const expected_CourseOffering3 = 
      new CourseOffering("CSE 311", "Foundations of Computing 1",
                         "Come learn theory please.", "LC",
                         "4-4", "MWThF", "100-210");
const expected_CourseOffering4 = 
      new CourseOffering("CSE 311", "Foundations of Computing 1",
                         "N/A", "QZ",
                         "N/A", "T", "830-920");
// Start of tests //
test('Empty List: 0 iterations/edge case', () => {
    const empty_array = [];
    const empty_input = [];
    assert.deepStrictEqual(retrieveOfferingsFromList(empty_input), empty_array);
});

test('Return list with one CourseOffering: 1 iteration', () => {
  const lecture_offering = ["CSE 121", "Found 121",
                          "First Class", "LC",
                          "4-4", "MWF", "1230-120"];
  assert.deepStrictEqual(retrieveOfferingsFromList([lecture_offering]), [expected_CourseOffering1]);
  
});

test('Return list with two CourseOfferings: 2+ iterations with one course', () => {
  const lecture_offering = ["CSE 121", "Found 121",
                          "First Class", "LC",
                          "4-4", "MWF", "1230-120"];
  const quiz_offering = ["CSE 121", "Found 121",
                         "N/A", "QZ",
                         "N/A", "TTh", "130-220"];
  const expected_return = [expected_CourseOffering1, expected_CourseOffering2];
  assert.deepStrictEqual(retrieveOfferingsFromList([lecture_offering, quiz_offering]), expected_return);
  
});

test('Return list with two CourseOfferings: 2+ iterations with two courses', () => {
  const lecture_offering1 = ["CSE 121", "Found 121",
                          "First Class", "LC",
                          "4-4", "MWF", "1230-120"];
  const quiz_offering1 = ["CSE 121", "Found 121",
                         "N/A", "QZ",
                         "N/A", "TTh", "130-220"];
  const lecture_offering2 = ["CSE 311", "Foundations of Computing 1",
                          "Come learn theory please.", "LC",
                          "4-4", "MWThF", "100-210"];
  const quiz_offering2 = ["CSE 311", "Foundations of Computing 1",
                         "N/A", "QZ",
                         "N/A", "T", "830-920"];
  const expected_return = [expected_CourseOffering1, expected_CourseOffering2,expected_CourseOffering3,expected_CourseOffering4];
  assert.deepStrictEqual(retrieveOfferingsFromList([lecture_offering1, quiz_offering1, lecture_offering2,quiz_offering2]), expected_return);
  
});