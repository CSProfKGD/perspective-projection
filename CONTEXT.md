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
- Concise KaTeX-rendered mathematical point labels that express the world point as \(\mathbf{P}=(X,Y,Z)\) followed by its live 3D world coordinate, and the projected point as \(\mathbf{p}=(fX/Z,fY/Z,f)\) followed by its live 3D position on the image plane.
- A restrained blue spherical scene object whose surface contains \(\mathbf{P}\). The object constrains point manipulation but does not otherwise participate in the projection calculation.

The initial view shows the complete construction from an oblique angle so that the world point, camera centre, image plane, optical axis, and image inversion are all visible. The 3D scene remains the dominant surface.

The user can:

- Orbit, pan, and zoom the observer view without changing the mathematical camera.
- Drag \(\mathbf{P}\) across the blue object's surface; ray-surface intersection keeps it on the object while all dependent geometry and live values update continuously.
- Drag the blue object itself to translate it through 3D while carrying \(\mathbf{P}\) with it. Shift-drag controls depth.
- Drag the physical image plane along the optical axis to adjust the positive focal length, \(f\), and see the projection move consistently.
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

- Use a visually quiet black or near-black background by default, with only a diffuse green tint around the central construction and a soft edge vignette. Avoid grids, spotlights, bright hotspots, and other decorative background treatments. Retain an optional accessible light theme.
- Follow a restrained product-demo hierarchy: the world point is primary, followed by the continuous green projection line, projected point, glass-like image plane, camera centre, reference axes, and finally the interface.
- Draw axes, the optical axis, image-plane outlines, brackets, and mathematical labels primarily in white in dark mode and deep charcoal in light mode.
- Give the three coordinate axes modestly stronger screen-space strokes, with identical, restrained arrowheads at their positive ends. Keep the image-plane outer frame slightly heavier than its centre guides; the internal guides should remain about two-thirds of the frame weight.
- Use green for the projection line, matching the reference diagram. Give it the strongest geometric line weight with only a restrained soft halo; construction and reference lines must recede.
- Use a polished warm yellow for \(\mathbf{P}\) and \(\mathbf{p}\), differentiating them through size, position, and labels as well as colour. Keep the projected marker at a stable screen size as focal length and observer distance change; do not pulse or resize it when projection values update.
- Set the main coordinate equations and variables in neutral white or graphite, optionally using the marker yellow only for their live numeric tuples. Keep coordinate labels offset above their points without connector lines.
- Use blue for the contextual scene surface near \(\mathbf{P}\). Keep its lighting soft, moderately rough, and subordinate to the projection construction. Show a clearly perceptible but restrained blue outer halo while the sphere is hovered or dragged so its direct-manipulation affordance matches the more salient point halo.
- Render the physical image plane as low-opacity dark glass with faint cool-neutral edges and centre guides rather than a large solid region.
- Communicate focal length through direct image-plane motion and temporary manipulation feedback rather than a permanent bracket or standalone \(f\) label.
- Use one compact translucent control pill for visibility toggles. Keep the live point coordinates attached to their geometric labels; show the focal-length value only during direct plane manipulation with restrained fades.
- Typeset variables in standard mathematical notation, including italic variables and bold vector names where explanatory text distinguishes vectors.
- Render mathematical symbols and expressions from LaTeX with KaTeX rather than assembling notation from Unicode glyphs.
- Keep labels readable against surfaces and prevent avoidable overlap while the observer camera moves.
- Preserve depth cues with opacity, line weight, depth ordering, and restrained lighting. Avoid decorative textures, heavy panels, excessive glow, or gratuitous colour.
- Use short easing only where it clarifies a state change, such as a projection updating after a focal-length adjustment. Do not add perpetual motion.
- When Axes, Labels, or Ray visibility is toggled, dissolve the affected scene elements smoothly in or out rather than switching them abruptly.
- Crossfade between dark and light themes as one restrained presentation transition so the page chrome, labels, lighting, and 3D scene change together rather than flashing between palettes.
- Respect reduced-motion preferences by making nonessential transitions effectively immediate.

The light theme should preserve the same semantic colour roles and use a presentation-led, Apple Keynote-like finish: a warm near-white canvas, crisp graphite structure and notation, restrained translucent white controls, a clear botanical-green projection line, a refined medium-blue object, and darker amber notation with gold markers. Every axis and plane guide must remain legible against both the canvas and translucent image plane.

## Interaction Requirements

- The observer camera is an inspection tool only. Orbiting, panning, or zooming it must never alter the pinhole camera or projection.
- Dragging \(\mathbf{P}\) temporarily owns the pointer until release or cancellation so that the scene cannot orbit accidentally during the same gesture.
- Dragging the blue object translates it in an observer-facing plane; Shift-drag translates it in depth. The world point moves by the same displacement and remains on the object.
- Hovering the blue object reveals a soft outer halo, matching the point halo, and the halo remains visible throughout an object-drag gesture.
- Point manipulation must use ray-surface intersection so \(\mathbf{P}\) remains on the fixed blue object while supporting meaningful changes in transverse position and depth.
- The image plane is the focal-length control. Pointer dragging must constrain it to the optical axis within a finite positive range, and a visually hidden native range control must provide equivalent keyboard access without reintroducing a visible slider.
- Image-plane hover and drag states must make the direct manipulation discoverable, suppress observer orbit during the gesture, and show a temporary focal-length value that fades in on press and out on release.
- Essential controls use native, keyboard-operable elements with accessible names and visible focus.
- Touch targets must be large enough to operate reliably, and control groups must reflow instead of causing horizontal page scrolling.
- Provide a concise accessible description or status that reports the current world point, focal length, projected point, and invalid state without attempting to duplicate the full spatial experience in prose.

## Learning Requirements

- Make cause and effect immediate: moving \(\mathbf{P}\) updates \(\mathbf{p}\), and changing \(f\) moves the image plane and changes the projected coordinates.
- Keep the physical-image inversion visible from the initial viewpoint and understandable after observer navigation.
- Show the coordinate relationship directly in the projected-point label as \(\mathbf{p}=(fX/Z,fY/Z,f)=(x,y,f)\), with the final tuple populated by the live 3D position on the image plane, without a separate equation panel.
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
