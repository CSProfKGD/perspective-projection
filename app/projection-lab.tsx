"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { projectPoint, type Vector3Data } from "./lib/projection";
import {
  anglesOnSphere,
  pointOnSphere,
  type SurfaceAngles,
} from "./lib/surface";

type VisibilityState = {
  axes: boolean;
  labels: boolean;
  sightline: boolean;
};

type SceneHandles = {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  worldPoint: THREE.Mesh;
  projectedPoint: THREE.Mesh;
  origin: THREE.Mesh;
  imagePlane: THREE.Mesh;
  imagePlaneOutline: THREE.LineSegments;
  imageAxes: THREE.Group;
  axes: THREE.Group;
  surface: THREE.Mesh;
  sightline: THREE.Line;
  focalGroup: THREE.Group;
  projectionLabel: CSS2DObject;
  worldLabel: CSS2DObject;
  focalLabel: CSS2DObject;
  allLabels: THREE.Group;
  resize: () => void;
  render: () => void;
  resetView: () => void;
};

const INITIAL_OBJECT_CENTRE: Vector3Data = { x: 1.8, y: 0.2, z: -6.6 };
const OBJECT_RADIUS = 1.35;
const INITIAL_ANGLES: SurfaceAngles = { azimuth: 150, elevation: 30 };
const INITIAL_POINT = pointOnSphere(
  INITIAL_OBJECT_CENTRE,
  OBJECT_RADIUS,
  INITIAL_ANGLES,
);
const INITIAL_FOCAL_LENGTH = 2.1;
const PLANE_WIDTH = 7.2;
const PLANE_HEIGHT = 5.4;

function format(value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return normalized.toFixed(2);
}

function createLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  material: THREE.LineBasicMaterial,
) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  return new THREE.Line(geometry, material);
}

function createLabel(text: string, className = "") {
  const element = document.createElement("span");
  element.className = `scene-label ${className}`.trim();
  element.textContent = text;
  element.setAttribute("aria-hidden", "true");
  return new CSS2DObject(element);
}

