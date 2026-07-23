"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import katex from "katex";
import * as THREE from "three";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { projectPoint, type Vector3Data } from "./lib/projection";
import {
  pointOnSphere,
  type SurfaceAngles,
} from "./lib/surface";
import {
  DISSOLVE_DURATION_MS,
  dissolveValue,
} from "./lib/dissolve";

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
  imagePlaneHit: THREE.Mesh;
  imagePlaneOutline: THREE.LineSegments;
  imageAxes: THREE.Group;
  planeNormal: THREE.ArrowHelper;
  axes: THREE.Group;
  surface: THREE.Mesh;
  sightline: THREE.Group;
  ambient: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  planeTooltip: CSS2DObject;
  planeValue: CSS2DObject;
  projectionLabel: CSS2DObject;
  worldLabel: CSS2DObject;
  allLabels: THREE.Group;
  resize: () => void;
  render: () => void;
  resetView: () => void;
  resetInteractionSession: () => void;
  setVisibilityTargets: (visibility: VisibilityState) => void;
  setPointActive: (active: boolean) => void;
  pulseProjection: () => void;
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
const MIN_FOCAL_LENGTH = 0.8;
const MAX_FOCAL_LENGTH = 3.2;
const FOCAL_STEP = 0.05;
const PLANE_WIDTH = 7.2;
const PLANE_HEIGHT = 5.4;

function format(value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return normalized.toFixed(2);
}

function renderMath(expression: string) {
  return katex.renderToString(expression, {
    throwOnError: false,
    strict: false,
    output: "htmlAndMathml",
  });
}

function createLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  material: THREE.LineBasicMaterial,
) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  return new THREE.Line(geometry, material);
}

function createProjectionLine(width: number, opacity: number) {
  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0, 0, 0, 0]);
  const material = new LineMaterial({
    color: 0x78b84b,
    linewidth: width,
    transparent: true,
    opacity,
    depthWrite: false,
    worldUnits: false,
  });
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  return line;
}

function createLabel(expression: string, className = "") {
  const element = document.createElement("span");
  element.className = `scene-label ${className}`.trim();
  element.innerHTML = renderMath(expression);
  element.setAttribute("aria-hidden", "true");
  return new CSS2DObject(element);
}

