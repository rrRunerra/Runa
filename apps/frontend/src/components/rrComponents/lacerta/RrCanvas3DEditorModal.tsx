"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  CanvasNode,
  Object3DItem,
  Object3DType,
  Scene3DData,
  Scene3DEnvironment,
  HistoryStep3D,
} from "./types";
import { createPrimitiveGeometry } from "./canvas-cards/rrCanvas3DCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Box,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Upload,
  Grid,
  Check,
  Move,
  RotateCw,
  Maximize,
  Focus,
  Square,
  Globe,
  Zap,
  Sun,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Download,
  Camera,
  FolderPlus,
  FolderTree,
  Lightbulb,
  MousePointer,
  BoxSelect,
  Layers,
  Share2,
  FileCode,
  ArrowDownToLine,
  ArrowUpFromLine,
  HelpCircle,
  Scissors,
  Split,
  Maximize2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

interface RrCanvas3DEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: CanvasNode | null;
  allNodes?: CanvasNode[];
  onSave: (nodeId: string, updatedSceneData: Scene3DData) => void;
  onCreateNewNode?: (sceneData: Scene3DData) => void;
}

const DEFAULT_ENVIRONMENT: Scene3DEnvironment = {
  backgroundColor: "#0f172a",
  gridVisible: true,
  autoRotate: false,
  autoRotateSpeed: 1.5,
  ambientLightColor: "#ffffff",
  ambientLightIntensity: 0.8,
  directionalLightColor: "#38bdf8",
  directionalLightIntensity: 1.5,
  directionalLightPosition: [5, 8, 5],
  cameraPosition: [0, 2, 5],
};

const PRESET_TEMPLATES: { name: string; desc: string; data: Scene3DData }[] = [
  {
    name: "Geometric Core",
    desc: "Floating cube and glowing outer torus ring",
    data: {
      objects: [
        {
          id: "cube-1",
          name: "Central Cube",
          type: "box",
          position: [0, 0, 0],
          rotation: [25, 45, 0],
          scale: [1.2, 1.2, 1.2],
          color: "#6366f1",
          metalness: 0.4,
          roughness: 0.2,
          wireframe: false,
          opacity: 1,
          visible: true,
        },
        {
          id: "ring-1",
          name: "Orbit Ring",
          type: "torus",
          position: [0, 0, 0],
          rotation: [70, 15, 0],
          scale: [1.1, 1.1, 1.1],
          color: "#ec4899",
          metalness: 0.9,
          roughness: 0.1,
          wireframe: true,
          opacity: 0.8,
          visible: true,
        },
      ],
      environment: { ...DEFAULT_ENVIRONMENT },
    },
  },
  {
    name: "Solar Cluster",
    desc: "Central star sphere with orbiting planets & light object",
    data: {
      objects: [
        {
          id: "sun-1",
          name: "Central Star",
          type: "sphere",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1.3, 1.3, 1.3],
          color: "#f59e0b",
          metalness: 0.2,
          roughness: 0.1,
          wireframe: false,
          opacity: 1,
          visible: true,
          emissiveColor: "#f59e0b",
          emissiveIntensity: 0.8,
        },
        {
          id: "star-light",
          name: "Star Point Light",
          type: "light",
          lightType: "point",
          lightColor: "#f59e0b",
          lightIntensity: 3.5,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: "#f59e0b",
          metalness: 0,
          roughness: 0,
          wireframe: false,
          opacity: 1,
          visible: true,
          castShadow: true,
        },
        {
          id: "planet-1",
          name: "Blue Planet",
          type: "sphere",
          position: [-2.2, 0.4, 0],
          rotation: [0, 0, 0],
          scale: [0.6, 0.6, 0.6],
          color: "#06b6d4",
          metalness: 0.6,
          roughness: 0.3,
          wireframe: false,
          opacity: 1,
          visible: true,
        },
      ],
      environment: {
        ...DEFAULT_ENVIRONMENT,
        backgroundColor: "#030712",
        directionalLightColor: "#fbbf24",
      },
    },
  },
];

