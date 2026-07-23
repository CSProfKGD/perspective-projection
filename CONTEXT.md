# Perspective Projection Visualization

## Purpose

Build an interactive, student-facing demonstration of perspective projection through a pinhole camera. The experience should connect a world point, \(\mathbf{P}=(X,Y,Z)\), the camera centre, \(o\), focal length, \(f\), the physical image plane, and the projected point, \(\mathbf{p}=(x,y,f)\), through direct manipulation.

The supplied diagram is the conceptual and visual starting point. The application should translate its construction into a clear, true 3D scene rather than reproduce the screenshot pixel for pixel.

The intended audience is senior undergraduate computer science students who know introductory linear algebra but may not yet have a reliable geometric intuition for camera projection.

## First-Milestone Experience

The scene contains:

- One fixed mathematical pinhole camera centred at \(o\), with visible camera-space axes and an identified optical axis.
- A physical image plane behind the camera centre.
- A draggable world point, \(\mathbf{P}=(X,Y,Z)\), constrained to the surface of a fixed blue scene object in front of the camera.
- The projected point, \(\mathbf{p}=(x,y,f)\), on the physical image plane.
- One continuous projection line spanning \(\mathbf{P}\), \(o\), and \(\mathbf{p}\).
- A visible focal-length interval from the camera centre to the image plane.
- Concise mathematical labels and live coordinate values for the important objects.
- A restrained blue spherical scene object whose surface contains \(\mathbf{P}\). The object constrains point manipulation but does not otherwise participate in the projection calculation.

The initial view shows the complete construction from an oblique angle so that the world point, camera centre, image plane, optical axis, and image inversion are all visible. The 3D scene remains the dominant surface.

The user can:

- Orbit, pan, and zoom the observer view without changing the mathematical camera.
- Drag \(\mathbf{P}\) across the blue object's surface; ray-surface intersection keeps it on the object while all dependent geometry and live values update continuously.
- Drag the blue object itself to translate it through 3D while carrying \(\mathbf{P}\) with it. Shift-drag controls depth, and object-coordinate controls provide the keyboard-accessible equivalent.
- Adjust the positive focal length, \(f\), and see the image plane and projection move consistently.
- Toggle logical groups such as axes, projection geometry, and labels.
- Switch between the dark default and an accessible light theme.

Desktop pointer interaction is primary, but the experience must remain operable with touch, keyboard-accessible through its essential controls, and usable on narrow screens.

## Coordinate Convention and Projection

Use one camera-space convention throughout the project:

- The camera centre, \(o\), is the origin.
- The camera looks along the negative \(Z\)-axis.
- A visible scene point, \(\mathbf{P}=(X,Y,Z)\), satisfies \(Z<0\).
- The focal length satisfies \(f>0\).
- The physical image plane lies behind the camera centre at \(Z=f\).
- The \(X\)- and \(Y\)-axes span the image plane.

The line through \(\mathbf{P}\) and \(o\), extended behind the camera centre, intersects the physical image plane at

\[
\mathbf{p}=(x,y,f),
\qquad
x=f\frac{X}{Z},
\qquad
y=f\frac{Y}{Z}.
\]

Since \(Z<0\), the physical image reverses the signs of the transverse coordinates: a world point with positive \(X\) projects to negative \(x\), and likewise for \(Y\). The visualization should make this inversion legible rather than silently adopting a virtual image plane in front of the camera.

The green construction should be described in code and UI as a projection line or sightline when referring to the full \(\mathbf{P}\)-\(o\)-\(\mathbf{p}\) span. A ray cast from \(o\) toward the visible point alone does not reach the physical image plane behind the camera and must not be used as the complete construction.

## Mathematical State and Invariants

The mathematical camera and world point are the only canonical geometric state. The image plane, projection point, projection line, coordinate readouts, and displayed measurements are derived from that state on every update.

The implementation should preserve a renderer-independent boundary equivalent to:

```ts
type SceneState = {
  camera: {
    focalLength: number;
  };
  worldPoint: Vector3Data;
};

type DerivedGeometry = {
  imagePlane: PlaneData;
  projectedPoint: Vector3Data;
  projectionLine: LineData;
  valid: boolean;
};
```

These are conceptual contracts, not a frozen public API. Exact names and supporting metadata may evolve, but mathematical calculation must not depend on Three.js scene objects or UI components.

The following invariants must hold for every valid state:

