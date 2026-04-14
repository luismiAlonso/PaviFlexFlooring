import * as THREE from "three";
import type { SegmentationResult } from "@/types";
import type { Texture } from "@/lib/textures";

interface SceneOptions {
  container: HTMLDivElement;
  segmentation: SegmentationResult;
  texture: Texture;
}

export function buildFloorScene({ container, segmentation, texture }: SceneOptions): () => void {
  const { photoUrl, floor_corners } = segmentation;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setClearColor(0x111111);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  let camera: THREE.OrthographicCamera | null = null;
  let floorMesh: THREE.Mesh | null = null;
  let bgMesh: THREE.Mesh | null = null;
  let photoTex: THREE.Texture | null = null;
  let disposed = false;

  const loader = new THREE.TextureLoader();

  // Load the photo first — build the scene once we know the real image dimensions
  loader.load(
    photoUrl,
    (tex) => {
      if (disposed) { tex.dispose(); return; }

      photoTex = tex;
      const W = tex.image.width as number;
      const H = tex.image.height as number;

      // Orthographic camera in image-pixel space
      camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 100);
      camera.position.z = 10;

      // Background plane — exact image size
      const bgGeo = new THREE.PlaneGeometry(W, H);
      const bgMat = new THREE.MeshBasicMaterial({ map: tex });
      bgMesh = new THREE.Mesh(bgGeo, bgMat);
      bgMesh.position.z = 0;
      scene.add(bgMesh);

      // Floor polygon — corners are in mock 800×600 space, scale to real image
      const mockW = segmentation.image_size.width;
      const mockH = segmentation.image_size.height;
      const scaleX = W / mockW;
      const scaleY = H / mockH;

      const toThree = ([x, y]: number[]) =>
        new THREE.Vector2((x * scaleX) - W / 2, -(y * scaleY - H / 2));

      if (floor_corners.length >= 3) {
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

      render();
    },
    undefined,
    (err) => console.error("Error loading photo texture:", err)
  );

  function render() {
    if (!camera || disposed) return;
    // Fit the image inside the container preserving aspect ratio
    const W = (camera.right - camera.left);
    const H = (camera.top - camera.bottom);
    const containerAspect = container.clientWidth / container.clientHeight;
    const imageAspect = W / H;
    let renderW = container.clientWidth;
    let renderH = container.clientHeight;
    if (containerAspect > imageAspect) {
      renderW = Math.round(renderH * imageAspect);
    } else {
      renderH = Math.round(renderW / imageAspect);
    }
    renderer.setSize(renderW, renderH);
    renderer.domElement.style.margin = "auto";
    renderer.render(scene, camera);
  }

  const resizeObserver = new ResizeObserver(render);
  resizeObserver.observe(container);

  return () => {
    disposed = true;
    resizeObserver.disconnect();
    renderer.dispose();
    photoTex?.dispose();
    bgMesh?.geometry.dispose();
    (bgMesh?.material as THREE.Material)?.dispose();
    if (floorMesh) {
      (floorMesh.material as THREE.MeshBasicMaterial).map?.dispose();
      floorMesh.geometry.dispose();
      (floorMesh.material as THREE.Material).dispose();
    }
  };
}

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
    for (let y = plankH; y < size; y += plankH) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(size / 2, 0);           ctx.lineTo(size / 2, plankH);        ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size / 4, plankH);       ctx.lineTo(size / 4, plankH * 2);   ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * 3/4, plankH * 2); ctx.lineTo(size * 3/4, size);       ctx.stroke();
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
      ctx.beginPath(); ctx.moveTo(i, 0);     ctx.lineTo(i + size, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + s, 0); ctx.lineTo(i + s - size, size); ctx.stroke();
    }

  } else {
    // plain — vignette sutil
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
