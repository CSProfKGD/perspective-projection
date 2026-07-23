import assert from "node:assert/strict";
import test from "node:test";
import {
  DISSOLVE_DURATION_MS,
  dissolveValue,
} from "../app/lib/dissolve.ts";

test("dissolve interpolation reaches both endpoints", () => {
  assert.equal(dissolveValue(1, 0, 0), 1);
  assert.equal(
    dissolveValue(1, 0, DISSOLVE_DURATION_MS),
    0,
  );
  assert.equal(dissolveValue(0, 1, DISSOLVE_DURATION_MS * 2), 1);
});

test("reduced-motion dissolve resolves immediately", () => {
  assert.equal(dissolveValue(1, 0, 0, 0), 0);
});
