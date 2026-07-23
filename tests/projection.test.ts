import assert from "node:assert/strict";
import test from "node:test";
import { projectPoint } from "../app/lib/projection.ts";
import { anglesOnSphere, pointOnSphere } from "../app/lib/surface.ts";

const EPSILON = 1e-10;

test("projects a visible point onto the physical image plane", () => {
  const point = { x: 2, y: -1, z: -8 };
  const focalLength = 2;
  const result = projectPoint(point, focalLength);

  assert.equal(result.valid, true);
  if (!result.valid) return;

  assert.deepEqual(result.projectedPoint, {
    x: -0.5,
    y: 0.25,
    z: 2,
  });
});

test("keeps the world point, centre, and projection collinear", () => {
  const point = { x: -1.75, y: 0.9, z: -6.2 };
  const result = projectPoint(point, 2.4);

  assert.equal(result.valid, true);
  if (!result.valid) return;

  const scale = result.projectedPoint.z / point.z;
  assert.ok(Math.abs(result.projectedPoint.x - scale * point.x) < EPSILON);
  assert.ok(Math.abs(result.projectedPoint.y - scale * point.y) < EPSILON);
});

test("rejects zero or behind-camera depth and non-positive focal length", () => {
  assert.equal(projectPoint({ x: 1, y: 1, z: 0 }, 2).valid, false);
  assert.equal(projectPoint({ x: 1, y: 1, z: 1 }, 2).valid, false);
  assert.equal(projectPoint({ x: 1, y: 1, z: -4 }, 0).valid, false);
});

test("keeps the draggable point on the scene-object surface", () => {
  const centre = { x: 1.8, y: 0.2, z: -6.6 };
  const radius = 1.35;
  const point = pointOnSphere(centre, radius, {
    azimuth: 137,
    elevation: -24,
  });
  const distance = Math.hypot(
    point.x - centre.x,
    point.y - centre.y,
    point.z - centre.z,
  );

  assert.ok(Math.abs(distance - radius) < EPSILON);
  const recovered = anglesOnSphere(point, centre);
  assert.ok(Math.abs(recovered.azimuth - 137) < EPSILON);
  assert.ok(Math.abs(recovered.elevation + 24) < EPSILON);
});
