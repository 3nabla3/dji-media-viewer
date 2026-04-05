"use client";

import { useEffect, useRef, useState } from "react";
import { yawPitchToXYZ } from "@/lib/tile-geometry";
import type { ViewerProps } from "@/lib/use-tile-angles";
import type { MeshBasicMaterial } from "three";

// Sphere radius — all tiles are placed at this distance from the camera
const SPHERE_RADIUS = 100;

// DJI Mini 4 Pro approximate FOV for 4:3 panorama tiles
const HFOV_DEG = 69.4;
const VFOV_DEG = 54.3;

// Width/height of each tile plane at SPHERE_RADIUS distance
const TILE_W =
  2 * SPHERE_RADIUS * Math.tan(((HFOV_DEG / 2) * Math.PI) / 180);
const TILE_H =
  2 * SPHERE_RADIUS * Math.tan(((VFOV_DEG / 2) * Math.PI) / 180);

export default function BallViewer({ tiles }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilesLoaded, setTilesLoaded] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animId: number;
    const blobUrls: string[] = [];
    let cleanupFn: (() => void) | undefined;
    const container = el;

    async function init() {
      // Dynamic import keeps Three.js out of the SSR bundle
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);

      const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000,
      );
      camera.position.set(0, 0, 0.001);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.rotateSpeed = -0.4;
      controls.zoomSpeed = 0.5;
      controls.target.set(0, 0, 1);
      controls.update();

      const loader = new THREE.TextureLoader();
      let loaded = 0;

      for (const tile of tiles) {
        const blobUrl = URL.createObjectURL(tile.file);
        blobUrls.push(blobUrl);

        const [x, y, z] = yawPitchToXYZ(tile.yaw, tile.pitch, SPHERE_RADIUS);
        const geometry = new THREE.PlaneGeometry(TILE_W, TILE_H);

        const texture = loader.load(blobUrl, () => {
          loaded++;
          setTilesLoaded(loaded);
        });
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.lookAt(0, 0, 0);
        scene.add(mesh);
      }

      function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      const resizeObserver = new ResizeObserver(() => {
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(container);

      cleanupFn = () => {
        resizeObserver.disconnect();
        cancelAnimationFrame(animId);
        controls.dispose();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            const mat = obj.material as MeshBasicMaterial;
            mat.map?.dispose();
            mat.dispose();
          }
        });
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        blobUrls.forEach((u) => URL.revokeObjectURL(u));
      };
    }

    init();

    return () => {
      cleanupFn?.();
    };
  }, [tiles]);

  return (
    <div style={{ position: "relative", height: "70vh" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", cursor: "grab" }}
      />
      {tilesLoaded < tiles.length && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <span className="text-muted" style={{ fontSize: "0.8rem" }}>
            Loading tiles ({tilesLoaded}/{tiles.length})…
          </span>
        </div>
      )}
    </div>
  );
}
