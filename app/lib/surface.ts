import type { Vector3Data } from "./projection";

export type SurfaceAngles = {
  azimuth: number;
  elevation: number;
};

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export function pointOnSphere(
  centre: Vector3Data,
  radius: number,
  angles: SurfaceAngles,
): Vector3Data {
  const azimuth = angles.azimuth * DEGREES_TO_RADIANS;
  const elevation = angles.elevation * DEGREES_TO_RADIANS;
  const horizontalRadius = radius * Math.cos(elevation);

  return {
    x: centre.x + horizontalRadius * Math.cos(azimuth),
    y: centre.y + radius * Math.sin(elevation),
    z: centre.z + horizontalRadius * Math.sin(azimuth),
  };
}

export function anglesOnSphere(
  point: Vector3Data,
  centre: Vector3Data,
): SurfaceAngles {
  const x = point.x - centre.x;
  const y = point.y - centre.y;
  const z = point.z - centre.z;
  const radius = Math.hypot(x, y, z);

  if (radius === 0) {
    return { azimuth: 0, elevation: 0 };
  }

  return {
    azimuth: Math.atan2(z, x) * RADIANS_TO_DEGREES,
    elevation: Math.asin(y / radius) * RADIANS_TO_DEGREES,
  };
}