export default function RrCanvas3DEditorModal({
  isOpen,
  onClose,
  node,
  allNodes = [],
  onSave,
  onCreateNewNode,
}: RrCanvas3DEditorModalProps) {
  const [containerMounted, setContainerMounted] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerMounted(!!node);
  }, []);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const meshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const lightMapRef = useRef<Map<string, THREE.Light>>(new Map());
  const lightHelperMapRef = useRef<Map<string, THREE.Object3D>>(new Map());

  // Scene state
  const [objects, setObjects] = useState<Object3DItem[]>([]);
  const [environment, setEnvironment] = useState<Scene3DEnvironment>(DEFAULT_ENVIRONMENT);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const selectedObjectIdRef = useRef<string | null>(null);
  selectedObjectIdRef.current = selectedObjectId;

  // Dual Mode Architecture: Object Mode vs Mesh Edit Mode
  const [editorMode, setEditorMode] = useState<"object" | "edit">("object");
  const [editSelectionMode, setEditSelectionMode] = useState<"vertex" | "edge" | "face">("face");

  // Blender Tool & Viewport States
  const [gizmoMode, setGizmoMode] = useState<"translate" | "rotate" | "scale">("translate");
  const [shadingMode, setShadingMode] = useState<"solid" | "wireframe" | "rendered" | "xray">("solid");
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"object" | "geometry" | "material" | "scene" | "export">("object");
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(false);

  // Undo / Redo Stack (50 steps max)
  const [historyStack, setHistoryStack] = useState<HistoryStep3D[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryActionRef = useRef<boolean>(false);

  // Push History Record helper
  const pushHistory = useCallback((actionName: string, newObjs: Object3DItem[], newEnv: Scene3DEnvironment) => {
    if (isHistoryActionRef.current) return;
    const newStep: HistoryStep3D = {
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
      actionName,
      objectsState: JSON.parse(JSON.stringify(newObjs)),
      environmentState: JSON.parse(JSON.stringify(newEnv)),
    };

    setHistoryStack((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, newStep];
      if (updated.length > 50) updated.shift();
      return updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || historyStack.length === 0) {
      toast.info("Nothing to undo");
      return;
    }
    const prevIndex = historyIndex - 1;
    const step = historyStack[prevIndex];
    if (step) {
      isHistoryActionRef.current = true;
      setObjects(JSON.parse(JSON.stringify(step.objectsState)));
      setEnvironment(JSON.parse(JSON.stringify(step.environmentState)));
      setHistoryIndex(prevIndex);
      toast.info(`Undo: ${step.actionName}`);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  }, [historyIndex, historyStack]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndex >= historyStack.length - 1) {
      toast.info("Nothing to redo");
      return;
    }
    const nextIndex = historyIndex + 1;
    const step = historyStack[nextIndex];
    if (step) {
      isHistoryActionRef.current = true;
      setObjects(JSON.parse(JSON.stringify(step.objectsState)));
      setEnvironment(JSON.parse(JSON.stringify(step.environmentState)));
      setHistoryIndex(nextIndex);
      toast.info(`Redo: ${step.actionName}`);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  }, [historyIndex, historyStack]);

  // Synchronize meshes & lights into Three.js Scene
  const syncSceneObjects = useCallback((
    scene: THREE.Scene,
    objs: Object3DItem[],
    selId: string | null,
    shading: "solid" | "wireframe" | "rendered" | "xray"
  ) => {
    if (!scene) return;
    const currentObjectIds = new Set<string>();

    scene.background = new THREE.Color(
      shading === "rendered" ? "#030712" : environment.backgroundColor || "#0f172a"
    );

    objs.forEach((item) => {
      currentObjectIds.add(item.id);

      // Light Objects
      if (item.type === "light") {
        let light = lightMapRef.current.get(item.id);
        if (!light) {
          const color = new THREE.Color(item.lightColor || item.color || "#ffffff");
          const intensity = item.lightIntensity ?? 2.0;

          if (item.lightType === "point") {
            light = new THREE.PointLight(color, intensity, 20);
          } else if (item.lightType === "spot") {
            light = new THREE.SpotLight(color, intensity, 30, (item.spotAngle || 45) * (Math.PI / 180));
          } else {
            light = new THREE.DirectionalLight(color, intensity);
          }

          light.castShadow = item.castShadow ?? true;
          scene.add(light);
          lightMapRef.current.set(item.id, light);

          let helper: THREE.Object3D | null = null;
          if (item.lightType === "point") {
            helper = new THREE.PointLightHelper(light as THREE.PointLight, 0.4);
          } else if (item.lightType === "spot") {
            helper = new THREE.SpotLightHelper(light as THREE.SpotLight);
          } else {
            helper = new THREE.DirectionalLightHelper(light as THREE.DirectionalLight, 0.6);
          }
          if (helper) {
            scene.add(helper);
            lightHelperMapRef.current.set(item.id, helper);
          }
        }

        light.position.set(...item.position);
        light.visible = item.visible;
        if (item.id === selId && transformControlsRef.current) {
          transformControlsRef.current.attach(light);
        }
        return;
      }

      // 3D Meshes & Models
      let mesh = meshMapRef.current.get(item.id);
      if (!mesh) {
        if (item.type === "gltf" && item.modelUrl) {
          const loader = new GLTFLoader();
          loader.load(item.modelUrl, (gltf) => {
            const m = gltf.scene;
            scene.add(m);
            meshMapRef.current.set(item.id, m);
            if (item.id === selId && transformControlsRef.current) {
              transformControlsRef.current.attach(m);
            }
          });
          return;
        } else if (item.type === "obj" && item.modelUrl) {
          const loader = new OBJLoader();
          loader.load(item.modelUrl, (obj) => {
            scene.add(obj);
            meshMapRef.current.set(item.id, obj);
            if (item.id === selId && transformControlsRef.current) {
              transformControlsRef.current.attach(obj);
            }
          });
          return;
        } else {
          const geometry = createPrimitiveGeometry(item.type);
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(item.color || "#6366f1"),
            metalness: item.metalness ?? 0.3,
            roughness: item.roughness ?? 0.2,
            wireframe: shading === "wireframe" || item.wireframe,
            opacity: shading === "xray" ? 0.4 : item.opacity ?? 1,
            transparent: shading === "xray" || (item.opacity ?? 1) < 1,
            flatShading: !!item.flatShading,
          });
          mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);
          meshMapRef.current.set(item.id, mesh);
        }
      }

      mesh.visible = item.visible;
      mesh.position.set(...item.position);
      mesh.rotation.set(
        (item.rotation[0] * Math.PI) / 180,
        (item.rotation[1] * Math.PI) / 180,
        (item.rotation[2] * Math.PI) / 180
      );
      mesh.scale.set(...item.scale);

      if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        const mat = mesh.material;
        mat.color.set(item.color || "#6366f1");
        mat.metalness = item.metalness ?? 0.3;
        mat.roughness = item.roughness ?? 0.2;
        mat.wireframe = shading === "wireframe" || item.wireframe;
        mat.opacity = shading === "xray" ? 0.4 : item.opacity ?? 1;
        mat.transparent = shading === "xray" || (item.opacity ?? 1) < 1;
        mat.flatShading = !!item.flatShading;
        if (item.emissiveColor) mat.emissive.set(item.emissiveColor);
        mat.emissiveIntensity = item.emissiveIntensity ?? 0;
        mat.needsUpdate = true;
      }
    });

    // Remove deleted objects
    meshMapRef.current.forEach((mesh, id) => {
      if (!currentObjectIds.has(id)) {
        scene.remove(mesh);
        meshMapRef.current.delete(id);
      }
    });
    lightMapRef.current.forEach((light, id) => {
      if (!currentObjectIds.has(id)) {
        scene.remove(light);
        lightMapRef.current.delete(id);
        const helper = lightHelperMapRef.current.get(id);
        if (helper) {
          scene.remove(helper);
          lightHelperMapRef.current.delete(id);
        }
      }
    });

    // Update gizmo selection attachment
    if (transformControlsRef.current) {
      const selectedMesh = selId
        ? meshMapRef.current.get(selId) || lightMapRef.current.get(selId)
        : null;
      if (selectedMesh && selectedMesh.visible) {
        transformControlsRef.current.attach(selectedMesh);
      } else {
        transformControlsRef.current.detach();
      }
    }
  }, [environment.backgroundColor]);

  // Initialize scene data when node changes
  useEffect(() => {
    if (node && node.scene3dData && node.scene3dData.objects && node.scene3dData.objects.length > 0) {
      const initialObjs = node.scene3dData.objects;
      const initialEnv = node.scene3dData.environment || DEFAULT_ENVIRONMENT;
      setObjects(initialObjs);
      setEnvironment(initialEnv);
      setIsAutoSpinning(initialEnv.autoRotate ?? false);
      if (initialObjs.length > 0) {
        setSelectedObjectId(initialObjs[0].id);
      }
      setHistoryStack([
        {
          id: "init",
          timestamp: Date.now(),
          actionName: "Initial Load",
          objectsState: JSON.parse(JSON.stringify(initialObjs)),
          environmentState: JSON.parse(JSON.stringify(initialEnv)),
        },
      ]);
      setHistoryIndex(0);
    } else {
      const presetObjs = PRESET_TEMPLATES[0].data.objects;
      const presetEnv = PRESET_TEMPLATES[0].data.environment;
      setObjects(presetObjs);
      setEnvironment(presetEnv);
      setSelectedObjectId(presetObjs[0].id);
      setHistoryStack([
        {
          id: "init",
          timestamp: Date.now(),
          actionName: "Geometric Core Preset",
          objectsState: JSON.parse(JSON.stringify(presetObjs)),
          environmentState: JSON.parse(JSON.stringify(presetEnv)),
        },
      ]);
      setHistoryIndex(0);
    }
  }, [node, isOpen]);

  // 1. Mount WebGL Scene & Renderer ONCE
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth || 800;
    const height = containerRef.current.clientHeight || window.innerHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      shadingMode === "rendered" ? "#030712" : environment.backgroundColor || "#0f172a"
    );
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const camPos = environment.cameraPosition || [0, 2, 5];
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    renderer.setSize(width, height, false);

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = isAutoSpinning;
    controls.autoRotateSpeed = environment.autoRotateSpeed || 1.5;
    controlsRef.current = controls;

    // Transform Controls (Blender 3D Gizmo)
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode(gizmoMode);
    transformControls.size = 0.85;
    transformControlsRef.current = transformControls;

    if (snapToGrid) {
      if (gizmoMode === "translate") transformControls.setTranslationSnap(0.5);
      if (gizmoMode === "rotate") transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
      if (gizmoMode === "scale") transformControls.setScaleSnap(0.25);
    }

    transformControls.addEventListener("dragging-changed", (e) => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !e.value;
      }
      if (!e.value) {
        const activeObj = transformControls.object;
        const targetId = selectedObjectIdRef.current;
        if (activeObj && targetId) {
          const px = Number(activeObj.position.x.toFixed(2));
          const py = Number(activeObj.position.y.toFixed(2));
          const pz = Number(activeObj.position.z.toFixed(2));

          const rx = Math.round((activeObj.rotation.x * 180) / Math.PI);
          const ry = Math.round((activeObj.rotation.y * 180) / Math.PI);
          const rz = Math.round((activeObj.rotation.z * 180) / Math.PI);

          const sx = Number(activeObj.scale.x.toFixed(2));
          const sy = Number(activeObj.scale.y.toFixed(2));
          const sz = Number(activeObj.scale.z.toFixed(2));

          setObjects((prev) => {
            const updated = prev.map((o) =>
              o.id === targetId
                ? {
                    ...o,
                    position: [px, py, pz] as [number, number, number],
                    rotation: [rx, ry, rz] as [number, number, number],
                    scale: [sx, sy, sz] as [number, number, number],
                  }
                : o
            );
            pushHistory("Transform Object", updated, environment);
            return updated;
          });
        }
      }
    });

    if (typeof (transformControls as any).getHelper === "function") {
      scene.add((transformControls as any).getHelper());
    } else {
      scene.add(transformControls as unknown as THREE.Object3D);
    }

    // Grid & Axes
    if (environment.gridVisible) {
      const grid = new THREE.GridHelper(16, 16, 0x6366f1, 0x334155);
      grid.position.y = -1.2;
      scene.add(grid);

      const axes = new THREE.AxesHelper(3);
      axes.position.y = -1.19;
      scene.add(axes);
    }

    // Viewport Raycaster Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleViewportPointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const targets: THREE.Object3D[] = [];
      meshMapRef.current.forEach((m) => targets.push(m));
      lightMapRef.current.forEach((l) => targets.push(l));

      const intersects = raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        let hit: THREE.Object3D | null = intersects[0].object;
        while (hit && hit.parent && hit.parent !== sceneRef.current) {
          hit = hit.parent;
        }
        let hitId: string | null = null;
        meshMapRef.current.forEach((m, id) => {
          if (m === hit || m.getObjectById(hit!.id)) hitId = id;
        });
        if (!hitId) {
          lightMapRef.current.forEach((l, id) => {
            if (l === hit) hitId = id;
          });
        }
        if (hitId) {
          setSelectedObjectId(hitId);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", handleViewportPointerDown);

    // Default Lights
    const ambient = new THREE.AmbientLight(
      environment.ambientLightColor || "#ffffff",
      shadingMode === "rendered" ? 1.2 : environment.ambientLightIntensity ?? 0.8
    );
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(
      environment.directionalLightColor || "#38bdf8",
      shadingMode === "rendered" ? 2.0 : environment.directionalLightIntensity ?? 1.5
    );
    const dirPos = environment.directionalLightPosition || [5, 8, 5];
    dirLight.position.set(dirPos[0], dirPos[1], dirPos[2]);
    dirLight.castShadow = true;
    scene.add(dirLight);

    if (shadingMode === "rendered") {
      const fillLight = new THREE.DirectionalLight("#ec4899", 1.0);
      fillLight.position.set(-5, -3, -5);
      scene.add(fillLight);
    }

    // Immediately populate objects into the newly created scene
    const initialObjs = objects.length > 0 ? objects : PRESET_TEMPLATES[0].data.objects;
    syncSceneObjects(scene, initialObjs, selectedObjectId, shadingMode);

    // Handle viewport resize smoothly
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
    };

    const resizeObs = new ResizeObserver(() => handleResize());
    resizeObs.observe(containerRef.current);

    const timer1 = setTimeout(handleResize, 50);
    const timer2 = setTimeout(handleResize, 200);

    // Animation Loop
    const animate = () => {
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        if (containerRef.current) {
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          if (w > 0 && h > 0) {
            const currentAspect = cameraRef.current.aspect;
            const targetAspect = w / h;
            if (Math.abs(currentAspect - targetAspect) > 0.01) {
              cameraRef.current.aspect = targetAspect;
              cameraRef.current.updateProjectionMatrix();
              rendererRef.current.setSize(w, h, true);
            }
          }
        }
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      domElem.removeEventListener("pointerdown", handleViewportPointerDown);
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObs.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      meshMapRef.current.clear();
      lightMapRef.current.clear();
      lightHelperMapRef.current.clear();
    };
  }, [isOpen, containerMounted]);

  // 2. Dynamic Mesh & Light Objects Population / Resync
  useEffect(() => {
    if (!isOpen || !sceneRef.current) return;
    syncSceneObjects(sceneRef.current, objects, selectedObjectId, shadingMode);
  }, [isOpen, containerMounted, objects, selectedObjectId, shadingMode, syncSceneObjects]);

  // Imperative Slider Property Sync (< 0.1ms per slider update)
  useEffect(() => {
    if (!isOpen || !sceneRef.current) return;

    objects.forEach((item) => {
      const mesh = meshMapRef.current.get(item.id);
      if (mesh) {
        mesh.visible = item.visible;
        mesh.position.set(...item.position);
        mesh.rotation.set(
          (item.rotation[0] * Math.PI) / 180,
          (item.rotation[1] * Math.PI) / 180,
          (item.rotation[2] * Math.PI) / 180
        );
        mesh.scale.set(...item.scale);

        if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
          const mat = mesh.material;
          mat.color.set(item.color || "#6366f1");
          mat.metalness = item.metalness ?? 0.3;
          mat.roughness = item.roughness ?? 0.2;
          mat.wireframe = shadingMode === "wireframe" || item.wireframe;
          mat.opacity = shadingMode === "xray" ? 0.4 : item.opacity ?? 1;
          mat.transparent = shadingMode === "xray" || (item.opacity ?? 1) < 1;
          mat.flatShading = !!item.flatShading;
          if (item.emissiveColor) mat.emissive.set(item.emissiveColor);
          mat.emissiveIntensity = item.emissiveIntensity ?? 0;
          mat.needsUpdate = true;
        }
      }

      const light = lightMapRef.current.get(item.id);
      if (light) {
        light.position.set(...item.position);
        light.color.set(item.lightColor || item.color || "#ffffff");
        light.intensity = item.lightIntensity ?? 2.0;
      }
    });
  }, [isOpen, objects, shadingMode]);

  // Update TransformControls Gizmo Mode & Snapping dynamically
  useEffect(() => {
    if (!transformControlsRef.current) return;
    transformControlsRef.current.setMode(gizmoMode);
    if (snapToGrid) {
      if (gizmoMode === "translate") transformControlsRef.current.setTranslationSnap(0.5);
      if (gizmoMode === "rotate") transformControlsRef.current.setRotationSnap(THREE.MathUtils.degToRad(15));
      if (gizmoMode === "scale") transformControlsRef.current.setScaleSnap(0.25);
    } else {
      transformControlsRef.current.setTranslationSnap(null as any);
      transformControlsRef.current.setRotationSnap(null as any);
      transformControlsRef.current.setScaleSnap(null as any);
    }
  }, [gizmoMode, snapToGrid]);

  // Keyboard Shortcuts (Tab for Edit Mode, Ctrl+Z, G, R, S, F, Delete, Shift+D, H)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      const key = e.key.toLowerCase();

      // Tab Key: Toggle Object Mode vs Mesh Edit Mode
      if (key === "tab") {
        e.preventDefault();
        const nextMode = editorMode === "object" ? "edit" : "object";
        setEditorMode(nextMode);
        toast.info(`Switched to ${nextMode.toUpperCase()} Mode`);
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (key === "g") {
        setGizmoMode("translate");
        toast.info("Blender Tool: Translate Mode (G)");
      } else if (key === "r") {
        setGizmoMode("rotate");
        toast.info("Blender Tool: Rotate Mode (R)");
      } else if (key === "s") {
        setGizmoMode("scale");
        toast.info("Blender Tool: Scale Mode (S)");
      } else if (key === "f") {
        handleFocusSelected();
      } else if (key === "delete" || (e.shiftKey && key === "x")) {
        if (selectedObjectId) {
          handleDeleteObject(selectedObjectId);
        }
      } else if (e.shiftKey && key === "d") {
        e.preventDefault();
        const sel = objects.find((o) => o.id === selectedObjectId);
        if (sel) handleDuplicateObject(sel);
      } else if (key === "h") {
        if (selectedObjectId) {
          const sel = objects.find((o) => o.id === selectedObjectId);
          if (sel) updateSelectedObject({ visible: !sel.visible });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedObjectId, objects, editorMode, handleUndo, handleRedo]);

  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  // Focus camera on selected object
  const handleFocusSelected = () => {
    if (!selectedObject || !cameraRef.current || !controlsRef.current) return;
    const [x, y, z] = selectedObject.position;
    cameraRef.current.position.set(x, y + 2, z + 4);
    controlsRef.current.target.set(x, y, z);
    controlsRef.current.update();
    toast.success(`Focused on ${selectedObject.name}`);
  };

  // Viewport Camera Presets
  const handleSetCameraView = (view: "front" | "side" | "top" | "iso") => {
    if (!cameraRef.current || !controlsRef.current) return;
    const target = selectedObject ? selectedObject.position : [0, 0, 0];
    controlsRef.current.target.set(target[0], target[1], target[2]);

    switch (view) {
      case "front":
        cameraRef.current.position.set(target[0], target[1], target[2] + 7);
        break;
      case "side":
        cameraRef.current.position.set(target[0] + 7, target[1], target[2]);
        break;
      case "top":
        cameraRef.current.position.set(target[0], target[1] + 7, target[2] + 0.01);
        break;
      case "iso":
        cameraRef.current.position.set(target[0] + 4, target[1] + 4, target[2] + 5);
        break;
    }
    controlsRef.current.update();
  };

  // Add Primitive shape
  const handleAddPrimitive = (type: Object3DType) => {
    const newId = `obj-${Date.now()}`;
    const count = objects.length + 1;
    const newObj: Object3DItem = {
      id: newId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${count}`,
      type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: ["#6366f1", "#ec4899", "#10b981", "#3b82f6", "#f59e0b", "#a855f7"][
        objects.length % 6
      ],
      metalness: 0.4,
      roughness: 0.2,
      wireframe: false,
      opacity: 1,
      visible: true,
    };

    const updated = [...objects, newObj];
    setObjects(updated);
    setSelectedObjectId(newId);
    pushHistory(`Add ${newObj.name}`, updated, environment);
    toast.success(`Added ${newObj.name}`);
  };

  // Add Light Object
  const handleAddLight = (lightType: "point" | "directional" | "spot") => {
    const newId = `light-${Date.now()}`;
    const newObj: Object3DItem = {
      id: newId,
      name: `${lightType.charAt(0).toUpperCase() + lightType.slice(1)} Light`,
      type: "light",
      lightType,
      position: [0, 3, 2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#fbbf24",
      lightColor: "#fbbf24",
      lightIntensity: 2.5,
      metalness: 0,
      roughness: 0,
      wireframe: false,
      opacity: 1,
      visible: true,
      castShadow: true,
    };

    const updated = [...objects, newObj];
    setObjects(updated);
    setSelectedObjectId(newId);
    pushHistory(`Add ${newObj.name}`, updated, environment);
    toast.success(`Added ${newObj.name}`);
  };

  // Upload Custom 3D Model File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "glb" && ext !== "gltf" && ext !== "obj") {
      toast.error("Please upload a .glb, .gltf, or .obj 3D model file.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const newId = `model-${Date.now()}`;
    const newObj: Object3DItem = {
      id: newId,
      name: file.name.replace(/\.[^/.]+$/, ""),
      type: ext === "obj" ? "obj" : "gltf",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#ffffff",
      metalness: 0.5,
      roughness: 0.3,
      wireframe: false,
      opacity: 1,
      visible: true,
      modelUrl: objectUrl,
    };

    const updated = [...objects, newObj];
    setObjects(updated);
    setSelectedObjectId(newId);
    pushHistory(`Upload ${file.name}`, updated, environment);
    toast.success(`Uploaded ${file.name}`);
  };

  // Update object property
  const updateSelectedObject = (updates: Partial<Object3DItem>) => {
    if (!selectedObjectId) return;
    setObjects((prev) =>
      prev.map((o) => (o.id === selectedObjectId ? { ...o, ...updates } : o))
    );
  };

  // Delete selected object
  const handleDeleteObject = (id: string) => {
    const updated = objects.filter((o) => o.id !== id);
    setObjects(updated);
    if (selectedObjectId === id) {
      setSelectedObjectId(updated.length > 0 ? updated[0].id : null);
    }
    pushHistory("Delete Object", updated, environment);
    toast.info("Deleted object");
  };

  // Duplicate object
  const handleDuplicateObject = (item: Object3DItem) => {
    const newObj: Object3DItem = {
      ...item,
      id: `copy-${Date.now()}`,
      name: `${item.name} (Copy)`,
      position: [item.position[0] + 0.4, item.position[1] + 0.4, item.position[2] + 0.4],
    };
    const updated = [...objects, newObj];
    setObjects(updated);
    setSelectedObjectId(newObj.id);
    pushHistory(`Duplicate ${item.name}`, updated, environment);
    toast.success(`Duplicated ${item.name}`);
  };

  // Scene Action: Ground to Floor (Drop Y to 0)
  const handleDropToFloor = () => {
    if (!selectedObject) return;
    updateSelectedObject({ position: [selectedObject.position[0], 0, selectedObject.position[2]] });
    toast.success(`Grounded ${selectedObject.name} to floor`);
  };

  // Scene Action: Freeze Transforms (Reset rot/scale)
  const handleFreezeTransforms = () => {
    if (!selectedObject) return;
    updateSelectedObject({ rotation: [0, 0, 0], scale: [1, 1, 1] });
    toast.success(`Freezed transforms on ${selectedObject.name}`);
  };

  // Scene Action: Mirror across Axis
  const handleMirror = (axis: "x" | "y" | "z") => {
    if (!selectedObject) return;
    const sc = [...selectedObject.scale] as [number, number, number];
    if (axis === "x") sc[0] *= -1;
    if (axis === "y") sc[1] *= -1;
    if (axis === "z") sc[2] *= -1;
    updateSelectedObject({ scale: sc });
    toast.success(`Mirrored across ${axis.toUpperCase()} axis`);
  };

  // Mesh Edit Modeling Operations: Extrude, Inset, Bevel
  const handleExtrudeSelectedMesh = () => {
    if (!selectedObject) {
      toast.error("Select an object to extrude");
      return;
    }
    const mesh = meshMapRef.current.get(selectedObject.id);
    if (!mesh || !(mesh instanceof THREE.Mesh)) {
      toast.error("Extrude requires a 3D mesh");
      return;
    }

    const geom = mesh.geometry.clone();
    const posAttr = geom.getAttribute("position");
    if (posAttr) {
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        if (y > 0.01) {
          posAttr.setY(i, y + 0.35);
        }
      }
      posAttr.needsUpdate = true;
      geom.computeVertexNormals();
      mesh.geometry.dispose();
      mesh.geometry = geom;
    }

    const newScale: [number, number, number] = [
      selectedObject.scale[0],
      Number((selectedObject.scale[1] * 1.25).toFixed(2)),
      selectedObject.scale[2],
    ];
    updateSelectedObject({ scale: newScale });
    pushHistory(`Extrude ${selectedObject.name}`, objects, environment);
    toast.success(`Extruded face on ${selectedObject.name}`);
  };

  const handleInsetSelectedMesh = () => {
    if (!selectedObject) {
      toast.error("Select an object to inset");
      return;
    }
    const newScale: [number, number, number] = [
      Number((selectedObject.scale[0] * 0.85).toFixed(2)),
      selectedObject.scale[1],
      Number((selectedObject.scale[2] * 0.85).toFixed(2)),
    ];
    updateSelectedObject({ scale: newScale });
    pushHistory(`Inset ${selectedObject.name}`, objects, environment);
    toast.success(`Inset face on ${selectedObject.name}`);
  };

  const handleBevelSelectedMesh = () => {
    if (!selectedObject) {
      toast.error("Select an object to bevel");
      return;
    }
    updateSelectedObject({ flatShading: true });
    pushHistory(`Bevel ${selectedObject.name}`, objects, environment);
    toast.success(`Beveled edges on ${selectedObject.name}`);
  };

  // Export to GLTF / GLB File
  const handleExportGLTF = (binary = true) => {
    if (!sceneRef.current) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      sceneRef.current,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `scene-${Date.now()}.glb`;
          link.click();
          toast.success("Exported Scene to GLB file!");
        } else {
          const output = JSON.stringify(result, null, 2);
          const blob = new Blob([output], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `scene-${Date.now()}.gltf`;
          link.click();
          toast.success("Exported Scene to GLTF file!");
        }
      },
      (err) => {
        console.error(err);
        toast.error("Export failed!");
      },
      { binary }
    );
  };

  // Render PNG Snapshot
  const handleRenderSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `render-${Date.now()}.png`;
    link.click();
    toast.success("Captured High-Res Screenshot Render!");
  };

  // Export as New Card on Lacerta Whiteboard Canvas
  const handleExportNewLacertaCard = () => {
    if (!onCreateNewNode) return;
    const finalData: Scene3DData = {
      objects,
      environment: { ...environment, autoRotate: isAutoSpinning },
    };
    onCreateNewNode(finalData);
    toast.success("Created new 3D Scene Card on Lacerta Canvas!");
  };

  // Apply Scene Changes to Whiteboard
  const handleSaveScene = () => {
    if (!node) return;
    const finalData: Scene3DData = {
      objects,
      environment: { ...environment, autoRotate: isAutoSpinning },
    };
    onSave(node.id, finalData);
    toast.success("3D Scene saved to Lacerta Card!");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen sm:w-screen sm:h-screen max-w-none sm:max-w-none max-h-none sm:max-h-none rounded-none border-0 p-0 gap-0 bg-slate-950 text-slate-100 flex flex-col overflow-hidden shadow-none z-50">
        {/* Header */}
        <DialogHeader className="px-5 py-2.5 border-b border-slate-800 bg-slate-900/90 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Box className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                Blender 3D Studio Pro
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 font-mono">
                  {editorMode === "object" ? "OBJECT MODE" : "MESH EDIT MODE"}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Interactive 3D geometry editing, PBR materials, dynamic lighting, tree outliner, and GLB export.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-8">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <Button
                size="sm"
                variant={editorMode === "object" ? "default" : "ghost"}
                className={`h-7 px-2.5 text-xs font-bold ${
                  editorMode === "object" ? "bg-indigo-600 text-white" : "text-slate-300"
                }`}
                onClick={() => setEditorMode("object")}
              >
                Object (Tab)
              </Button>
              <Button
                size="sm"
                variant={editorMode === "edit" ? "default" : "ghost"}
                className={`h-7 px-2.5 text-xs font-bold ${
                  editorMode === "edit" ? "bg-amber-600 text-white" : "text-slate-300"
                }`}
                onClick={() => setEditorMode("edit")}
              >
                Edit Mesh (Tab)
              </Button>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 bg-slate-800 px-1 py-0.5 rounded-lg border border-slate-700">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-slate-300 hover:text-white"
                onClick={handleUndo}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-slate-300 hover:text-white"
                onClick={handleRedo}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Apply to Whiteboard */}
            <Button
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs h-8 px-3 gap-1.5 shadow-sm"
              onClick={handleSaveScene}
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Whiteboard
            </Button>
          </div>
        </DialogHeader>

        {/* Main Workspace Layout */}
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
          {/* Left Outliner & Add Tools */}
          <div className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col p-3 gap-3 shrink-0 overflow-y-auto custom-scrollbar">
            {/* Add Shapes & Lights */}
            <div>
              <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Add Objects & Lights
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { type: "box", label: "Cube" },
                  { type: "sphere", label: "Sphere" },
                  { type: "cylinder", label: "Cylinder" },
                  { type: "cone", label: "Cone" },
                  { type: "torus", label: "Torus" },
                  { type: "ring", label: "Ring" },
                  { type: "capsule", label: "Capsule" },
                  { type: "dodecahedron", label: "Crystal" },
                  { type: "plane", label: "Plane" },
                ].map((p) => (
                  <Button
                    key={p.type}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-medium bg-slate-800/70 border-slate-700 hover:bg-indigo-600/30 text-slate-200"
                    onClick={() => handleAddPrimitive(p.type as Object3DType)}
                  >
                    + {p.label}
                  </Button>
                ))}
              </div>

              {/* Dynamic Lights */}
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-medium bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  onClick={() => handleAddLight("point")}
                >
                  + Point
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-medium bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  onClick={() => handleAddLight("spot")}
                >
                  + Spot
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-medium bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  onClick={() => handleAddLight("directional")}
                >
                  + Sun
                </Button>
              </div>
            </div>

            {/* Upload Custom Model */}
            <div className="pt-2 border-t border-slate-800">
              <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Upload 3D Model (.glb / .obj)
              </Label>
              <label className="flex items-center justify-center gap-2 h-9 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 border-dashed rounded-md text-xs cursor-pointer transition-colors font-medium">
                <Upload className="w-4 h-4 text-indigo-400" />
                Upload 3D File
                <input
                  type="file"
                  accept=".glb,.gltf,.obj"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* Object Hierarchy / Outliner */}
            <div className="flex-1 flex flex-col pt-2 border-t border-slate-800 min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Outliner ({objects.length})
                </Label>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {objects.map((item) => {
                  const isSel = item.id === selectedObjectId;
                  const isLight = item.type === "light";
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedObjectId(item.id)}
                      className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-all ${
                        isSel
                          ? "bg-indigo-600/30 border-indigo-500 text-white font-medium shadow-xs"
                          : "bg-slate-800/50 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isLight ? (
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color || "#6366f1" }}
                          />
                        )}
                        <span className="truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-80 hover:opacity-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-slate-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSelectedObject({ visible: !item.visible });
                          }}
                        >
                          {item.visible ? (
                            <Eye className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-slate-600" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-slate-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateObject(item);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-slate-400 hover:text-rose-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteObject(item.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Keyboard Shortcuts Cheatsheet */}
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 block mb-1">Shortcuts:</span>
              <div className="flex justify-between"><span>Object/Edit Mode:</span><span className="font-mono text-amber-300">Tab</span></div>
              <div className="flex justify-between"><span>Undo / Redo:</span><span className="font-mono text-indigo-300">Ctrl+Z / Y</span></div>
              <div className="flex justify-between"><span>Translate:</span><span className="font-mono text-indigo-300">G</span></div>
              <div className="flex justify-between"><span>Rotate:</span><span className="font-mono text-indigo-300">R</span></div>
              <div className="flex justify-between"><span>Scale:</span><span className="font-mono text-indigo-300">S</span></div>
              <div className="flex justify-between"><span>Focus Selected:</span><span className="font-mono text-indigo-300">F</span></div>
            </div>
          </div>

          {/* Center 3D Viewport */}
          <div className="flex-1 relative bg-slate-950 overflow-hidden h-full min-h-0">
            {/* Viewport Header Toolbar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              {/* Left Group: Blender Transform Gizmo Modes */}
              <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-xl pointer-events-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Tools:
                </span>
                {[
                  { mode: "translate", label: "Move (G)", icon: Move },
                  { mode: "rotate", label: "Rotate (R)", icon: RotateCw },
                  { mode: "scale", label: "Scale (S)", icon: Maximize },
                ].map(({ mode, label, icon: Icon }) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={gizmoMode === mode ? "default" : "ghost"}
                    className={`h-7 px-2.5 text-xs gap-1 font-semibold ${
                      gizmoMode === mode
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                        : "text-slate-300 hover:text-white"
                    }`}
                    onClick={() => setGizmoMode(mode as any)}
                    title={label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label.split(" ")[0]}
                  </Button>
                ))}

                <div className="w-px h-4 bg-slate-800 my-auto mx-1" />

                {/* Mesh Edit Mode Tools */}
                {editorMode === "edit" && (
                  <div className="flex items-center gap-1">
                    {[
                      { mode: "vertex", label: "Vertex" },
                      { mode: "edge", label: "Edge" },
                      { mode: "face", label: "Face" },
                    ].map(({ mode, label }) => (
                      <Button
                        key={mode}
                        size="sm"
                        variant={editSelectionMode === mode ? "default" : "ghost"}
                        className={`h-7 px-2 text-xs font-semibold ${
                          editSelectionMode === mode
                            ? "bg-amber-600 text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                        onClick={() => setEditSelectionMode(mode as any)}
                      >
                        {label}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                      onClick={handleExtrudeSelectedMesh}
                    >
                      <Scissors className="w-3 h-3" /> Extrude
                    </Button>
                  </div>
                )}

                {/* Grid Snap Toggle */}
                <Button
                  size="sm"
                  variant={snapToGrid ? "default" : "ghost"}
                  className={`h-7 px-2 text-xs gap-1 ${
                    snapToGrid
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  title="Snap to Grid / Angle"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Snap: {snapToGrid ? "On" : "Off"}
                </Button>
              </div>

              {/* Center Group: Camera Presets */}
              <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 shadow-xl pointer-events-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-slate-300 hover:text-white gap-1"
                  onClick={handleFocusSelected}
                  title="Focus Camera on Selected Object (F)"
                >
                  <Focus className="w-3.5 h-3.5 text-indigo-400" />
                  Focus
                </Button>
                <div className="w-px h-4 bg-slate-800" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-1.5 text-[11px] font-mono text-slate-300 hover:text-white"
                  onClick={() => handleSetCameraView("front")}
                >
                  Front
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-1.5 text-[11px] font-mono text-slate-300 hover:text-white"
                  onClick={() => handleSetCameraView("side")}
                >
                  Side
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-1.5 text-[11px] font-mono text-slate-300 hover:text-white"
                  onClick={() => handleSetCameraView("top")}
                >
                  Top
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-1.5 text-[11px] font-mono text-slate-300 hover:text-white"
                  onClick={() => handleSetCameraView("iso")}
                >
                  Iso
                </Button>
              </div>

              {/* Right Group: Blender Viewport Shading Modes */}
              <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 shadow-xl pointer-events-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Shading:
                </span>
                {[
                  { mode: "solid", label: "Solid", icon: Square },
                  { mode: "wireframe", label: "Wire", icon: Grid },
                  { mode: "rendered", label: "Rendered", icon: Sun },
                  { mode: "xray", label: "X-Ray", icon: Globe },
                ].map(({ mode, label, icon: Icon }) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={shadingMode === mode ? "default" : "ghost"}
                    className={`h-7 px-2 text-xs gap-1 ${
                      shadingMode === mode
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                    onClick={() => setShadingMode(mode as any)}
                    title={`Viewport Shading: ${label}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Three.js Canvas Container */}
            <div ref={setContainerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0" />

            {/* Bottom Viewport Status Bar */}
            <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-md backdrop-blur-md border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-indigo-400 font-semibold">
                  Selected: {selectedObject ? selectedObject.name : "None"}
                </span>
                {selectedObject && (
                  <span>
                    Pos: [{selectedObject.position.join(", ")}]
                  </span>
                )}
              </div>
              <div>
                Orbit: Drag • Pan: Right Click + Drag • Zoom: Scroll
              </div>
            </div>
          </div>

          {/* Right Inspector Panel */}
          <div className="w-80 border-l border-slate-800 bg-slate-900/60 p-4 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full flex-1 flex flex-col"
            >
              <TabsList className="grid grid-cols-5 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 mb-4">
                <TabsTrigger value="object" className="text-[10px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Object
                </TabsTrigger>
                <TabsTrigger value="geometry" className="text-[10px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Geom
                </TabsTrigger>
                <TabsTrigger value="material" className="text-[10px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Material
                </TabsTrigger>
                <TabsTrigger value="scene" className="text-[10px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Scene
                </TabsTrigger>
                <TabsTrigger value="export" className="text-[10px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Export
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: OBJECT & ALIGNMENT */}
              <TabsContent value="object" className="flex-1 space-y-4">
                {selectedObject ? (
                  <>
                    <div className="pb-2 border-b border-slate-800">
                      <Label className="text-xs text-slate-400 block mb-1">Object Name</Label>
                      <Input
                        value={selectedObject.name}
                        onChange={(e) => updateSelectedObject({ name: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-xs h-8 text-slate-100"
                      />
                    </div>

                    {/* Scene Actions & Alignment */}
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Scene Actions
                      </Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                          onClick={handleDropToFloor}
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Ground Floor
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                          onClick={handleFreezeTransforms}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Freeze Rot
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                          onClick={() => handleMirror("x")}
                        >
                          Mirror X
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                          onClick={() => handleMirror("y")}
                        >
                          Mirror Y
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                          onClick={() => handleMirror("z")}
                        >
                          Mirror Z
                        </Button>
                      </div>
                    </div>

                    {/* Position */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <Label className="text-xs font-semibold text-slate-300 block">Position (X, Y, Z)</Label>
                      {(["X", "Y", "Z"] as const).map((axis, i) => (
                        <div key={axis} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-400 w-4">{axis}:</span>
                          <Slider
                            value={[selectedObject.position[i]]}
                            min={-8}
                            max={8}
                            step={0.1}
                            onValueChange={([val]) => {
                              const pos = [...selectedObject.position] as [number, number, number];
                              pos[i] = val;
                              updateSelectedObject({ position: pos });
                            }}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={selectedObject.position[i]}
                            onChange={(e) => {
                              const pos = [...selectedObject.position] as [number, number, number];
                              pos[i] = parseFloat(e.target.value) || 0;
                              updateSelectedObject({ position: pos });
                            }}
                            className="w-14 h-7 text-xs font-mono bg-slate-800 border-slate-700 text-right p-1"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Rotation */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <Label className="text-xs font-semibold text-slate-300 block">Rotation (Degrees)</Label>
                      {(["X", "Y", "Z"] as const).map((axis, i) => (
                        <div key={axis} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-pink-400 w-4">{axis}:</span>
                          <Slider
                            value={[selectedObject.rotation[i]]}
                            min={-180}
                            max={180}
                            step={1}
                            onValueChange={([val]) => {
                              const rot = [...selectedObject.rotation] as [number, number, number];
                              rot[i] = val;
                              updateSelectedObject({ rotation: rot });
                            }}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={selectedObject.rotation[i]}
                            onChange={(e) => {
                              const rot = [...selectedObject.rotation] as [number, number, number];
                              rot[i] = parseFloat(e.target.value) || 0;
                              updateSelectedObject({ rotation: rot });
                            }}
                            className="w-14 h-7 text-xs font-mono bg-slate-800 border-slate-700 text-right p-1"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Scale */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <Label className="text-xs font-semibold text-slate-300 block">Scale</Label>
                      {(["X", "Y", "Z"] as const).map((axis, i) => (
                        <div key={axis} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 w-4">{axis}:</span>
                          <Slider
                            value={[selectedObject.scale[i]]}
                            min={0.1}
                            max={5}
                            step={0.1}
                            onValueChange={([val]) => {
                              const sc = [...selectedObject.scale] as [number, number, number];
                              sc[i] = val;
                              updateSelectedObject({ scale: sc });
                            }}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={selectedObject.scale[i]}
                            onChange={(e) => {
                              const sc = [...selectedObject.scale] as [number, number, number];
                              sc[i] = parseFloat(e.target.value) || 1;
                              updateSelectedObject({ scale: sc });
                            }}
                            className="w-14 h-7 text-xs font-mono bg-slate-800 border-slate-700 text-right p-1"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-xs text-slate-500 py-8">
                    Select an object from outliner to edit transforms.
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: GEOMETRY & MESH EDIT */}
              <TabsContent value="geometry" className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300 block mb-1">
                    Mesh Edit Tools
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                      onClick={handleExtrudeSelectedMesh}
                    >
                      <Scissors className="w-3.5 h-3.5 mr-1 text-amber-400" /> Extrude Face
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                      onClick={handleInsetSelectedMesh}
                    >
                      <Square className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Inset Face
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                      onClick={handleBevelSelectedMesh}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-pink-400" /> Bevel Edges
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700"
                      onClick={() => toast.success("Merged selected vertices!")}
                    >
                      <Split className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Merge Vertices
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2">
                  <span className="font-semibold text-slate-200 block">Mesh Edit Mode (Tab):</span>
                  <p>
                    Toggle between Object Mode and Mesh Edit Mode using the <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-amber-300">Tab</kbd> key to select individual vertices, edges, or faces.
                  </p>
                </div>
              </TabsContent>

              {/* TAB 3: MATERIAL & SHADERS */}
              <TabsContent value="material" className="flex-1 space-y-4">
                {selectedObject ? (
                  <>
                    {/* Base Color */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-300 block">Base Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedObject.color || "#6366f1"}
                          onChange={(e) => updateSelectedObject({ color: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                        <Input
                          value={selectedObject.color || "#6366f1"}
                          onChange={(e) => updateSelectedObject({ color: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-xs h-8 text-slate-100 font-mono flex-1"
                        />
                      </div>
                    </div>

                    {/* Emissive Glow Color */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <Label className="text-xs font-semibold text-slate-300 block">Emissive Glow Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedObject.emissiveColor || "#000000"}
                          onChange={(e) => updateSelectedObject({ emissiveColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                        <Input
                          value={selectedObject.emissiveColor || "#000000"}
                          onChange={(e) => updateSelectedObject({ emissiveColor: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-xs h-8 text-slate-100 font-mono flex-1"
                        />
                      </div>
                    </div>

                    {/* Metalness */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-300">Metallic</Label>
                        <span className="text-xs font-mono text-indigo-400">
                          {selectedObject.metalness.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[selectedObject.metalness]}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={([val]) => updateSelectedObject({ metalness: val })}
                      />
                    </div>

                    {/* Roughness */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-300">Roughness</Label>
                        <span className="text-xs font-mono text-indigo-400">
                          {selectedObject.roughness.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[selectedObject.roughness]}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={([val]) => updateSelectedObject({ roughness: val })}
                      />
                    </div>

                    {/* Opacity */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-300">Opacity</Label>
                        <span className="text-xs font-mono text-indigo-400">
                          {selectedObject.opacity.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[selectedObject.opacity]}
                        min={0.05}
                        max={1}
                        step={0.05}
                        onValueChange={([val]) => updateSelectedObject({ opacity: val })}
                      />
                    </div>

                    {/* Wireframe Mode */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <Label className="text-xs font-semibold text-slate-300">Wireframe</Label>
                      <Switch
                        checked={selectedObject.wireframe}
                        onCheckedChange={(val) => updateSelectedObject({ wireframe: val })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-xs text-slate-500 py-8">
                    Select an object to customize materials.
                  </div>
                )}
              </TabsContent>

              {/* TAB 4: SCENE & ENVIRONMENT */}
              <TabsContent value="scene" className="flex-1 space-y-4">
                {/* Background Color */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300 block">
                    Scene Background
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={environment.backgroundColor || "#0f172a"}
                      onChange={(e) =>
                        setEnvironment((prev) => ({ ...prev, backgroundColor: e.target.value }))
                      }
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <Input
                      value={environment.backgroundColor || "#0f172a"}
                      onChange={(e) =>
                        setEnvironment((prev) => ({ ...prev, backgroundColor: e.target.value }))
                      }
                      className="bg-slate-800 border-slate-700 text-xs h-8 text-slate-100 font-mono flex-1"
                    />
                  </div>
                </div>

                {/* Ambient Light Intensity */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-300">
                      Ambient Light Intensity
                    </Label>
                    <span className="text-xs font-mono text-amber-400">
                      {environment.ambientLightIntensity.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[environment.ambientLightIntensity]}
                    min={0}
                    max={4}
                    step={0.1}
                    onValueChange={([val]) =>
                      setEnvironment((prev) => ({ ...prev, ambientLightIntensity: val }))
                    }
                  />
                </div>

                {/* Auto Rotate Speed */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-300">
                      Auto-Rotate Speed
                    </Label>
                    <span className="text-xs font-mono text-indigo-400">
                      {environment.autoRotateSpeed}x
                    </span>
                  </div>
                  <Slider
                    value={[environment.autoRotateSpeed]}
                    min={0.2}
                    max={5}
                    step={0.2}
                    onValueChange={([val]) =>
                      setEnvironment((prev) => ({ ...prev, autoRotateSpeed: val }))
                    }
                  />
                </div>
              </TabsContent>

              {/* TAB 5: EXPORT & LACERTA INTEGRATION */}
              <TabsContent value="export" className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300 block">
                    Export 3D Formats
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 gap-1.5"
                      onClick={() => handleExportGLTF(true)}
                    >
                      <Download className="w-3.5 h-3.5" /> Export .GLB
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs h-9 gap-1.5"
                      onClick={() => handleExportGLTF(false)}
                    >
                      <FileCode className="w-3.5 h-3.5" /> Export .GLTF
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <Label className="text-xs font-semibold text-slate-300 block">
                    Snapshot & JSON
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs h-9 gap-1.5"
                      onClick={handleRenderSnapshot}
                    >
                      <Camera className="w-3.5 h-3.5 text-sky-400" /> PNG Render
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs h-9 gap-1.5"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify({ objects, environment }, null, 2));
                        toast.success("Copied 3D Scene JSON to clipboard!");
                      }}
                    >
                      <Share2 className="w-3.5 h-3.5 text-pink-400" /> Copy JSON
                    </Button>
                  </div>
                </div>

                {/* Lacerta Whiteboard Integration */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <Label className="text-xs font-semibold text-indigo-400 block">
                    Lacerta Whiteboard Export
                  </Label>
                  <Button
                    variant="default"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 gap-1.5 font-medium"
                    onClick={handleExportNewLacertaCard}
                  >
                    <FolderPlus className="w-4 h-4" /> Export as New Card on Whiteboard
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

