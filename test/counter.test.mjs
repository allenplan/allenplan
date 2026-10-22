import assert from 'node:assert/strict';
import test from 'node:test';
import { nextCount } from '../extension/counter.mjs';

test('increments the count', () => {
  assert.equal(nextCount(0), 1);
  assert.equal(nextCount(nextCount(0)), 2);
});
