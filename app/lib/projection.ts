export type Vector3Data = {
  x: number;
  y: number;
  z: number;
};

export type ProjectionResult =
  | {
      valid: true;
      projectedPoint: Vector3Data;
    }
  | {
      valid: false;
      reason: "invalid-focal-length" | "unstable-depth";
    };

export const PROJECTION_EPSILON = 1e-6;

export function projectPoint(
  worldPoint: Vector3Data,
  focalLength: number,
): ProjectionResult {
  if (!Number.isFinite(focalLength) || focalLength <= PROJECTION_EPSILON) {
    return { valid: false, reason: "invalid-focal-length" };
  }

  const { x: X, y: Y, z: Z } = worldPoint;

  if (
    !Number.isFinite(X) ||
    !Number.isFinite(Y) ||
    !Number.isFinite(Z) ||
    Z >= -PROJECTION_EPSILON
  ) {
    return { valid: false, reason: "unstable-depth" };
  }

  return {
    valid: true,
    projectedPoint: {
      x: (focalLength * X) / Z,
      y: (focalLength * Y) / Z,
      z: focalLength,
    },
  };
}
