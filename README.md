# Perspective Projection

An interactive 3D visualization of pinhole-camera perspective projection. The
scene uses a physical image plane behind the camera centre, so visible points
with \(Z<0\) project to

\[
x=f\frac{X}{Z},
\qquad
y=f\frac{Y}{Z}.
\]

## Interactions

- Drag the yellow point, \(P\), to move it across the blue object's surface.
- Drag the blue object to translate it while carrying \(P\).
- Shift-drag the blue object to move it in depth.
- Drag empty scene space to orbit and scroll to zoom.
- Use the focal-length slider for precise or keyboard-accessible focal control.
- Toggle axes, labels, and the sightline or switch between dark and light
  themes.

## Development

The application uses vinext, React, TypeScript, and direct Three.js APIs.

```bash
pnpm install
pnpm run dev
pnpm test
pnpm run lint
```

See `CONTEXT.md` for the product and mathematical model, and `AGENTS.md` for
repository-wide implementation rules.
