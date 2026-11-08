/**
 * ==============================================================================
 * CHARACTER 2.5D INTERACTIVE EYE-TRACKING & 3D CONTROLLER
 * ==============================================================================
 * Renders an interactive 2.5D character portrait with animated pupils that
 * track cursor and touch movements, subtle parallax depth shifting, and
 * responsive 3D card tilt physics.
 *
 * Face Image Specifications:
 * - Natural Aspect Ratio: 768x1024 (Portrait 3:4)
 * - Left Eye Center:  (42% width, 40% height)
 * - Right Eye Center: (57% width, 40% height)
 * - Pupil Radius:     ~3% of image width
 * ==============================================================================
 */

/**
 * Active character rendering mode.
 * Set to '2.5d' for canvas overlay eye-tracking on 2D artwork.
 * Switch to '3d' when using Three.js with GLB model.
 */
export const CHARACTER_MODE = '2.5d';

/**
 * Initializes the 2.5D character within the provided container element.
 *
 * @param {HTMLElement} container - The DOM element (#character-container) to mount into.
 * @returns {Object} Public API containing destroy/cleanup and resize methods.
 */
export function initCharacter(container) {
  if (!container) {
    console.warn('[Character] Container element not found.');
    return null;
  }

  // Clear any existing children in container
  container.innerHTML = '';

  // ----------------------------------------------------------------------------
  // DOM SETUP: Layers for 3D tilt, parallax translation, and canvas pupils
  // ----------------------------------------------------------------------------
  container.style.perspective = '1000px';
  container.style.transformStyle = 'preserve-3d';

  // Inner wrapper to prevent overflow clipping issues while maintaining perspective
  const wrapper = document.createElement('div');
  wrapper.className = 'character-wrapper';
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  wrapper.style.borderRadius = 'inherit';
  wrapper.style.overflow = 'hidden';
  wrapper.style.transformStyle = 'preserve-3d';
  wrapper.style.willChange = 'transform';

  // Parallax layer: shifted slightly opposite to cursor motion
  const parallaxLayer = document.createElement('div');
  parallaxLayer.className = 'character-parallax-layer';
  parallaxLayer.style.position = 'absolute';
  parallaxLayer.style.top = '-15px';
  parallaxLayer.style.left = '-15px';
  parallaxLayer.style.right = '-15px';
  parallaxLayer.style.bottom = '-15px';
  parallaxLayer.style.willChange = 'transform';

  // Face image background layer
  const faceImage = document.createElement('div');
  faceImage.className = 'character-face-bg';
  faceImage.style.position = 'absolute';
  faceImage.style.inset = '0';
  faceImage.style.backgroundImage = "url('assets/face.png')";
  faceImage.style.backgroundRepeat = 'no-repeat';
  faceImage.style.backgroundPosition = 'center center';
  faceImage.style.backgroundSize = 'cover';

  // Canvas overlay for procedural pupils and specular highlights
  const canvas = document.createElement('canvas');
  canvas.className = 'character-pupils-canvas';
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';

  parallaxLayer.appendChild(faceImage);
  parallaxLayer.appendChild(canvas);
  wrapper.appendChild(parallaxLayer);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');

  // ----------------------------------------------------------------------------
  // STATE & GEOMETRY COORDINATES
  // ----------------------------------------------------------------------------
  const FACE_NATURAL_WIDTH = 768;
  const FACE_NATURAL_HEIGHT = 1024;
  const EYE_L_RATIO = { x: 0.42, y: 0.40 };
  const EYE_R_RATIO = { x: 0.57, y: 0.40 };
  const PUPIL_RADIUS_RATIO = 0.03;

  // Cached layout metrics
  let containerWidth = 0;
  let containerHeight = 0;
  let layerWidth = 0;
  let layerHeight = 0;
  let eyeLeft = { x: 0, y: 0 };
  let eyeRight = { x: 0, y: 0 };
  let basePupilRadius = 12;
  let maxPupilOffset = 15;

  // Pointer input targets (normalized -1 to 1)
  let targetNormX = 0;
  let targetNormY = 0;

  // Current smoothed values (lerped)
  let currentNormX = 0;
  let currentNormY = 0;

  let currentRotateX = 0;
  let currentRotateY = 0;

  let currentParallaxX = 0;
  let currentParallaxY = 0;

  let pupilLeft = { x: 0, y: 0 };
  let pupilRight = { x: 0, y: 0 };

  let isPointerActive = false;
  let lastPointerMoveTime = performance.now();
  let animationFrameId = null;

  // Preload face image to ensure coordinate calculations align with rendered image
  const imgLoader = new Image();
  imgLoader.src = 'assets/face.png';

  // ----------------------------------------------------------------------------
  // RESIZE & PROJECTION RECALCULATION
  // ----------------------------------------------------------------------------
  function updateDimensions() {
    const rect = container.getBoundingClientRect();
    containerWidth = rect.width;
    containerHeight = rect.height;

    const layerRect = parallaxLayer.getBoundingClientRect();
    layerWidth = layerRect.width || (containerWidth + 30);
    layerHeight = layerRect.height || (containerHeight + 30);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(layerWidth * dpr);
    canvas.height = Math.round(layerHeight * dpr);

    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    // Calculate background-size: cover projection bounds
    const imgRatio = FACE_NATURAL_WIDTH / FACE_NATURAL_HEIGHT;
    const layerRatio = layerWidth / layerHeight;

    let renderW, renderH, offsetX, offsetY;
    if (layerRatio > imgRatio) {
      renderW = layerWidth;
      renderH = layerWidth / imgRatio;
      offsetX = 0;
      offsetY = (layerHeight - renderH) / 2;
    } else {
      renderH = layerHeight;
      renderW = layerHeight * imgRatio;
      offsetX = (layerWidth - renderW) / 2;
      offsetY = 0;
    }

    eyeLeft = {
      x: offsetX + renderW * EYE_L_RATIO.x,
      y: offsetY + renderH * EYE_L_RATIO.y
    };

    eyeRight = {
      x: offsetX + renderW * EYE_R_RATIO.x,
      y: offsetY + renderH * EYE_R_RATIO.y
    };

    basePupilRadius = Math.max(8, renderW * PUPIL_RADIUS_RATIO);
    maxPupilOffset = Math.min(15, renderW * 0.038);
  }

  // ----------------------------------------------------------------------------
  // INPUT HANDLERS: Desktop Mouse & Mobile Touch
  // ----------------------------------------------------------------------------
  function handlePointer(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const halfWindowW = Math.max(window.innerWidth / 2, 300);
    const halfWindowH = Math.max(window.innerHeight / 2, 300);

    // Normalized coordinates from container center [-1, 1]
    const rawNormX = (clientX - centerX) / halfWindowW;
    const rawNormY = (clientY - centerY) / halfWindowH;

    targetNormX = Math.max(-1, Math.min(1, rawNormX));
    targetNormY = Math.max(-1, Math.min(1, rawNormY));

    isPointerActive = true;
    lastPointerMoveTime = performance.now();
  }

  function onMouseMove(e) {
    handlePointer(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function onPointerLeave() {
    isPointerActive = false;
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('touchstart', onTouchMove, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onPointerLeave, { passive: true });
  document.addEventListener('mouseleave', onPointerLeave);
  window.addEventListener('resize', updateDimensions);

  // Initial sizing
  updateDimensions();
  imgLoader.onload = updateDimensions;

  // ----------------------------------------------------------------------------
  // CANVAS DRAWING: Pixar-Style Dark Brown Pupils with Specular Highlights
  // ----------------------------------------------------------------------------
  function drawPupil(centerX, centerY, radius) {
    ctx.save();

    // 1. Soft ambient eye-socket shadow
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 5, 2, 0.25)';
    ctx.fill();

    // 2. Iris gradient: rich dark chocolate to deep espresso rim
    const irisGrad = ctx.createRadialGradient(
      centerX - radius * 0.2,
      centerY - radius * 0.2,
      radius * 0.1,
      centerX,
      centerY,
      radius
    );
    irisGrad.addColorStop(0, '#5a2d18'); // Warm hazel/amber core
    irisGrad.addColorStop(0.55, '#30160b'); // Dark chocolate brown
    irisGrad.addColorStop(1, '#120703'); // Near-black outer limbal ring

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = irisGrad;
    ctx.fill();

    // 3. Deep black central pupil
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = '#080402';
    ctx.fill();

    // 4. Primary specular catchlight (crisp white reflection)
    const highlightX = centerX - radius * 0.32;
    const highlightY = centerY - radius * 0.32;
    const highlightR = radius * 0.26;

    ctx.beginPath();
    ctx.arc(highlightX, highlightY, highlightR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fill();

    // 5. Secondary micro-specular catchlight (soft light bounce)
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    const microX = centerX + radius * 0.30;
    const microY = centerY + radius * 0.28;
    const microR = radius * 0.13;

    ctx.beginPath();
    ctx.arc(microX, microY, microR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fill();

    ctx.restore();
  }

  // ----------------------------------------------------------------------------
  // ANIMATION LOOP (requestAnimationFrame)
  // ----------------------------------------------------------------------------
  function render(timestamp) {
    // Idle micro-animation: subtle life breathing if pointer inactive for 2s
    const idleElapsed = timestamp - lastPointerMoveTime;
    let effectiveNormX = targetNormX;
    let effectiveNormY = targetNormY;

    if (!isPointerActive || idleElapsed > 2500) {
      const breathTime = timestamp * 0.0018;
      const subtleWanderX = Math.sin(breathTime * 0.7) * 0.12;
      const subtleWanderY = Math.cos(breathTime * 0.5) * 0.08;

      effectiveNormX = effectiveNormX * 0.95 + subtleWanderX;
      effectiveNormY = effectiveNormY * 0.95 + subtleWanderY;
    }

    // Smooth lerping for inputs (factor: 0.1 desktop / 0.12 touch)
    currentNormX += (effectiveNormX - currentNormX) * 0.10;
    currentNormY += (effectiveNormY - currentNormY) * 0.10;

    // 1. Tilt Container: max ±5 degrees (rotateX responds to Y, rotateY responds to X)
    const targetRotateX = -currentNormY * 5;
    const targetRotateY = currentNormX * 5;

    currentRotateX += (targetRotateX - currentRotateX) * 0.08;
    currentRotateY += (targetRotateY - currentRotateY) * 0.08;

    container.style.transform = `perspective(1000px) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg)`;

    // 2. Parallax Shift: shifts 2-3px opposite to cursor direction
    const targetParallaxX = -currentNormX * 3;
    const targetParallaxY = -currentNormY * 3;

    currentParallaxX += (targetParallaxX - currentParallaxX) * 0.08;
    currentParallaxY += (targetParallaxY - currentParallaxY) * 0.08;

    parallaxLayer.style.transform = `translate3d(${currentParallaxX.toFixed(2)}px, ${currentParallaxY.toFixed(2)}px, 0)`;

    // 3. Pupil Target Coordinates: constrained within maxPupilOffset radius
    const angle = Math.atan2(currentNormY, currentNormX);
    const distanceMagnitude = Math.min(Math.hypot(currentNormX, currentNormY), 1.0);
    const offsetMagnitude = distanceMagnitude * maxPupilOffset;

    const targetPupilOffsetX = Math.cos(angle) * offsetMagnitude;
    const targetPupilOffsetY = Math.sin(angle) * offsetMagnitude;

    pupilLeft.x += (targetPupilOffsetX - pupilLeft.x) * 0.14;
    pupilLeft.y += (targetPupilOffsetY - pupilLeft.y) * 0.14;

    pupilRight.x += (targetPupilOffsetX - pupilRight.x) * 0.14;
    pupilRight.y += (targetPupilOffsetY - pupilRight.y) * 0.14;

    // 4. Render Pupils onto Canvas
    ctx.clearRect(0, 0, layerWidth, layerHeight);

    if (eyeLeft.x > 0 && eyeRight.x > 0) {
      drawPupil(
        eyeLeft.x + pupilLeft.x,
        eyeLeft.y + pupilLeft.y,
        basePupilRadius
      );

      drawPupil(
        eyeRight.x + pupilRight.x,
        eyeRight.y + pupilRight.y,
        basePupilRadius
      );
    }

    animationFrameId = requestAnimationFrame(render);
  }

  animationFrameId = requestAnimationFrame(render);

  // Return teardown interface
  return {
    destroy() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerLeave);
      document.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('resize', updateDimensions);
      container.innerHTML = '';
    },
    resize() {
      updateDimensions();
    }
  };
}

/* ==============================================================================
 * OPTIONAL: 3D CHARACTER MODE (THREE.JS GLB IMPLEMENTATION)
 * ==============================================================================
 * To switch to full 3D rendering once you have character.glb:
 * 1. Change: export const CHARACTER_MODE = '3d';
 * 2. In main.js, call initCharacter3D(container) instead of initCharacter(container)
 *
 * Example implementation:
 *
 * import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';
 * import { GLTFLoader } from 'https://unpkg.com/three@0.168.0/examples/jsm/loaders/GLTFLoader.js';
 *
 * export function initCharacter3D(container) {
 *   const scene = new THREE.Scene();
 *   const camera = new THREE.PerspectiveCamera(
 *     35,
 *     container.clientWidth / container.clientHeight,
 *     0.1,
 *     100
 *   );
 *   camera.position.set(0, 0, 3.2);
 *
 *   const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
 *   renderer.setSize(container.clientWidth, container.clientHeight);
 *   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 *   renderer.toneMapping = THREE.ACESFilmicToneMapping;
 *   container.appendChild(renderer.domElement);
 *
 *   // Lighting
 *   const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.2);
 *   scene.add(hemiLight);
 *
 *   const dirLight = new THREE.DirectionalLight(0xfff2e0, 1.5);
 *   dirLight.position.set(2, 4, 3);
 *   scene.add(dirLight);
 *
 *   const rimLight = new THREE.DirectionalLight(0x00d4ff, 1.0);
 *   rimLight.position.set(-3, -1, -2);
 *   scene.add(rimLight);
 *
 *   let eyeL = null;
 *   let eyeR = null;
 *   let headBone = null;
 *   const lookTarget = new THREE.Vector3(0, 0, 5);
 *   const mouseWorld = new THREE.Vector3();
 *
 *   const loader = new GLTFLoader();
 *   loader.load('assets/character.glb', (gltf) => {
 *     const model = gltf.scene;
 *     model.position.set(0, -1.2, 0);
 *     model.scale.set(1, 1, 1);
 *     scene.add(model);
 *
 *     eyeL = model.getObjectByName('eye_L') || model.getObjectByName('Eye_L');
 *     eyeR = model.getObjectByName('eye_R') || model.getObjectByName('Eye_R');
 *     headBone = model.getObjectByName('Head') || model.getObjectByName('head');
 *   });
 *
 *   window.addEventListener('mousemove', (e) => {
 *     const rect = container.getBoundingClientRect();
 *     const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
 *     const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
 *     mouseWorld.set(x * 1.5, y * 1.2, 3.0);
 *   });
 *
 *   function animate() {
 *     requestAnimationFrame(animate);
 *     lookTarget.lerp(mouseWorld, 0.08);
 *     if (eyeL) eyeL.lookAt(lookTarget);
 *     if (eyeR) eyeR.lookAt(lookTarget);
 *     if (headBone) {
 *       headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, lookTarget.x * 0.15, 0.05);
 *       headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, -lookTarget.y * 0.15, 0.05);
 *     }
 *     renderer.render(scene, camera);
 *   }
 *   animate();
 * }
 * ==============================================================================
 */
