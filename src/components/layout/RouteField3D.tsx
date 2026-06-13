import { useEffect, useRef } from 'react';
import type * as ThreeModule from 'three';
import { useThemeStore } from '../../stores/themeStore';

interface RouteField3DProps {
  compact?: boolean;
}

interface MovingNode {
  mesh: ThreeModule.Mesh<ThreeModule.SphereGeometry, ThreeModule.MeshBasicMaterial>;
  offset: number;
  points: ThreeModule.Vector3[];
  speed: number;
}

const LIGHT_COLORS = {
  grid: '#d8d5cc',
  route: '#a77a45',
  routeAlt: '#1e2a44',
  node: '#101418',
};

const DARK_COLORS = {
  grid: '#353a42',
  route: '#d8be96',
  routeAlt: '#7383a3',
  node: '#e8e2d8',
};

function createRouteCurve(THREE: typeof ThreeModule, points: Array<[number, number, number]>) {
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
}

function sampleRoutePoint(points: ThreeModule.Vector3[], progress: number, target: ThreeModule.Vector3) {
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const scaled = Math.min(0.999, Math.max(0, safeProgress)) * (points.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, points.length - 1);
  return target.lerpVectors(points[index], points[nextIndex], scaled - index);
}

export function RouteField3D({ compact = false }: RouteField3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let cleanupScene: (() => void) | undefined;

    void (async () => {
      const THREE = await import('three');
      if (disposed) return;

      const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, compact ? 4.2 : 3.4, compact ? 9.2 : 8.2);
      camera.lookAt(0, 0, 0);

      const routeGroup = new THREE.Group();
      routeGroup.rotation.x = compact ? -0.78 : -0.68;
      routeGroup.rotation.z = compact ? -0.02 : -0.07;
      routeGroup.position.y = compact ? -0.35 : -0.15;
      scene.add(routeGroup);

      const gridVertices: number[] = [];
      const gridWidth = compact ? 8 : 12;
      const gridDepth = compact ? 5 : 7;
      const halfWidth = gridWidth / 2;
      const halfDepth = gridDepth / 2;

      for (let x = -halfWidth; x <= halfWidth; x += 1) {
        gridVertices.push(x, 0, -halfDepth, x, 0, halfDepth);
      }
      for (let z = -halfDepth; z <= halfDepth; z += 1) {
        gridVertices.push(-halfWidth, 0, z, halfWidth, 0, z);
      }

      const gridGeometry = new THREE.BufferGeometry();
      gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
      const gridMaterial = new THREE.LineBasicMaterial({
        color: colors.grid,
        opacity: compact ? 0.16 : 0.24,
        transparent: true,
      });
      const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
      routeGroup.add(grid);

      const curves = [
        createRouteCurve(THREE, [[-5.2, 0.02, -1.8], [-2.2, 0.1, -0.9], [0.2, 0.06, -1.25], [2.1, 0.12, -0.15], [5.1, 0.02, 0.55]]),
        createRouteCurve(THREE, [[-4.6, 0.03, 1.75], [-2.8, 0.08, 0.75], [-0.4, 0.1, 1.1], [1.8, 0.08, 0.35], [4.8, 0.03, 1.55]]),
        createRouteCurve(THREE, [[-3.7, 0.04, -3.0], [-1.9, 0.08, -1.65], [0.8, 0.08, -0.2], [3.8, 0.04, -1.95]]),
      ];

      const routeMaterials = [
        new THREE.LineBasicMaterial({ color: colors.route, opacity: compact ? 0.38 : 0.52, transparent: true }),
        new THREE.LineBasicMaterial({ color: colors.routeAlt, opacity: compact ? 0.22 : 0.32, transparent: true }),
        new THREE.LineBasicMaterial({ color: colors.route, opacity: compact ? 0.22 : 0.3, transparent: true }),
      ];

      const routePointSets = curves.map((curve) => curve.getPoints(96));
      const routeLines = routePointSets.map((points, index) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, routeMaterials[index]);
        routeGroup.add(line);
        return line;
      });

      const nodeGeometry = new THREE.SphereGeometry(compact ? 0.045 : 0.055, 16, 10);
      const nodeMaterial = new THREE.MeshBasicMaterial({
        color: colors.node,
        opacity: theme === 'dark' ? 0.82 : 0.72,
        transparent: true,
      });
      const movingNodes: MovingNode[] = [];
      const nodeCount = compact ? 7 : 12;

      for (let i = 0; i < nodeCount; i += 1) {
        const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
        const points = routePointSets[i % routePointSets.length];
        routeGroup.add(mesh);
        movingNodes.push({
          mesh,
          offset: (i * 0.19) % 1,
          points,
          speed: 0.025 + (i % 4) * 0.006,
        });
      }

      const resize = () => {
        const parent = canvas.parentElement;
        const rect = parent?.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect?.width ?? window.innerWidth));
        const height = Math.max(1, Math.floor(rect?.height ?? window.innerHeight));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      let animationFrame = 0;
      const startedAt = performance.now();
      const baseRotationZ = routeGroup.rotation.z;
      const sampledPoint = new THREE.Vector3();

      const render = (now: number) => {
        if (disposed) return;
        const elapsed = (now - startedAt) / 1000;
        routeGroup.rotation.z = baseRotationZ + Math.sin(elapsed * 0.18) * 0.025;
        routeGroup.position.y = (compact ? -0.35 : -0.15) + Math.sin(elapsed * 0.22) * 0.05;

        for (const node of movingNodes) {
          const rawProgress = node.offset + elapsed * node.speed;
          const progress = rawProgress - Math.floor(rawProgress);
          node.mesh.position.copy(sampleRoutePoint(node.points, progress, sampledPoint));
          const pulse = 0.86 + Math.sin((elapsed + node.offset * 8) * 2.2) * 0.14;
          node.mesh.scale.setScalar(pulse);
        }

        renderer.render(scene, camera);
        if (!reducedMotion) {
          animationFrame = window.requestAnimationFrame(render);
        }
      };

      resize();
      render(performance.now());
      window.addEventListener('resize', resize);

      cleanupScene = () => {
        window.removeEventListener('resize', resize);
        window.cancelAnimationFrame(animationFrame);
        gridGeometry.dispose();
        gridMaterial.dispose();
        for (const line of routeLines) {
          line.geometry.dispose();
        }
        for (const material of routeMaterials) {
          material.dispose();
        }
        nodeGeometry.dispose();
        nodeMaterial.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanupScene?.();
    };
  }, [compact, theme]);

  return <canvas ref={canvasRef} className="ambient-route-canvas" />;
}