- The projected point lies on the physical image plane: \(p_z=f\).
- \(\mathbf{P}\), \(o\), and \(\mathbf{p}\) are collinear.
- \(\mathbf{P}\) remains on the fixed blue object's surface during pointer and keyboard manipulation.
- The displayed \(x\) and \(y\) values agree with \(fX/Z\) and \(fY/Z\) within the documented numerical tolerance.
- Moving \(\mathbf{P}\) or changing \(f\) recomputes all derived geometry in the same interaction cycle.
- Observer navigation, visibility, labels, theme, and other presentation preferences never change the mathematical projection.

The first milestone keeps \(\mathbf{P}\) in the visible half-space and \(f\) in a positive, bounded range. Zero or near-zero depth must not produce `NaN`, infinity, flicker, huge unstable geometry, or stale values. An unstable projection is explicitly invalid; affected rendered elements are hidden and the accessible status explains that the projection is unavailable.

## Visual Direction

- Use a visually quiet black or near-black background by default, with an optional accessible light theme.
- Draw axes, the optical axis, image-plane outlines, brackets, and mathematical labels primarily in white in dark mode and deep charcoal in light mode.
- Use green for the projection line, matching the reference diagram.
- Use a restrained warm yellow for \(\mathbf{P}\) and \(\mathbf{p}\), differentiating them through position and labels as well as colour.
- Use blue for the contextual scene surface near \(\mathbf{P}\). Keep it subordinate to the projection construction.
- Render the physical image plane as a smooth, semi-transparent neutral surface with clearly visible centre axes.
- Keep the focal-length marker and interval visually tied to \(f\) without turning it into a large control overlay.
- Typeset variables in standard mathematical notation, including italic variables and bold vector names where explanatory text distinguishes vectors.
- Keep labels readable against surfaces and prevent avoidable overlap while the observer camera moves.
- Preserve depth cues with opacity, line weight, depth ordering, and restrained lighting. Avoid decorative textures, heavy panels, excessive glow, or gratuitous colour.
- Use short easing only where it clarifies a state change, such as a projection updating after a focal-length adjustment. Do not add perpetual motion.
- Respect reduced-motion preferences by making nonessential transitions effectively immediate.

The light theme should preserve the same semantic colour roles and adequate contrast rather than reinterpret the scene with a new palette.

## Interaction Requirements

- The observer camera is an inspection tool only. Orbiting, panning, or zooming it must never alter the pinhole camera or projection.
- Dragging \(\mathbf{P}\) temporarily owns the pointer until release or cancellation so that the scene cannot orbit accidentally during the same gesture.
- Dragging the blue object translates it in an observer-facing plane; Shift-drag translates it in depth. The world point moves by the same displacement and remains on the object.
- Point manipulation must use ray-surface intersection for pointer dragging and azimuth/elevation controls for keyboard operation. Both paths keep \(\mathbf{P}\) on the fixed blue object while supporting meaningful changes in transverse position and depth.
- Focal-length controls must expose a finite, positive range and display the current value with units or normalized scene units.
- Essential controls use native, keyboard-operable elements with accessible names and visible focus.
- Touch targets must be large enough to operate reliably, and control groups must reflow instead of causing horizontal page scrolling.
- Provide a concise accessible description or status that reports the current world point, focal length, projected point, and invalid state without attempting to duplicate the full spatial experience in prose.

## Learning Requirements

- Make cause and effect immediate: moving \(\mathbf{P}\) updates \(\mathbf{p}\), and changing \(f\) moves the image plane and changes the projected coordinates.
- Keep the physical-image inversion visible from the initial viewpoint and understandable after observer navigation.
- Show the coordinate relationship alongside the construction without allowing an equation panel to dominate the scene.
- Use plain-language help for the physical image plane and the observer camera where notation alone may be ambiguous.
- Do not imply that observer-camera movement changes the pinhole-camera model.
- Do not present invalid or clamped states as valid mathematical results.

## Initial Non-Goals

The first milestone does not include:

- Editable mathematical-camera position or orientation.
- Intrinsic calibration beyond focal length.
- Pixel coordinates, principal-point offsets, skew, or sensor sampling.
- Radial or tangential distortion.
- Thin-lens focus, aperture, depth of field, or other lens effects.
- Multiple cameras or epipolar geometry.
- Uploaded photographs or image-plane textures.
- Reconstruction, vanishing-point calibration, or pose estimation.
- Matrix-heavy readouts or a full camera-calibration workbench.
- A guided, step-by-step lesson sequence.

These topics may be considered later, but they must not complicate the focused first experience.
