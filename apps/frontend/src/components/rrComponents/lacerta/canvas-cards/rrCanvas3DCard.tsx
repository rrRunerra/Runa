"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { CanvasNode, Object3DItem, Scene3DData } from "../types";
import { Box, Play, Pause, RotateCcw, Edit3, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RrCanvas3DCardProps {
  node: CanvasNode;
  onOpenEditor?: (node: CanvasNode) => void;
}

const DEFAULT_SCENE_DATA: Scene3DData = {
  objects: [
    {
      id: "default-cube",
      name: "Core Cube",
      type: "box",
      position: [0, 0, 0],
      rotation: [20, 35, 0],
      scale: [1.2, 1.2, 1.2],
      color: "#6366f1",
      metalness: 0.3,
      roughness: 0.2,
      wireframe: false,
      opacity: 1,
      visible: true,
    },
    {
      id: "default-torus",
      name: "Orbit Ring",
      type: "torus",
      position: [0, 0, 0],
      rotation: [70, 0, 0],
      scale: [1, 1, 1],
      color: "#ec4899",
      metalness: 0.8,
      roughness: 0.1,
      wireframe: true,
      opacity: 0.8,
      visible: true,
    },
  ],
  environment: {
    backgroundColor: "#0f172a",
    gridVisible: true,
    autoRotate: false,
    autoRotateSpeed: 1.5,
    ambientLightColor: "#ffffff",
    ambientLightIntensity: 0.8,
    directionalLightColor: "#38bdf8",
    directionalLightIntensity: 1.5,
    directionalLightPosition: [5, 8, 5],
  },
};

export function createPrimitiveGeometry(type: Object3DItem["type"]): THREE.BufferGeometry {
  switch (type) {
    case "box":
      return new THREE.BoxGeometry(1, 1, 1);
    case "sphere":
      return new THREE.SphereGeometry(0.7, 32, 32);
    case "cylinder":
      return new THREE.CylinderGeometry(0.6, 0.6, 1.2, 32);
    case "cone":
      return new THREE.ConeGeometry(0.7, 1.2, 32);
    case "torus":
      return new THREE.TorusGeometry(0.7, 0.25, 16, 64);
    case "plane":
      return new THREE.PlaneGeometry(1.5, 1.5);
    case "ring":
      return new THREE.RingGeometry(0.4, 0.8, 32);
    case "capsule":
      return new THREE.CapsuleGeometry(0.4, 0.8, 16, 32);
    case "dodecahedron":
      return new THREE.DodecahedronGeometry(0.7, 0);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

export default function RrCanvas3DCard({ node, onOpenEditor }: RrCanvas3DCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);

  const sceneData: Scene3DData = node.scene3dData || DEFAULT_SCENE_DATA;
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(
    sceneData.environment?.autoRotate ?? false
  );

  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 200;

    // Create Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(sceneData.environment.backgroundColor || "#0f172a");
    sceneRef.current = scene;

    // Create Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const camPos = sceneData.environment.cameraPosition || [0, 2, 5];
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    cameraRef.current = camera;

    // Create Renderer with antialias
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = isAutoSpinning;
    controls.autoRotateSpeed = sceneData.environment.autoRotateSpeed || 1.5;
    controlsRef.current = controls;

    // Grid Helper
    if (sceneData.environment.gridVisible) {
      const grid = new THREE.GridHelper(10, 10, 0x64748b, 0x334155);
      grid.position.y = -1;
      scene.add(grid);
    }

    // Lights
    const ambient = new THREE.AmbientLight(
      sceneData.environment.ambientLightColor || "#ffffff",
      sceneData.environment.ambientLightIntensity ?? 0.8
    );
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(
      sceneData.environment.directionalLightColor || "#38bdf8",
      sceneData.environment.directionalLightIntensity ?? 1.5
    );
    const dirPos = sceneData.environment.directionalLightPosition || [5, 8, 5];
    dirLight.position.set(dirPos[0], dirPos[1], dirPos[2]);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Objects Group
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // Populate objects
    (sceneData.objects || []).forEach((item) => {
      if (!item.visible) return;

      if (item.type === "light") {
        let light: THREE.Light;
        const color = new THREE.Color(item.lightColor || item.color || "#ffffff");
        const intensity = item.lightIntensity ?? 2.0;

        if (item.lightType === "point") {
          light = new THREE.PointLight(color, intensity, 20);
        } else if (item.lightType === "spot") {
          light = new THREE.SpotLight(color, intensity, 30, (item.spotAngle || 45) * (Math.PI / 180));
        } else {
          light = new THREE.DirectionalLight(color, intensity);
        }
        light.position.set(...item.position);
        light.castShadow = item.castShadow ?? true;
        objectsGroup.add(light);
      } else if (item.type === "gltf" && item.modelUrl) {
        const loader = new GLTFLoader();
        loader.load(
          item.modelUrl,
          (gltf) => {
            const model = gltf.scene;
            model.position.set(...item.position);
            model.rotation.set(
              (item.rotation[0] * Math.PI) / 180,
              (item.rotation[1] * Math.PI) / 180,
              (item.rotation[2] * Math.PI) / 180
            );
            model.scale.set(...item.scale);
            objectsGroup.add(model);
          },
          undefined,
          (err) => console.warn("Failed to load GLTF model:", err)
        );
      } else if (item.type === "obj" && item.modelUrl) {
        const loader = new OBJLoader();
        loader.load(
          item.modelUrl,
          (obj) => {
            obj.position.set(...item.position);
            obj.rotation.set(
              (item.rotation[0] * Math.PI) / 180,
              (item.rotation[1] * Math.PI) / 180,
              (item.rotation[2] * Math.PI) / 180
            );
            obj.scale.set(...item.scale);
            objectsGroup.add(obj);
          },
          undefined,
          (err) => console.warn("Failed to load OBJ model:", err)
        );
      } else {
        const geometry = createPrimitiveGeometry(item.type);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(item.color || "#6366f1"),
          metalness: item.metalness ?? 0.3,
          roughness: item.roughness ?? 0.2,
          wireframe: !!item.wireframe,
          opacity: item.opacity ?? 1,
          transparent: (item.opacity ?? 1) < 1,
          flatShading: !!item.flatShading,
          emissive: item.emissiveColor ? new THREE.Color(item.emissiveColor) : new THREE.Color("#000000"),
          emissiveIntensity: item.emissiveIntensity ?? 0,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...item.position);
        mesh.rotation.set(
          (item.rotation[0] * Math.PI) / 180,
          (item.rotation[1] * Math.PI) / 180,
          (item.rotation[2] * Math.PI) / 180
        );
        mesh.scale.set(...item.scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        objectsGroup.add(mesh);
      }
    });

    // Animation Loop
    const animate = () => {
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [sceneData, isAutoSpinning]);

  useEffect(() => {
    initScene();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [initScene]);

  // Update auto rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoSpinning;
    }
  }, [isAutoSpinning]);

  const handleResetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      const camPos = sceneData.environment.cameraPosition || [0, 2, 5];
      cameraRef.current.position.set(camPos[0], camPos[1], camPos[2]);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-md group/card select-none"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      {/* Header bar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-900/80 backdrop-blur-md border border-slate-700/60 opacity-90 group-hover/card:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
          <Box className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="truncate max-w-[120px]">
            {sceneData.objects?.[0]?.name ? `3D: ${sceneData.objects[0].name}` : "3D Scene"}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            {sceneData.objects?.length || 0} obj
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-slate-300 hover:text-white hover:bg-slate-800/70"
            onClick={() => setIsAutoSpinning(!isAutoSpinning)}
            title={isAutoSpinning ? "Pause Auto-Rotate" : "Start Auto-Rotate"}
          >
            {isAutoSpinning ? <Pause className="w-3 h-3 text-indigo-400" /> : <Play className="w-3 h-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-slate-300 hover:text-white hover:bg-slate-800/70"
            onClick={handleResetCamera}
            title="Reset Camera View"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          {onOpenEditor && (
            <Button
              size="sm"
              variant="default"
              className="h-6 px-2 text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
              onClick={() => onOpenEditor(node)}
            >
              <Edit3 className="w-3 h-3" />
              Edit 3D
            </Button>
          )}
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full min-h-[160px] cursor-grab active:cursor-grabbing" />

      {/* Footer hint */}
      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] text-slate-400/80 font-mono bg-slate-900/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
