import * as THREE from "three";
import type { SegmentationResult } from "@/types";
import type { Texture } from "@/lib/textures";

interface SceneOptions {
  container: HTMLDivElement;
  segmentation: SegmentationResult;
  texture: Texture;
}

export function buildFloorScene({ container, segmentation, texture }: SceneOptions): () => void {
  const { photoUrl, image_size, floor_corners } = segmentation;
  const { width, height } = image_size;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(
    -width / 2, width / 2,
    height / 2, -height / 2,
    0.1, 100
  );
  camera.position.z = 10;

  const scene = new THREE.Scene();

  // Background: room photo
  const loader = new THREE.TextureLoader();
  const photoTex = loader.load(photoUrl);
  const bgGeo = new THREE.PlaneGeometry(width, height);
  const bgMat = new THREE.MeshBasicMaterial({ map: photoTex });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  scene.add(bgMesh);

  // Floor polygon
  const toThree = ([x, y]: number[]) =>
    new THREE.Vector2(x - width / 2, -(y - height / 2));

  let floorMesh: THREE.Mesh | null = null;

  if (floor_corners.length >= 3) {
    // Generate a canvas texture from the color/pattern
    const canvasTex = generateCanvasTexture(texture);

    const shape = new THREE.Shape(floor_corners.map(toThree));
    const shapeGeo = new THREE.ShapeGeometry(shape);
    const floorMat = new THREE.MeshBasicMaterial({
      map: canvasTex,
      transparent: true,
      opacity: 0.82,
    });
    floorMesh = new THREE.Mesh(shapeGeo, floorMat);
    floorMesh.position.z = 1;
    scene.add(floorMesh);
  }

  renderer.render(scene, camera);

  const resizeObserver = new ResizeObserver(() => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.render(scene, camera);
  });
  resizeObserver.observe(container);

  return () => {
    resizeObserver.disconnect();
    renderer.dispose();
    photoTex.dispose();
    bgGeo.dispose();
    bgMat.dispose();
    if (floorMesh) {
      (floorMesh.material as THREE.MeshBasicMaterial).map?.dispose();
      floorMesh.geometry.dispose();
      (floorMesh.material as THREE.Material).dispose();
    }
  };
}

/**
 * Genera una textura THREE.js desde un canvas HTML usando el color y patrón
 * del objeto Texture. Sin imágenes externas.
 */
function generateCanvasTexture(texture: Texture): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = texture.color;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = texture.color2;

  if (texture.pattern === "planks") {
    const plankH = size / 3;
    ctx.lineWidth = 2;
    // horizontal divisions
    for (let y = plankH; y < size; y += plankH) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    }
    // vertical stagger
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(size / 2, 0);          ctx.lineTo(size / 2, plankH);       ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size / 4, plankH);      ctx.lineTo(size / 4, plankH * 2);  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * 3/4, plankH * 2); ctx.lineTo(size * 3/4, size);      ctx.stroke();
    ctx.globalAlpha = 1;

  } else if (texture.pattern === "grid") {
    ctx.lineWidth = 3;
    const step = size / 3;
    for (let i = step; i < size; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }

  } else if (texture.pattern === "herringbone") {
    ctx.lineWidth = 2;
    const s = size / 4;
    for (let i = -size; i < size * 2; i += s * 2) {
      ctx.beginPath(); ctx.moveTo(i, 0);        ctx.lineTo(i + size, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + s, 0);    ctx.lineTo(i + s - size, size); ctx.stroke();
    }

  } else {
    // plain — slight vignette
    const grad = ctx.createRadialGradient(size/2, size/2, size*0.1, size/2, size/2, size*0.7);
    grad.addColorStop(0, "rgba(255,255,255,0.08)");
    grad.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}