function Slider({
  symbol,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  symbol: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = `slider-${symbol.toLowerCase()}`;

  return (
    <div className="slider-control">
      <label className="slider-heading" htmlFor={id}>
        <span>
          {symbol === "f" && <span className="slider-name">Focal length </span>}
          <span className="slider-symbol">{symbol}</span>
          <span className="sr-only">{label}</span>
        </span>
        <span className="slider-value">{format(value)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function ProjectionLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const [worldPoint, setWorldPoint] = useState<Vector3Data>(INITIAL_POINT);
  const [objectCentre, setObjectCentre] = useState<Vector3Data>(
    INITIAL_OBJECT_CENTRE,
  );
  const [focalLength, setFocalLength] = useState(INITIAL_FOCAL_LENGTH);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [visibility, setVisibility] = useState<VisibilityState>({
    axes: true,
    labels: true,
    sightline: true,
  });

  const projection = useMemo(
    () => projectPoint(worldPoint, focalLength),
    [worldPoint, focalLength],
  );

  const surfaceAngles = useMemo(
    () => anglesOnSphere(worldPoint, objectCentre),
    [worldPoint, objectCentre],
  );

  const updateSurfaceAngle = useCallback(
    (axis: keyof SurfaceAngles, value: number) => {
      setWorldPoint((current) => {
        const angles = anglesOnSphere(current, objectCentre);
        return pointOnSphere(objectCentre, OBJECT_RADIUS, {
          ...angles,
          [axis]: value,
        });
      });
    },
    [objectCentre],
  );

  const updateObjectCoordinate = useCallback(
    (axis: keyof Vector3Data, value: number) => {
      const delta = value - objectCentre[axis];
      setObjectCentre((current) => ({ ...current, [axis]: value }));
      setWorldPoint((current) => ({
        ...current,
        [axis]: current[axis] + delta,
      }));
    },
    [objectCentre],
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("projection-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("projection-theme", theme);
  }, [theme]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(9.5, 6.2, 11.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = "scene-label-layer";
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 8;
    controls.maxDistance = 30;
    controls.target.set(0, 0, -1.5);

    const structureMaterial = new THREE.LineBasicMaterial({
      color: 0xeceee9,
      transparent: true,
      opacity: 0.68,
    });
    const axisMaterial = new THREE.LineBasicMaterial({
      color: 0xeceee9,
      transparent: true,
      opacity: 0.5,
    });
    const sightlineMaterial = new THREE.LineBasicMaterial({
      color: 0x72b83c,
      transparent: true,
      opacity: 0.98,
    });

    const ambient = new THREE.HemisphereLight(0xe8f4e4, 0x1c2620, 2.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(6, 9, 7);
    scene.add(key);

    const imagePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT),
      new THREE.MeshPhysicalMaterial({
        color: 0x96a09a,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.7,
        metalness: 0,
      }),
    );
    scene.add(imagePlane);

    const imagePlaneOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT)),
      structureMaterial,
    );
    scene.add(imagePlaneOutline);

    const imageAxes = new THREE.Group();
    imageAxes.add(
      createLine(
        new THREE.Vector3(-PLANE_WIDTH / 2, 0, 0),
        new THREE.Vector3(PLANE_WIDTH / 2, 0, 0),
        axisMaterial,
      ),
      createLine(
        new THREE.Vector3(0, -PLANE_HEIGHT / 2, 0),
        new THREE.Vector3(0, PLANE_HEIGHT / 2, 0),
        axisMaterial,
      ),
    );
    const planeNormal = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      1.05,
      0x72b83c,
      0.22,
      0.11,
    );
    imageAxes.add(planeNormal);
    const normalLabel = createLabel("Ẑ ⟂ image plane", "axis");
    normalLabel.position.set(0.28, 0.22, 1.12);
    imageAxes.add(normalLabel);
    scene.add(imageAxes);

    const axes = new THREE.Group();
    axes.add(
      createLine(new THREE.Vector3(-4.4, 0, 0), new THREE.Vector3(4.4, 0, 0), axisMaterial),
      createLine(new THREE.Vector3(0, -3.4, 0), new THREE.Vector3(0, 3.4, 0), axisMaterial),
      new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -11),
        16.6,
        0xeceee9,
        0.34,
        0.16,
      ),
    );
    scene.add(axes);

    const axisLabels = [
      { text: "X̂", position: new THREE.Vector3(4.55, 0, 0) },
      { text: "Ŷ", position: new THREE.Vector3(0, 3.58, 0) },
      { text: "Ẑ", position: new THREE.Vector3(0, 0, 5.78) },
      { text: "optical axis", position: new THREE.Vector3(0, -0.32, -8.7) },
    ];
    axisLabels.forEach(({ text, position }) => {
      const label = createLabel(text, "axis");
      label.position.copy(position);
      axes.add(label);
    });

    const origin = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xf5f5f0 }),
    );
    scene.add(origin);

    const worldPointMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 28, 28),
      new THREE.MeshStandardMaterial({
        color: 0xf2cd54,
        emissive: 0x554311,
        emissiveIntensity: 1.1,
      }),
    );
    scene.add(worldPointMesh);

    const projectedPointMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 28, 28),
      new THREE.MeshStandardMaterial({
        color: 0xf2cd54,
        emissive: 0x554311,
        emissiveIntensity: 0.85,
      }),
    );
    scene.add(projectedPointMesh);

    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(OBJECT_RADIUS, 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0x3e8dcf,
        transparent: true,
        opacity: 0.74,
        roughness: 0.58,
        metalness: 0.04,
      }),
    );
    surface.position.set(
      INITIAL_OBJECT_CENTRE.x,
      INITIAL_OBJECT_CENTRE.y,
      INITIAL_OBJECT_CENTRE.z,
    );
    scene.add(surface);

    const sightline = createLine(
      new THREE.Vector3(),
      new THREE.Vector3(),
      sightlineMaterial,
    );
    scene.add(sightline);

    const focalGroup = new THREE.Group();
    focalGroup.add(
      createLine(new THREE.Vector3(), new THREE.Vector3(), structureMaterial),
      createLine(new THREE.Vector3(), new THREE.Vector3(), structureMaterial),
      createLine(new THREE.Vector3(), new THREE.Vector3(), structureMaterial),
    );
    scene.add(focalGroup);

    const allLabels = new THREE.Group();
    const originLabel = createLabel("o");
    originLabel.position.set(-0.22, 0.27, 0);
    allLabels.add(originLabel);

    const worldLabel = createLabel("P = (X, Y, Z)", "point");
    allLabels.add(worldLabel);
    const projectionLabel = createLabel("p = (x, y, f)", "point");
    allLabels.add(projectionLabel);
    const focalLabel = createLabel("f", "focal");
    allLabels.add(focalLabel);
    scene.add(allLabels);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
    };

    const resetView = () => {
      camera.position.set(9.5, 6.2, 11.5);
      controls.target.set(0, 0, -1.5);
      controls.update();
    };

    let frame = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragMode: "point" | "object" | null = null;
    const dragPlane = new THREE.Plane();
    const dragIntersection = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    const dragStartCentre = new THREE.Vector3();
    const dragStartPoint = new THREE.Vector3();
    let dragStartY = 0;

    const updatePointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const pointerDown = (event: PointerEvent) => {
      updatePointer(event);
      const pointHits = raycaster.intersectObject(worldPointMesh, false);
      const surfaceHits = raycaster.intersectObject(surface, false);

      if (pointHits.length > 0) {
        dragMode = "point";
      } else if (surfaceHits.length > 0) {
        dragMode = "object";
        const viewDirection = camera.getWorldDirection(new THREE.Vector3());
        dragPlane.setFromNormalAndCoplanarPoint(viewDirection, surface.position);
        raycaster.ray.intersectPlane(dragPlane, dragIntersection);
        dragOffset.copy(surface.position).sub(dragIntersection);
        dragStartCentre.copy(surface.position);
        dragStartPoint.copy(worldPointMesh.position);
        dragStartY = event.clientY;
      } else {
        return;
      }

      controls.enabled = false;
      renderer.domElement.classList.add("is-dragging");
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const pointerMove = (event: PointerEvent) => {
      updatePointer(event);
      if (!dragMode) {
        const overPoint =
          raycaster.intersectObject(worldPointMesh, false).length > 0;
        const overObject = raycaster.intersectObject(surface, false).length > 0;
        renderer.domElement.style.cursor =
          overPoint || overObject ? "pointer" : "grab";
        return;
      }

      if (dragMode === "point") {
        const surfaceHits = raycaster.intersectObject(surface, false);
        if (surfaceHits.length > 0) {
          const hit = surfaceHits[0].point;
          const direction = hit
            .clone()
            .sub(surface.position)
            .normalize()
            .multiplyScalar(OBJECT_RADIUS);
          const constrained = surface.position.clone().add(direction);
          setWorldPoint({
            x: constrained.x,
            y: constrained.y,
            z: constrained.z,
          });
        }
        return;
      }

      let nextCentre: THREE.Vector3;
      if (event.shiftKey) {
        const depthDelta = (dragStartY - event.clientY) * 0.018;
        nextCentre = dragStartCentre
          .clone()
          .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(depthDelta));
      } else if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
        nextCentre = dragIntersection.clone().add(dragOffset);
      } else {
        return;
      }

      nextCentre.x = THREE.MathUtils.clamp(nextCentre.x, -2.8, 3.2);
      nextCentre.y = THREE.MathUtils.clamp(nextCentre.y, -2.1, 2.1);
      nextCentre.z = THREE.MathUtils.clamp(nextCentre.z, -10, -3);
      const delta = nextCentre.clone().sub(dragStartCentre);
      const nextPoint = dragStartPoint.clone().add(delta);

      setObjectCentre({
        x: nextCentre.x,
        y: nextCentre.y,
        z: nextCentre.z,
      });
      setWorldPoint({ x: nextPoint.x, y: nextPoint.y, z: nextPoint.z });
    };

    const finishDrag = (event: PointerEvent) => {
      if (!dragMode) return;
      dragMode = null;
      controls.enabled = true;
      renderer.domElement.classList.remove("is-dragging");
      renderer.domElement.style.cursor = "grab";
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", finishDrag);
    renderer.domElement.addEventListener("pointercancel", finishDrag);
    window.addEventListener("resize", resize);

    resize();
    render();

    sceneRef.current = {
      camera,
      controls,
      renderer,
      labelRenderer,
      worldPoint: worldPointMesh,
      projectedPoint: projectedPointMesh,
      origin,
      imagePlane,
      imagePlaneOutline,
      imageAxes,
      axes,
      surface,
      sightline,
      focalGroup,
      projectionLabel,
      worldLabel,
      focalLabel,
      allLabels,
      resize,
      render,
      resetView,
    };

    return () => {
      sceneRef.current = null;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", finishDrag);
      renderer.domElement.removeEventListener("pointercancel", finishDrag);
      controls.dispose();
      renderer.dispose();
      labelRenderer.domElement.remove();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles || !projection.valid) return;

    const p = projection.projectedPoint;
    handles.worldPoint.position.set(worldPoint.x, worldPoint.y, worldPoint.z);
    handles.projectedPoint.position.set(p.x, p.y, p.z);
    handles.imagePlane.position.z = focalLength;
    handles.imagePlaneOutline.position.z = focalLength;
    handles.imageAxes.position.z = focalLength + 0.004;
    handles.surface.position.set(
      objectCentre.x,
      objectCentre.y,
      objectCentre.z,
    );
    handles.sightline.geometry.setFromPoints([
      new THREE.Vector3(worldPoint.x, worldPoint.y, worldPoint.z),
      new THREE.Vector3(p.x, p.y, p.z),
    ]);

    const focalLines = handles.focalGroup.children as THREE.Line[];
    focalLines[0].geometry.setFromPoints([
      new THREE.Vector3(-0.34, -0.34, 0),
      new THREE.Vector3(-0.34, -0.34, focalLength),
    ]);
    focalLines[1].geometry.setFromPoints([
      new THREE.Vector3(-0.48, -0.34, 0),
      new THREE.Vector3(-0.2, -0.34, 0),
    ]);
    focalLines[2].geometry.setFromPoints([
      new THREE.Vector3(-0.48, -0.34, focalLength),
      new THREE.Vector3(-0.2, -0.34, focalLength),
    ]);

    handles.worldLabel.position.set(
      worldPoint.x,
      worldPoint.y + 0.38,
      worldPoint.z,
    );
    handles.projectionLabel.position.set(p.x, p.y + 0.34, p.z);
    handles.focalLabel.position.set(-0.6, -0.42, focalLength / 2);

    handles.projectedPoint.visible = true;
    handles.sightline.visible = visibility.sightline;
  }, [
    worldPoint,
    objectCentre,
    focalLength,
    projection,
    visibility.sightline,
  ]);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    handles.axes.visible = visibility.axes;
    handles.imageAxes.visible = visibility.axes;
    handles.allLabels.visible = visibility.labels;
    handles.sightline.visible = visibility.sightline;
  }, [visibility]);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    const isLight = theme === "light";
    const structure = isLight ? 0x252a26 : 0xeceee9;
    const plane = handles.imagePlane.material as THREE.MeshPhysicalMaterial;
    plane.color.setHex(isLight ? 0x747d76 : 0x96a09a);
    plane.opacity = isLight ? 0.17 : 0.2;

    const originMaterial = handles.origin.material as THREE.MeshBasicMaterial;
    originMaterial.color.setHex(isLight ? 0x1b1f1c : 0xf5f5f0);

    (
      handles.imagePlaneOutline.material as THREE.LineBasicMaterial
    ).color.setHex(structure);
  }, [theme]);

  const toggle = (key: keyof VisibilityState) => {
    setVisibility((current) => ({ ...current, [key]: !current[key] }));
  };

  const reset = () => {
    setWorldPoint(INITIAL_POINT);
    setObjectCentre(INITIAL_OBJECT_CENTRE);
    setFocalLength(INITIAL_FOCAL_LENGTH);
    sceneRef.current?.resetView();
  };

  const projected = projection.valid
    ? projection.projectedPoint
    : { x: 0, y: 0, z: focalLength };

  const status = projection.valid
    ? `World point P is at ${format(worldPoint.x)}, ${format(worldPoint.y)}, ${format(worldPoint.z)}. Focal length is ${format(focalLength)}. Projected point p is at ${format(projected.x)}, ${format(projected.y)}, ${format(projected.z)}.`
    : "Projection is unavailable at this depth.";

  return (
    <main className="lab-shell" data-theme={theme}>
      <header className="lab-header">
        <div className="lab-title-block">
          <p className="eyebrow">Perspective projection</p>
          <h1>One point. One line. An inverted image.</h1>
        </div>
        <div className="header-actions">
          <button className="text-button" type="button" onClick={reset}>
            Reset view
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
          </button>
        </div>
      </header>

      <div
        ref={mountRef}
        className="scene-stage"
        role="img"
        aria-label="Interactive three-dimensional pinhole-camera projection scene"
      />

      <aside className="readout" aria-label="Projection equation and coordinates">
        <div className="readout-title">
          Live projection <span className="status-dot" aria-hidden="true" />
        </div>
        <p className="formula">
          <em>x</em> = f X/Z, &nbsp; <em>y</em> = f Y/Z
        </p>
        <dl className="coordinates">
          <div className="coordinate-row">
            <dt>P</dt>
            <dd>
              ({format(worldPoint.x)}, {format(worldPoint.y)},{" "}
              {format(worldPoint.z)})
            </dd>
          </div>
          <div className="coordinate-row">
            <dt>p</dt>
            <dd>
              ({format(projected.x)}, {format(projected.y)},{" "}
              {format(projected.z)})
            </dd>
          </div>
        </dl>
      </aside>

      <p className="interaction-hint">
        <strong>Drag P</strong> across the object · <strong>drag the ball</strong>{" "}
        to move it
        <br />
        Shift-drag the ball for depth · drag empty space to orbit
      </p>

      <section className="control-dock" aria-label="Visualization controls">
        <div className="toggle-group" aria-label="Visible geometry">
          {(Object.keys(visibility) as Array<keyof VisibilityState>).map(
            (key) => (
              <button
                key={key}
                className="toggle-button"
                type="button"
                aria-pressed={visibility[key]}
                onClick={() => toggle(key)}
              >
                {key === "sightline"
                  ? "Sightline"
                  : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ),
          )}
        </div>
        <div className="slider-panel">
          <Slider
            symbol="f"
            label="Focal length"
            value={focalLength}
            min={0.8}
            max={3.2}
            step={0.05}
            onChange={setFocalLength}
          />
          <Slider
            symbol="θ"
            label="Point azimuth on the object"
            value={surfaceAngles.azimuth}
            min={-180}
            max={180}
            step={1}
            onChange={(value) => updateSurfaceAngle("azimuth", value)}
          />
          <Slider
            symbol="φ"
            label="Point elevation on the object"
            value={surfaceAngles.elevation}
            min={-75}
            max={75}
            step={1}
            onChange={(value) => updateSurfaceAngle("elevation", value)}
          />
          <Slider
            symbol="Xₒ"
            label="Object X coordinate"
            value={objectCentre.x}
            min={-2.8}
            max={3.2}
            step={0.05}
            onChange={(value) => updateObjectCoordinate("x", value)}
          />
          <Slider
            symbol="Yₒ"
            label="Object Y coordinate"
            value={objectCentre.y}
            min={-2.1}
            max={2.1}
            step={0.05}
            onChange={(value) => updateObjectCoordinate("y", value)}
          />
          <Slider
            symbol="Zₒ"
            label="Object depth"
            value={objectCentre.z}
            min={-10}
            max={-3}
            step={0.05}
            onChange={(value) => updateObjectCoordinate("z", value)}
          />
        </div>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </main>
  );
}
