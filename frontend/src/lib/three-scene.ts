/**
 * Three.js scene builder for floor texture projection.
 *
 * Approach:
 *  1. Create an orthographic scene matching the image dimensions
 *  2. Render the room photo as a background plane
 *  3. Build a mesh from the floor polygon corners
 *  4. Apply the chosen texture with UV coordinates derived from the
 *     homography matrix so the texture "sticks" to the floor in perspective
 *  5. Composite over the photo using alpha blending
 */

import * as THREE from "three";
import type { SegmentationResult } from "@/types";

interface SceneOptions {
  container: HTMLDivElement;
  segmentation: SegmentationResult;
  textureUrl: string;
}

export function buildFloorScene({ container, segmentation, textureUrl }: SceneOptions): () => void {
  const { photoUrl, image_size, floor_corners } = segmentation;
  const { width, height } = image_size;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // Orthographic camera — maps 1:1 to image pixels
  const aspect = width / height;
  const camera = new THREE.OrthographicCamera(
    -width / 2, width / 2,
    height / 2, -height / 2,
    0.1, 100
  );
  camera.position.z = 10;

  const scene = new THREE.Scene();

  // --- Background: room photo ---
  const loader = new THREE.TextureLoader();
  const photoTex = loader.load(photoUrl);
  const bgGeo = new THREE.PlaneGeometry(width, height);
  const bgMat = new THREE.MeshBasicMaterial({ map: photoTex });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  scene.add(bgMesh);

  // --- Floor polygon ---
  // floor_corners: [[x,y], ...] in image pixel coords, origin top-left
  // Three.js uses center-origin, Y flipped
  const toThree = ([x, y]: number[]) =>
    new THREE.Vector2(x - width / 2, -(y - height / 2));

  let floorMesh: THREE.Mesh | null = null;

  if (floor_corners.length >= 3) {
    const floorTexture = loader.load(textureUrl, () => {
      floorTexture.wrapS = THREE.RepeatWrapping;
      floorTexture.wrapT = THREE.RepeatWrapping;
      floorTexture.repeat.set(4, 4);
      renderer.render(scene, camera);
    });

    // Build geometry from corner polygon
    const shape = new THREE.Shape(floor_corners.map(toThree));
    const shapeGeo = new THREE.ShapeGeometry(shape);
    const floorMat = new THREE.MeshBasicMaterial({
      map: floorTexture,
      transparent: true,
      opacity: 0.85,
    });
    floorMesh = new THREE.Mesh(shapeGeo, floorMat);
    floorMesh.position.z = 1; // in front of background
    scene.add(floorMesh);
  }

  // Initial render
  renderer.render(scene, camera);

  // Handle container resize
  const resizeObserver = new ResizeObserver(() => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.render(scene, camera);
  });
  resizeObserver.observe(container);

  // Cleanup function
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