export function ProjectionLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const previousProjectedRef = useRef<Vector3Data | null>(null);
  const [worldPoint, setWorldPoint] = useState<Vector3Data>(INITIAL_POINT);
  const [objectCentre, setObjectCentre] = useState<Vector3Data>(
    INITIAL_OBJECT_CENTRE,
  );
  const [focalLength, setFocalLength] = useState(INITIAL_FOCAL_LENGTH);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [planeHovered, setPlaneHovered] = useState(false);
  const [planeDragging, setPlaneDragging] = useState(false);
  const [planeKeyboardFocus, setPlaneKeyboardFocus] = useState(false);
  const [planeTooltipVisible, setPlaneTooltipVisible] = useState(false);
  const [planeValueVisible, setPlaneValueVisible] = useState(false);
  const planeValueTimerRef = useRef<number | null>(null);
  const resetFrameRef = useRef<number | null>(null);
  const [visibility, setVisibility] = useState<VisibilityState>({
    axes: true,
    labels: true,
    sightline: true,
  });

  const projection = useMemo(
    () => projectPoint(worldPoint, focalLength),
    [worldPoint, focalLength],
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("projection-theme");
    const preferredTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    const frame = window.requestAnimationFrame(() => setTheme(preferredTheme));
    return () => window.cancelAnimationFrame(frame);
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
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
      opacity: 0.3,
    });
    const axisMaterial = new THREE.LineBasicMaterial({
      color: 0xeceee9,
      transparent: true,
      opacity: 0.34,
    });

    const ambient = new THREE.HemisphereLight(0xdfe8e1, 0x111713, 1.75);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff8df, 2.1);
    key.position.set(5, 8, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x75a9d6, 0.72);
    rim.position.set(-7, 2, -5);
    scene.add(rim);

    const imagePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT),
      new THREE.MeshPhysicalMaterial({
        color: 0x303a3a,
        transparent: true,
        opacity: 0.085,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.34,
        metalness: 0,
        clearcoat: 0.18,
        clearcoatRoughness: 0.82,
      }),
    );
    scene.add(imagePlane);

    const imagePlaneHit = new THREE.Mesh(
      new THREE.PlaneGeometry(PLANE_WIDTH * 1.08, PLANE_HEIGHT * 1.08),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    imagePlaneHit.position.z = INITIAL_FOCAL_LENGTH;
    scene.add(imagePlaneHit);

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
    const planeNormalLine = planeNormal.line.material as THREE.LineBasicMaterial;
    planeNormalLine.transparent = true;
    planeNormalLine.opacity = 0.58;
    const planeNormalCone = planeNormal.cone.material as THREE.MeshBasicMaterial;
    planeNormalCone.transparent = true;
    planeNormalCone.opacity = 0.58;
    imageAxes.add(planeNormal);
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
      { text: "\\hat{X}", position: new THREE.Vector3(4.55, 0, 0) },
      { text: "\\hat{Y}", position: new THREE.Vector3(0, 3.58, 0) },
      { text: "\\hat{Z}", position: new THREE.Vector3(0, 0, 5.78) },
    ];
    axisLabels.forEach(({ text, position }) => {
      const label = createLabel(text, "axis");
      label.position.copy(position);
      axes.add(label);
    });

    const origin = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xf5f5f0 }),
    );
    scene.add(origin);

    const worldPointMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.205, 32, 32),
      new THREE.MeshPhysicalMaterial({
        color: 0xf2c75b,
        emissive: 0x3d2a08,
        emissiveIntensity: 0.38,
        roughness: 0.28,
        metalness: 0.12,
        clearcoat: 0.48,
        clearcoatRoughness: 0.22,
      }),
    );
    scene.add(worldPointMesh);

    const projectedPointMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 30, 30),
      new THREE.MeshPhysicalMaterial({
        color: 0xf2c75b,
        emissive: 0x4a340b,
        emissiveIntensity: 0.52,
        roughness: 0.34,
        metalness: 0.08,
        clearcoat: 0.32,
      }),
    );
    scene.add(projectedPointMesh);

    const pointHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf2c75b,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    );
    pointHalo.visible = false;
    scene.add(pointHalo);

    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(OBJECT_RADIUS, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x397fb5,
        transparent: true,
        opacity: 0.76,
        roughness: 0.52,
        metalness: 0.03,
        clearcoat: 0.12,
        clearcoatRoughness: 0.72,
        sheen: 0.16,
        sheenColor: new THREE.Color(0x83a9c5),
      }),
    );
    surface.position.set(
      INITIAL_OBJECT_CENTRE.x,
      INITIAL_OBJECT_CENTRE.y,
      INITIAL_OBJECT_CENTRE.z,
    );
    scene.add(surface);

    const sightline = new THREE.Group();
    const sightlineGlow = createProjectionLine(7.5, 0.12);
    const sightlineCore = createProjectionLine(2.7, 0.98);
    sightline.add(sightlineGlow, sightlineCore);
    scene.add(sightline);

    const allLabels = new THREE.Group();
    const originLabel = createLabel("o");
    originLabel.position.set(-0.22, 0.27, 0);
    allLabels.add(originLabel);

    const worldLabel = createLabel("\\mathbf{P}=(X,Y,Z)", "point");
    allLabels.add(worldLabel);
    const projectionLabel = createLabel("\\mathbf{p}=(x,y,f)", "point");
    allLabels.add(projectionLabel);
    scene.add(allLabels);

    const planeTooltip = createLabel(
      String.raw`\text{Drag to change focal length}`,
      "plane-tooltip",
    );
    planeTooltip.position.set(1.75, 1.72, INITIAL_FOCAL_LENGTH);
    planeTooltip.visible = false;
    scene.add(planeTooltip);

    const planeValue = createLabel(
      String.raw`f=2.10`,
      "plane-value",
    );
    planeValue.position.set(
      -PLANE_WIDTH / 2,
      PLANE_HEIGHT / 2,
      INITIAL_FOCAL_LENGTH,
    );
    planeValue.visible = true;
    scene.add(planeValue);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
      (sightlineCore.material as LineMaterial).resolution.set(width, height);
      (sightlineGlow.material as LineMaterial).resolution.set(width, height);
    };

    const defaultCamera = new THREE.Vector3(9.5, 6.2, 11.5);
    const defaultTarget = new THREE.Vector3(0, 0, -1.5);
    let cameraTween:
      | {
          startedAt: number;
          fromPosition: THREE.Vector3;
          fromTarget: THREE.Vector3;
        }
      | null = null;
    let projectedPulseUntil = 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    type DissolveState = {
      current: number;
      from: number;
      target: number;
      startedAt: number;
    };
    const dissolveState: Record<keyof VisibilityState, DissolveState> = {
      axes: { current: 1, from: 1, target: 1, startedAt: 0 },
      labels: { current: 1, from: 1, target: 1, startedAt: 0 },
      sightline: { current: 1, from: 1, target: 1, startedAt: 0 },
    };

    const collectMaterials = (group: THREE.Object3D) => {
      const materials = new Set<THREE.Material>();
      group.traverse((object) => {
        const material = (object as THREE.Mesh).material;
        if (!material) return;
        const entries = Array.isArray(material) ? material : [material];
        entries.forEach((entry) => {
          entry.transparent = true;
          entry.userData.dissolveBaseOpacity = entry.opacity;
          materials.add(entry);
        });
      });
      return [...materials];
    };

    const collectLabelElements = (group: THREE.Object3D) => {
      const elements: HTMLElement[] = [];
      group.traverse((object) => {
        if (object instanceof CSS2DObject) elements.push(object.element);
      });
      return elements;
    };

    const axisMaterials = collectMaterials(axes);
    collectMaterials(imageAxes).forEach((material) => {
      if (!axisMaterials.includes(material)) axisMaterials.push(material);
    });
    const rayMaterials = collectMaterials(sightline);
    const axisLabelElements = collectLabelElements(axes);
    const labelElements = collectLabelElements(allLabels);

    const setVisibilityTargets = (next: VisibilityState) => {
      const now = performance.now();
      (Object.keys(next) as Array<keyof VisibilityState>).forEach((key) => {
        const state = dissolveState[key];
        const target = next[key] ? 1 : 0;
        if (state.target === target) return;
        state.from = state.current;
        state.target = target;
        state.startedAt = now;
        if (reducedMotion) state.current = target;
      });
    };

    const applyMaterialDissolve = (
      materials: THREE.Material[],
      factor: number,
    ) => {
      materials.forEach((material) => {
        const baseOpacity =
          typeof material.userData.dissolveBaseOpacity === "number"
            ? material.userData.dissolveBaseOpacity
            : 1;
        material.opacity = baseOpacity * factor;
      });
    };

    const resetView = () => {
      if (reducedMotion) {
        camera.position.copy(defaultCamera);
        controls.target.copy(defaultTarget);
        controls.update();
        return;
      }
      cameraTween = {
        startedAt: performance.now(),
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
      };
    };

    const setPointActive = (active: boolean) => {
      pointHalo.visible = active;
      (sightlineCore.material as LineMaterial).linewidth = active ? 3.35 : 2.7;
      (sightlineGlow.material as LineMaterial).userData.dissolveBaseOpacity =
        active ? 0.18 : 0.12;
    };

    const pulseProjection = () => {
      if (!reducedMotion) projectedPulseUntil = performance.now() + 230;
    };

    let frame = 0;
    const render = () => {
      const now = performance.now();
      (Object.keys(dissolveState) as Array<keyof VisibilityState>).forEach(
        (key) => {
          const state = dissolveState[key];
          if (state.current === state.target) return;
          state.current = dissolveValue(
            state.from,
            state.target,
            now - state.startedAt,
            reducedMotion ? 0 : DISSOLVE_DURATION_MS,
          );
          if (Math.abs(state.current - state.target) < 0.001) {
            state.current = state.target;
          }
        },
      );
      applyMaterialDissolve(axisMaterials, dissolveState.axes.current);
      applyMaterialDissolve(rayMaterials, dissolveState.sightline.current);
      axisLabelElements.forEach((element) => {
        element.style.opacity = String(0.76 * dissolveState.axes.current);
      });
      [...labelElements, planeTooltip.element].forEach((element) => {
        element.style.opacity = String(dissolveState.labels.current);
      });
      planeValue.element.style.setProperty(
        "--label-group-opacity",
        String(dissolveState.labels.current),
      );
      if (cameraTween) {
        const progress = Math.min((now - cameraTween.startedAt) / 620, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        camera.position.lerpVectors(
          cameraTween.fromPosition,
          defaultCamera,
          eased,
        );
        controls.target.lerpVectors(
          cameraTween.fromTarget,
          defaultTarget,
          eased,
        );
        if (progress >= 1) cameraTween = null;
      }
      if (projectedPulseUntil > now) {
        const phase = 1 - (projectedPulseUntil - now) / 230;
        const scale = 1 + Math.sin(phase * Math.PI) * 0.42;
        projectedPointMesh.scale.setScalar(scale);
      } else {
        projectedPointMesh.scale.setScalar(1);
      }
      pointHalo.position.copy(worldPointMesh.position);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragMode: "point" | "object" | "plane" | null = null;
    const dragPlane = new THREE.Plane();
    const dragIntersection = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    const dragStartCentre = new THREE.Vector3();
    const dragStartPoint = new THREE.Vector3();
    let dragStartY = 0;
    let planeDragStartAxis = INITIAL_FOCAL_LENGTH;
    let planeDragStartFocal = INITIAL_FOCAL_LENGTH;
    let planeHasBeenDragged = false;
    let tooltipTimer: number | null = null;

    const clearTooltipTimer = () => {
      if (tooltipTimer !== null) window.clearTimeout(tooltipTimer);
      tooltipTimer = null;
    };

    // Find the closest point on the camera-space optical axis to the
    // observer ray. Changes in this parameter give a view-independent,
    // one-dimensional plane drag even after orbiting the observer.
    const axisParameterFromRay = () => {
      const rayDirection = raycaster.ray.direction;
      const rayOrigin = raycaster.ray.origin;
      const axisDirection = new THREE.Vector3(0, 0, 1);
      const b = rayDirection.dot(axisDirection);
      const d = rayDirection.dot(rayOrigin);
      const e = axisDirection.dot(rayOrigin);
      const denominator = 1 - b * b;
      if (Math.abs(denominator) < 1e-5) return null;
      return (e - b * d) / denominator;
    };

    const updatePointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const pointerDown = (event: PointerEvent) => {
      updatePointer(event);
      const pointHits = raycaster.intersectObject(worldPointMesh, false);
      const planeHits = raycaster.intersectObject(imagePlaneHit, false);
      const surfaceHits = raycaster.intersectObject(surface, false);

      if (pointHits.length > 0) {
        dragMode = "point";
      } else if (planeHits.length > 0) {
        const axisParameter = axisParameterFromRay();
        if (axisParameter === null) return;
        dragMode = "plane";
        planeDragStartAxis = axisParameter;
        planeDragStartFocal = imagePlane.position.z;
        clearTooltipTimer();
        setPlaneTooltipVisible(false);
        setPlaneHovered(false);
        setPlaneDragging(true);
        setPlaneValueVisible(true);
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
      setPointActive(dragMode === "point");
      renderer.domElement.classList.add("is-dragging");
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const pointerMove = (event: PointerEvent) => {
      updatePointer(event);
      if (!dragMode) {
        const overPoint =
          raycaster.intersectObject(worldPointMesh, false).length > 0;
        const overPlane =
          !overPoint &&
          raycaster.intersectObject(imagePlaneHit, false).length > 0;
        const overObject = raycaster.intersectObject(surface, false).length > 0;
        renderer.domElement.style.cursor = overPlane
          ? "ns-resize"
          : overPoint || overObject
            ? "grab"
            : "grab";
        setPointActive(overPoint);
        setPlaneHovered(overPlane);
        if (overPlane && !planeHasBeenDragged && tooltipTimer === null) {
          tooltipTimer = window.setTimeout(() => {
            setPlaneTooltipVisible(true);
            tooltipTimer = null;
          }, 320);
        } else if (!overPlane) {
          clearTooltipTimer();
          setPlaneTooltipVisible(false);
        }
        return;
      }

      if (dragMode === "plane") {
        const axisParameter = axisParameterFromRay();
        if (axisParameter !== null) {
          const nextFocal = THREE.MathUtils.clamp(
            planeDragStartFocal + axisParameter - planeDragStartAxis,
            MIN_FOCAL_LENGTH,
            MAX_FOCAL_LENGTH,
          );
          setFocalLength(nextFocal);
        }
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
      const completedMode = dragMode;
      dragMode = null;
      controls.enabled = true;
      setPointActive(false);
      if (completedMode === "plane") {
        planeHasBeenDragged = true;
        setPlaneDragging(false);
        setPlaneValueVisible(false);
      }
      renderer.domElement.classList.remove("is-dragging");
      renderer.domElement.style.cursor = "grab";
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const resetInteractionSession = () => {
      planeHasBeenDragged = false;
      clearTooltipTimer();
      setPlaneHovered(false);
      setPlaneDragging(false);
      setPlaneTooltipVisible(false);
      setPlaneValueVisible(false);
    };

    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", finishDrag);
    renderer.domElement.addEventListener("pointercancel", finishDrag);
    renderer.domElement.addEventListener("lostpointercapture", finishDrag);
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
      imagePlaneHit,
      imagePlaneOutline,
      imageAxes,
      planeNormal,
      axes,
      surface,
      sightline,
      ambient,
      key,
      rim,
      planeTooltip,
      planeValue,
      projectionLabel,
      worldLabel,
      allLabels,
      resize,
      render,
      resetView,
      resetInteractionSession,
      setVisibilityTargets,
      setPointActive,
      pulseProjection,
    };

    return () => {
      sceneRef.current = null;
      window.cancelAnimationFrame(frame);
      clearTooltipTimer();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", finishDrag);
      renderer.domElement.removeEventListener("pointercancel", finishDrag);
      renderer.domElement.removeEventListener("lostpointercapture", finishDrag);
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
    handles.imagePlaneHit.position.z = focalLength;
    handles.imagePlaneOutline.position.z = focalLength;
    handles.imageAxes.position.z = focalLength + 0.004;
    handles.surface.position.set(
      objectCentre.x,
      objectCentre.y,
      objectCentre.z,
    );
    const rayPositions = [
      worldPoint.x,
      worldPoint.y,
      worldPoint.z,
      p.x,
      p.y,
      p.z,
    ];
    handles.sightline.children.forEach((child) => {
      const line = child as Line2;
      (line.geometry as LineGeometry).setPositions(rayPositions);
      line.computeLineDistances();
    });

    const previousProjected = previousProjectedRef.current;
    if (
      previousProjected &&
      Math.hypot(
        p.x - previousProjected.x,
        p.y - previousProjected.y,
        p.z - previousProjected.z,
      ) > 0.075
    ) {
      handles.pulseProjection();
    }
    previousProjectedRef.current = { x: p.x, y: p.y, z: p.z };

    handles.worldLabel.position.set(
      worldPoint.x,
      worldPoint.y + 0.72,
      worldPoint.z,
    );
    handles.projectionLabel.position.set(p.x, p.y + 0.68, p.z);
    handles.planeTooltip.position.z = focalLength + 0.03;
    handles.planeValue.position.z = focalLength + 0.03;
    handles.planeValue.element.innerHTML = renderMath(
      `f=${format(focalLength)}`,
    );

    handles.worldLabel.element.innerHTML = renderMath(
      String.raw`\mathbf{P}=\left(X,\,Y,\,Z\right)=\left(${format(
        worldPoint.x,
      )},\,${format(worldPoint.y)},\,${format(worldPoint.z)}\right)`,
    );
    handles.projectionLabel.element.innerHTML = renderMath(
      String.raw`\mathbf{p}=\left(\frac{fX}{Z},\,\frac{fY}{Z},\,f\right)=\left(${format(
        p.x,
      )},\,${format(p.y)},\,${format(p.z)}\right)`,
    );

    handles.projectedPoint.visible = true;
  }, [
    worldPoint,
    objectCentre,
    focalLength,
    projection,
  ]);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;

    const planeActive = planeDragging;
    const planeEngaged = planeActive || planeHovered || planeKeyboardFocus;
    const isLight = theme === "light";
    const plane = handles.imagePlane.material as THREE.MeshPhysicalMaterial;
    plane.opacity = planeActive
      ? isLight
        ? 0.19
        : 0.155
      : planeEngaged
        ? isLight
          ? 0.15
          : 0.12
        : isLight
          ? 0.115
          : 0.085;

    const outline =
      handles.imagePlaneOutline.material as THREE.LineBasicMaterial;
    outline.opacity = planeActive
      ? isLight
        ? 0.86
        : 0.72
      : planeEngaged
        ? isLight
          ? 0.68
          : 0.52
        : isLight
          ? 0.5
          : 0.3;
    outline.userData.dissolveBaseOpacity = outline.opacity;
    const rayLines = handles.sightline.children as Line2[];
    (rayLines[0].material as LineMaterial).userData.dissolveBaseOpacity =
      planeActive ? 0.18 : 0.12;
    (rayLines[1].material as LineMaterial).linewidth = planeActive ? 3.25 : 2.7;

    handles.planeTooltip.visible =
      planeTooltipVisible && !planeDragging;
    handles.planeValue.visible = visibility.labels;
    handles.planeValue.element.classList.toggle(
      "is-visible",
      planeValueVisible || planeKeyboardFocus,
    );
  }, [
    planeDragging,
    planeHovered,
    planeKeyboardFocus,
    planeTooltipVisible,
    planeValueVisible,
    theme,
    visibility.labels,
  ]);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    handles.setVisibilityTargets(visibility);
  }, [visibility]);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    const isLight = theme === "light";
    const structure = isLight ? 0x4b5158 : 0xeceee9;
    const green = isLight ? 0x4f8b38 : 0x78b84b;
    const marker = isLight ? 0xd29418 : 0xf2c75b;
    const surfaceBlue = isLight ? 0x3d82b3 : 0x397fb5;
    const axisOpacity = isLight ? 0.58 : 0.34;

    const updateGroupMaterials = (
      group: THREE.Object3D,
      color: number,
      opacity: number,
    ) => {
      group.traverse((object) => {
        const material = (object as THREE.Mesh).material;
        if (!material) return;
        const entries = Array.isArray(material) ? material : [material];
        entries.forEach((entry) => {
          if ("color" in entry) {
            (entry as THREE.Material & { color: THREE.Color }).color.setHex(
              color,
            );
          }
          entry.transparent = true;
          entry.userData.dissolveBaseOpacity = opacity;
        });
      });
    };

    updateGroupMaterials(handles.axes, structure, axisOpacity);
    updateGroupMaterials(handles.imageAxes, structure, axisOpacity);
    updateGroupMaterials(
      handles.planeNormal,
      green,
      isLight ? 0.78 : 0.58,
    );

    handles.sightline.children.forEach((child) => {
      ((child as Line2).material as LineMaterial).color.setHex(green);
    });

    const plane = handles.imagePlane.material as THREE.MeshPhysicalMaterial;
    plane.color.setHex(isLight ? 0x8f9da4 : 0x303a3a);

    const surface = handles.surface.material as THREE.MeshPhysicalMaterial;
    surface.color.setHex(surfaceBlue);
    surface.opacity = isLight ? 0.86 : 0.76;
    surface.sheenColor.setHex(isLight ? 0xb7d3e5 : 0x83a9c5);

    [
      handles.worldPoint.material,
      handles.projectedPoint.material,
    ].forEach((material) => {
      const pointMaterial = material as THREE.MeshPhysicalMaterial;
      pointMaterial.color.setHex(marker);
      pointMaterial.emissive.setHex(isLight ? 0x2f1d00 : 0x3d2a08);
      pointMaterial.emissiveIntensity = isLight ? 0.12 : 0.4;
    });

    const originMaterial = handles.origin.material as THREE.MeshBasicMaterial;
    originMaterial.color.setHex(isLight ? 0x1b1f1c : 0xf5f5f0);

    (
      handles.imagePlaneOutline.material as THREE.LineBasicMaterial
    ).color.setHex(structure);

    handles.ambient.color.setHex(isLight ? 0xffffff : 0xdfe8e1);
    handles.ambient.groundColor.setHex(isLight ? 0xcbd0d3 : 0x111713);
    handles.ambient.intensity = isLight ? 2.15 : 1.75;
    handles.key.color.setHex(isLight ? 0xfffbf2 : 0xfff8df);
    handles.key.intensity = isLight ? 2.35 : 2.1;
    handles.rim.color.setHex(isLight ? 0xa9d0e9 : 0x75a9d6);
    handles.rim.intensity = isLight ? 0.88 : 0.72;
    handles.renderer.toneMappingExposure = isLight ? 1.02 : 1.06;
  }, [theme]);

  useEffect(
    () => () => {
      if (planeValueTimerRef.current !== null) {
        window.clearTimeout(planeValueTimerRef.current);
      }
      if (resetFrameRef.current !== null) {
        window.cancelAnimationFrame(resetFrameRef.current);
      }
    },
    [],
  );

  const toggle = (key: keyof VisibilityState) => {
    setVisibility((current) => ({ ...current, [key]: !current[key] }));
  };

  const schedulePlaneValueHide = () => {
    if (planeValueTimerRef.current !== null) {
      window.clearTimeout(planeValueTimerRef.current);
    }
    planeValueTimerRef.current = window.setTimeout(
      () => setPlaneValueVisible(false),
      850,
    );
  };

  const beginKeyboardPlaneFeedback = () => {
    setPlaneValueVisible(true);
    schedulePlaneValueHide();
  };

  const handlePlaneKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const isDecrease = event.key === "ArrowLeft" || event.key === "ArrowDown";
    const isIncrease = event.key === "ArrowRight" || event.key === "ArrowUp";
    if (!isDecrease && !isIncrease && event.key !== "Home") return;

    event.preventDefault();
    const step = event.shiftKey ? FOCAL_STEP * 5 : FOCAL_STEP;
    const nextFocal =
      event.key === "Home"
        ? INITIAL_FOCAL_LENGTH
        : THREE.MathUtils.clamp(
            focalLength + (isIncrease ? step : -step),
            MIN_FOCAL_LENGTH,
            MAX_FOCAL_LENGTH,
          );
    setFocalLength(nextFocal);
    beginKeyboardPlaneFeedback();
  };

  const reset = () => {
    setPlaneKeyboardFocus(false);
    sceneRef.current?.resetInteractionSession();
    sceneRef.current?.resetView();

    if (resetFrameRef.current !== null) {
      window.cancelAnimationFrame(resetFrameRef.current);
    }
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      setWorldPoint(INITIAL_POINT);
      setObjectCentre(INITIAL_OBJECT_CENTRE);
      setFocalLength(INITIAL_FOCAL_LENGTH);
      return;
    }

    const startedAt = performance.now();
    const startCentre = { ...objectCentre };
    const startFocal = focalLength;
    const startDirection = new THREE.Vector3(
      worldPoint.x - objectCentre.x,
      worldPoint.y - objectCentre.y,
      worldPoint.z - objectCentre.z,
    ).normalize();
    const targetDirection = new THREE.Vector3(
      INITIAL_POINT.x - INITIAL_OBJECT_CENTRE.x,
      INITIAL_POINT.y - INITIAL_OBJECT_CENTRE.y,
      INITIAL_POINT.z - INITIAL_OBJECT_CENTRE.z,
    ).normalize();

    const animateReset = (now: number) => {
      const progress = Math.min((now - startedAt) / 620, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const centre = {
        x: THREE.MathUtils.lerp(
          startCentre.x,
          INITIAL_OBJECT_CENTRE.x,
          eased,
        ),
        y: THREE.MathUtils.lerp(
          startCentre.y,
          INITIAL_OBJECT_CENTRE.y,
          eased,
        ),
        z: THREE.MathUtils.lerp(
          startCentre.z,
          INITIAL_OBJECT_CENTRE.z,
          eased,
        ),
      };
      const direction = startDirection
        .clone()
        .lerp(targetDirection, eased)
        .normalize()
        .multiplyScalar(OBJECT_RADIUS);

      setObjectCentre(centre);
      setWorldPoint({
        x: centre.x + direction.x,
        y: centre.y + direction.y,
        z: centre.z + direction.z,
      });
      setFocalLength(
        THREE.MathUtils.lerp(startFocal, INITIAL_FOCAL_LENGTH, eased),
      );

      if (progress < 1) {
        resetFrameRef.current = window.requestAnimationFrame(animateReset);
      } else {
        resetFrameRef.current = null;
      }
    };
    resetFrameRef.current = window.requestAnimationFrame(animateReset);
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
          <h1>One point. One ray. One image.</h1>
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

      <input
        className="plane-accessibility-control"
        type="range"
        min={MIN_FOCAL_LENGTH}
        max={MAX_FOCAL_LENGTH}
        step={FOCAL_STEP}
        value={focalLength}
        aria-label="Focal length"
        aria-valuetext={`${format(focalLength)} scene units`}
        onFocus={() => {
          setPlaneKeyboardFocus(true);
          setPlaneValueVisible(true);
        }}
        onBlur={() => {
          setPlaneKeyboardFocus(false);
          schedulePlaneValueHide();
        }}
        onKeyDown={handlePlaneKeyDown}
        onChange={(event) => {
          setFocalLength(Number(event.target.value));
          beginKeyboardPlaneFeedback();
        }}
      />

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
                  ? "Ray"
                  : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ),
          )}
        </div>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </main>
  );
}
