/**
 * ==============================================================================
 * THREE.JS PROCEDURAL 3D HAND SCENE WITH GSAP SCROLL-TRIGGER
 * ==============================================================================
 * Renders a stylized Pixar-inspired 3D hand built purely from Three.js primitives
 * (BoxGeometry, CylinderGeometry, SphereGeometry) with skin-toned MeshStandardMaterial.
 *
 * Synchronized with GSAP ScrollTrigger to smoothly rotate and position across the
 * #skills section with scrub: 1.
 * ==============================================================================
 */

import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';

/**
 * Initializes the procedural 3D hand scene inside the target container.
 *
 * @param {HTMLElement} container - The DOM element (#hand-scene-container)
 * @returns {Object} Public API containing destroy/cleanup methods.
 */
export function initHandScene(container) {
  if (!container) {
    console.warn('[HandScene] Target container not found.');
    return null;
  }

  // Clear any existing children
  container.innerHTML = '';

  // ----------------------------------------------------------------------------
  // SCENE, CAMERA & RENDERER SETUP
  // ----------------------------------------------------------------------------
  const scene = new THREE.Scene();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 1.8, 6.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // ----------------------------------------------------------------------------
  // LIGHTING SETUP
  // ----------------------------------------------------------------------------
  // 1. Soft white ambient light (0.6 intensity)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // 2. Directional warm white key light from top-right (1.2 intensity)
  const directionalLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
  directionalLight.position.set(5, 8, 4);
  scene.add(directionalLight);

  // 3. Point light: cyan (#00d4ff) from bottom-left for stylish accent (0.5 intensity)
  const cyanAccentLight = new THREE.PointLight(0x00d4ff, 0.5, 25);
  cyanAccentLight.position.set(-4, -2, -3);
  scene.add(cyanAccentLight);

  // 4. Subtle cool blue rim light from back-bottom for Pixar stylized edge definition
  const rimLight = new THREE.DirectionalLight(0x0088ff, 0.7);
  rimLight.position.set(0, -2, -5);
  scene.add(rimLight);

  // ----------------------------------------------------------------------------
  // PROCEDURAL HAND GEOMETRY & MATERIALS
  // ----------------------------------------------------------------------------
  // Hand root container
  const handGroup = new THREE.Group();
  scene.add(handGroup);

  // Pixar-like stylized skin material
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4c4a0,
    roughness: 0.7,
    metalness: 0.1,
    flatShading: false
  });

  // Slightly warmer material for palm pads / fingertips
  const softSkinMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0b894,
    roughness: 0.65,
    metalness: 0.1
  });

  // 1. Palm Construction
  const palmGroup = new THREE.Group();

  // Central palm block (subdivided for smooth lighting)
  const palmBoxGeo = new THREE.BoxGeometry(2.1, 0.52, 2.3, 6, 4, 6);
  const palmMesh = new THREE.Mesh(palmBoxGeo, skinMaterial);
  palmMesh.position.set(0, 0, 0);
  palmGroup.add(palmMesh);

  // Hypothenar eminence (outer palm muscle pad)
  const hypothenarGeo = new THREE.SphereGeometry(0.5, 16, 16);
  const hypothenarMesh = new THREE.Mesh(hypothenarGeo, softSkinMaterial);
  hypothenarMesh.scale.set(1.1, 0.65, 1.6);
  hypothenarMesh.position.set(0.8, 0.05, -0.15);
  palmGroup.add(hypothenarMesh);

  // Thenar eminence (thumb base muscle pad)
  const thenarGeo = new THREE.SphereGeometry(0.62, 16, 16);
  const thenarMesh = new THREE.Mesh(thenarGeo, softSkinMaterial);
  thenarMesh.scale.set(1.15, 0.72, 1.4);
  thenarMesh.position.set(-0.75, 0.08, -0.35);
  palmGroup.add(thenarMesh);

  // Wrist transition
  const wristGeo = new THREE.CylinderGeometry(0.82, 0.95, 1.3, 20);
  wristGeo.rotateX(Math.PI / 2);
  const wristMesh = new THREE.Mesh(wristGeo, skinMaterial);
  wristMesh.position.set(0, -0.04, -1.6);
  palmGroup.add(wristMesh);

  handGroup.add(palmGroup);

  // Helper to build articulated fingers with spherical joints
  function createFinger({
    basePos,
    length,
    thickness,
    curlAngles = [0.08, 0.12, 0.1],
    splayAngle = 0
  }) {
    const fingerRoot = new THREE.Group();
    fingerRoot.position.copy(basePos);
    fingerRoot.rotation.y = splayAngle;

    // Base Knuckle Joint
    const knuckleGeo = new THREE.SphereGeometry(thickness * 1.05, 16, 16);
    const knuckleMesh = new THREE.Mesh(knuckleGeo, skinMaterial);
    fingerRoot.add(knuckleMesh);

    // Proximal Phalanx (Segment 1)
    const seg1Length = length * 0.42;
    const seg1Group = new THREE.Group();
    seg1Group.rotation.x = curlAngles[0];

    const seg1Geo = new THREE.CylinderGeometry(thickness * 0.92, thickness, seg1Length, 16);
    seg1Geo.rotateX(Math.PI / 2);
    seg1Geo.translate(0, 0, seg1Length / 2);
    const seg1Mesh = new THREE.Mesh(seg1Geo, skinMaterial);
    seg1Group.add(seg1Mesh);

    // Intermediate Joint
    const midJointGeo = new THREE.SphereGeometry(thickness * 0.94, 16, 16);
    const midJointMesh = new THREE.Mesh(midJointGeo, skinMaterial);
    midJointMesh.position.set(0, 0, seg1Length);
    seg1Group.add(midJointMesh);

    // Middle Phalanx (Segment 2)
    const seg2Length = length * 0.32;
    const seg2Group = new THREE.Group();
    seg2Group.position.set(0, 0, seg1Length);
    seg2Group.rotation.x = curlAngles[1];

    const seg2Geo = new THREE.CylinderGeometry(thickness * 0.82, thickness * 0.92, seg2Length, 16);
    seg2Geo.rotateX(Math.PI / 2);
    seg2Geo.translate(0, 0, seg2Length / 2);
    const seg2Mesh = new THREE.Mesh(seg2Geo, skinMaterial);
    seg2Group.add(seg2Mesh);

    // Distal Joint
    const distJointGeo = new THREE.SphereGeometry(thickness * 0.84, 16, 16);
    const distJointMesh = new THREE.Mesh(distJointGeo, skinMaterial);
    distJointMesh.position.set(0, 0, seg2Length);
    seg2Group.add(distJointMesh);

    // Distal Phalanx & Fingertip (Segment 3)
    const seg3Length = length * 0.26;
    const seg3Group = new THREE.Group();
    seg3Group.position.set(0, 0, seg2Length);
    seg3Group.rotation.x = curlAngles[2];

    const seg3Geo = new THREE.CylinderGeometry(thickness * 0.72, thickness * 0.82, seg3Length, 16);
    seg3Geo.rotateX(Math.PI / 2);
    seg3Geo.translate(0, 0, seg3Length / 2);
    const seg3Mesh = new THREE.Mesh(seg3Geo, skinMaterial);
    seg3Group.add(seg3Mesh);

    // Rounded Fingertip
    const tipGeo = new THREE.SphereGeometry(thickness * 0.75, 16, 16);
    const tipMesh = new THREE.Mesh(tipGeo, softSkinMaterial);
    tipMesh.position.set(0, 0, seg3Length);
    seg3Group.add(tipMesh);

    seg2Group.add(seg3Group);
    seg1Group.add(seg2Group);
    fingerRoot.add(seg1Group);

    return fingerRoot;
  }

  // 2. Add the 4 main fingers (open palm-up natural relaxed pose)
  const indexFinger = createFinger({
    basePos: new THREE.Vector3(-0.72, 0.04, 1.15),
    length: 1.95,
    thickness: 0.23,
    curlAngles: [0.10, 0.14, 0.08],
    splayAngle: -0.10
  });
  handGroup.add(indexFinger);

  const middleFinger = createFinger({
    basePos: new THREE.Vector3(-0.18, 0.06, 1.25),
    length: 2.15,
    thickness: 0.24,
    curlAngles: [0.08, 0.12, 0.07],
    splayAngle: 0.0
  });
  handGroup.add(middleFinger);

  const ringFinger = createFinger({
    basePos: new THREE.Vector3(0.38, 0.05, 1.18),
    length: 2.0,
    thickness: 0.23,
    curlAngles: [0.11, 0.15, 0.10],
    splayAngle: 0.08
  });
  handGroup.add(ringFinger);

  const pinkyFinger = createFinger({
    basePos: new THREE.Vector3(0.90, 0.02, 1.02),
    length: 1.62,
    thickness: 0.19,
    curlAngles: [0.14, 0.18, 0.12],
    splayAngle: 0.22
  });
  handGroup.add(pinkyFinger);

  // 3. Thumb Construction (2 segments, angled outward & elevated)
  const thumbGroup = new THREE.Group();
  thumbGroup.position.set(-1.05, 0.08, -0.15);
  thumbGroup.rotation.set(0.28, -0.65, 0.35);

  const thumbKnuckleGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const thumbKnuckle = new THREE.Mesh(thumbKnuckleGeo, skinMaterial);
  thumbGroup.add(thumbKnuckle);

  const thumbSeg1Length = 0.85;
  const thumbSeg1Group = new THREE.Group();
  thumbSeg1Group.rotation.x = 0.15;

  const thumbSeg1Geo = new THREE.CylinderGeometry(0.25, 0.28, thumbSeg1Length, 16);
  thumbSeg1Geo.rotateX(Math.PI / 2);
  thumbSeg1Geo.translate(0, 0, thumbSeg1Length / 2);
  const thumbSeg1Mesh = new THREE.Mesh(thumbSeg1Geo, skinMaterial);
  thumbSeg1Group.add(thumbSeg1Mesh);

  const thumbMidJointGeo = new THREE.SphereGeometry(0.25, 16, 16);
  const thumbMidJoint = new THREE.Mesh(thumbMidJointGeo, skinMaterial);
  thumbMidJoint.position.set(0, 0, thumbSeg1Length);
  thumbSeg1Group.add(thumbMidJoint);

  const thumbSeg2Length = 0.72;
  const thumbSeg2Group = new THREE.Group();
  thumbSeg2Group.position.set(0, 0, thumbSeg1Length);
  thumbSeg2Group.rotation.x = 0.22;

  const thumbSeg2Geo = new THREE.CylinderGeometry(0.22, 0.25, thumbSeg2Length, 16);
  thumbSeg2Geo.rotateX(Math.PI / 2);
  thumbSeg2Geo.translate(0, 0, thumbSeg2Length / 2);
  const thumbSeg2Mesh = new THREE.Mesh(thumbSeg2Geo, skinMaterial);
  thumbSeg2Group.add(thumbSeg2Mesh);

  const thumbTipGeo = new THREE.SphereGeometry(0.24, 16, 16);
  const thumbTip = new THREE.Mesh(thumbTipGeo, softSkinMaterial);
  thumbTip.position.set(0, 0, thumbSeg2Length);
  thumbSeg2Group.add(thumbTip);

  thumbSeg1Group.add(thumbSeg2Group);
  thumbGroup.add(thumbSeg1Group);
  handGroup.add(thumbGroup);

  // Initial hand resting transform: centered palm-up, slightly tilted forward to show depth
  const initialRotation = { x: 0.15, y: 0.0, z: 0.0 };
  const initialPosition = { x: 0.0, y: -0.2, z: 0.0 };

  handGroup.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
  handGroup.position.set(initialPosition.x, initialPosition.y, initialPosition.z);

  // ----------------------------------------------------------------------------
  // GSAP SCROLLTRIGGER INTEGRATION
  // ----------------------------------------------------------------------------
  let scrollTriggerInstance = null;

  function setupScrollAnimation() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    if (!gsap || !ScrollTrigger) {
      console.warn('[HandScene] GSAP or ScrollTrigger not found globally. Animation deferred.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const skillsSection = document.getElementById('skills');
    if (!skillsSection) return;

    const isDesktop = window.innerWidth > 768;
    // On desktop, the hand shifts to the left side (-2.2 units) to frame the skill cards
    const targetX = isDesktop ? -2.2 : 0.0;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: skillsSection,
        start: 'top 85%',
        end: 'bottom 15%',
        scrub: 1,
        onEnter: () => container.classList.add('active'),
        onLeave: () => container.classList.remove('active'),
        onEnterBack: () => container.classList.add('active'),
        onLeaveBack: () => container.classList.remove('active'),
      }
    });

    // Rotation: Y: 0 -> 0.3 rad, X: 0 -> -0.2 rad
    tl.to(handGroup.rotation, {
      y: 0.3,
      x: -0.2,
      ease: 'none'
    }, 0);

    // Position: shift to left on desktop
    tl.to(handGroup.position, {
      x: targetX,
      ease: 'none'
    }, 0);

    scrollTriggerInstance = tl.scrollTrigger;
  }

  // Delay setup slightly to ensure DOM layout has stabilized
  if (document.readyState === 'complete') {
    setupScrollAnimation();
  } else {
    window.addEventListener('load', setupScrollAnimation);
  }

  // ----------------------------------------------------------------------------
  // RESIZE HANDLER
  // ----------------------------------------------------------------------------
  function onWindowResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  }

  window.addEventListener('resize', onWindowResize);

  // ----------------------------------------------------------------------------
  // RENDER LOOP & IDLE BREATHING
  // ----------------------------------------------------------------------------
  let animId = null;
  const clock = new THREE.Clock();

  function animate() {
    animId = requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Subtle idle floating & wrist drift to keep hand alive
    const subtleBob = Math.sin(elapsedTime * 1.4) * 0.06;
    const subtleTwist = Math.cos(elapsedTime * 0.9) * 0.02;

    handGroup.position.y = initialPosition.y + subtleBob;
    handGroup.rotation.z = initialRotation.z + subtleTwist;

    renderer.render(scene, camera);
  }

  animate();

  // ----------------------------------------------------------------------------
  // TEARDOWN / CLEANUP
  // ----------------------------------------------------------------------------
  return {
    destroy() {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', onWindowResize);
      if (scrollTriggerInstance) scrollTriggerInstance.kill();

      renderer.dispose();
      skinMaterial.dispose();
      softSkinMaterial.dispose();
      container.innerHTML = '';
    },
    resize() {
      onWindowResize();
    }
  };
}
