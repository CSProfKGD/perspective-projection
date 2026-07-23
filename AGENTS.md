# Project Instructions

These instructions apply to the entire repository. Read `CONTEXT.md` before making product, geometry, interaction, notation, or visual-design decisions.

## Product Contract

Implement the focused first milestone described in `CONTEXT.md`. Preserve its educational intent, physical-image-plane convention, and mathematical definitions. Do not add camera-pose editing, calibration controls, distortion models, image upload, reconstruction, matrix-heavy UI, or guided lessons unless the project scope is explicitly changed.

If a change alters the audience, notation, coordinate convention, visual language, supported interaction, mathematical model, or milestone scope, update `CONTEXT.md` in the same change.

## Technical Foundation

- Use Vite, TypeScript in strict mode, and direct Three.js APIs.
- Keep dependencies restrained. Add a package only when it removes meaningful complexity that cannot reasonably be handled by the web platform or Three.js.
- Keep modules small and focused. Prefer explicit data flow over hidden mutable state.
- Use named constants for geometric tolerances, focal-length limits, and scene-scale values. Keep each value with the subsystem that owns it and document non-obvious choices.
- Do not silence type errors with `any`, unchecked casts, or non-null assertions when the state can be modelled accurately.

When the project is scaffolded, provide consistent `dev`, `build`, `test`, `lint`, and `typecheck` package scripts. Keep the production build free of warnings introduced by project code.

## Architecture Boundaries

Organize implementation around four responsibilities:

1. **Geometry:** Renderer-independent vectors, camera parameters, image planes, projection lines, intersections, projected coordinates, tolerances, and validity handling.
2. **Scene rendering:** Three.js objects that render canonical and derived data without owning mathematical truth.
3. **Interaction state:** Observer navigation, dragging the world point, focal-length changes, visibility, labels, and theme.
4. **UI and accessibility:** Compact controls, mathematical labels, live values, instructions, responsive layout, and accessible status or fallback text.

Maintain one canonical scene state containing the mathematical camera parameters and world point. Compute a complete derived-geometry snapshot from it. Visibility, labels, theme, and observer navigation are presentation state and must not change the projection calculation.

The geometry layer must not import Three.js scene objects, DOM elements, or UI modules. Convert between renderer-neutral values and Three.js types at the scene boundary. Do not calculate separate approximations in multiple render components.

## Camera and Geometry Rules

- Use the camera convention fixed in `CONTEXT.md`: the camera centre is the origin, the camera looks along the negative camera-space \(Z\)-axis, visible scene points satisfy \(Z<0\), and the physical image plane lies behind the centre at \(Z=f>0\).
- For \(\mathbf{P}=(X,Y,Z)\), derive the physical-image projection as \(x=fX/Z\), \(y=fY/Z\), and \(\mathbf{p}=(x,y,f)\).
- Treat \(f\) and \(\mathbf{P}\) as canonical inputs. Derive the image plane, projection point, projection line, coordinate readouts, and all dependent measurements on every update.
- Keep the observer camera conceptually and programmatically separate from the mathematical pinhole camera. Orbiting, panning, or zooming the observer must never alter the projection camera.
- Render the complete collinear construction from \(\mathbf{P}\), through the camera centre, to \(\mathbf{p}\). Do not incorrectly stop a forward viewing ray at the camera centre when depicting the physical image behind it.
- Use one documented epsilon policy for zero depth, near-zero depth, plane intersections, and other unstable operations.
- Return explicit validity information for operations that may have no stable finite result. Never pass `NaN`, infinity, or unbounded coordinates to Three.js or the DOM.
- When geometry is unavailable, clear or hide the affected rendered objects and expose an understandable status. Never leave a previous valid projection visible as though it were current.
- Add comments that explain mathematical intent, coordinate conventions, or non-obvious interaction behaviour rather than restating code.

## Interaction and Visual Rules

- Keep the 3D construction dominant and controls compact.
- Moving \(\mathbf{P}\) or changing \(f\) must update every dependent element within the same rendered interaction cycle.
- Constrain the world point to the fixed blue object's surface in the visible half-space and keep focal length positive. Pointer and keyboard manipulation must preserve the surface constraint; clamp or reject input before it reaches an unstable configuration.
- Resolve point-dragging and observer-orbit gestures predictably. Dragging the point temporarily owns the pointer until release or cancellation.
- Treat clicks on \(\mathbf{P}\), the image plane, the blue object, and empty space as distinct gestures: surface-constrained point movement, optical-axis focal-length adjustment, object translation that carries \(\mathbf{P}\), and observer orbit respectively. Do not add a visible numeric slider.
- Provide touch-compatible hit targets and a keyboard-accessible alternative for every essential control.
- Use the screenshot-inspired semantic palette in `CONTEXT.md`: quiet dark background, white structure, green projection line, blue contextual surface, warm point markers, and a translucent neutral image plane. Preserve equivalent contrast in the optional light theme.
- Keep colour mappings stable and pair colour with notation, position, or shape. Colour alone must not carry meaning.
- Preserve legibility through opacity, line weight, depth ordering, and labels rather than decorative effects or unnecessary colours.
- Render mathematical symbols and expressions from LaTeX with KaTeX. Do not substitute hand-composed Unicode accents, superscripts, or mathematical operators.
- Animate state changes only when motion clarifies cause and effect. Avoid perpetual animation and make nonessential transitions effectively immediate when reduced motion is requested.
- Reflow controls and live values on narrow screens. Do not introduce horizontal page scrolling.

## Verification

Match verification effort to the change, and do not consider a feature complete until the relevant checks pass.

- Unit-test projection and physical-image-plane intersection calculations with representative depths, signs, focal lengths, and near-degenerate inputs.
- Assert core invariants within tolerance: \(\mathbf{p}\) lies on \(Z=f\); \(\mathbf{P}\), the camera centre, and \(\mathbf{p}\) are collinear; and the displayed coordinates agree with \(x=fX/Z\) and \(y=fY/Z\).
- Test that changing \(\mathbf{P}\) or \(f\) recomputes every dependent element and that visibility, labels, theme, and observer navigation affect presentation only.
- Test invalid-state transitions so stale geometry cannot remain visible.
- Test that pointer and keyboard manipulation keep \(\mathbf{P}\) on the object surface, including pointer cancellation and the handoff between point dragging and observer controls.
- Check keyboard operation, accessible names, visible focus, reduced motion, touch behaviour, and narrow layouts.
- Run type checking, linting, unit tests, and a production build before handing off implementation changes.
- Visually inspect the complete construction at representative desktop and narrow widths. Confirm that the physical image inversion, depth ordering, labels, image plane, and semantic colours remain understandable from useful observer angles.

## Working Agreement

- Preserve unrelated user changes and keep each change scoped to the requested outcome.
- Prefer incremental, reviewable changes over broad rewrites.
- Record durable product decisions in `CONTEXT.md`; record repository-wide engineering rules in this file.
- If mathematical correctness and visual appearance conflict, preserve correctness first, then improve the presentation without falsifying the construction.
