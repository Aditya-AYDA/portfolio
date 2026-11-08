/**
 * ==============================================================================
 * ADITYA KAPGATE - 3D CREATIVE PORTFOLIO MAIN ENTRY POINT
 * ==============================================================================
 * Orchestrates:
 * 1. Global GSAP & ScrollTrigger setup
 * 2. 1.5s Preloader loading screen with smooth fade-out
 * 3. 2.5D Eye-tracking interactive character hero
 * 4. Procedural 3D hand Three.js scene in skills section
 * 5. Dynamic video portfolio grid with category filters & YouTube lightbox
 * 6. Interactive fluid cursor glow tracking
 * 7. Active section navigation scroll-spy
 * 8. Smooth scrolling for internal anchor links and CTA buttons
 * 9. IntersectionObserver scroll-reveal animations (.skill-card, .section-title)
 * 10. Responsive mobile hamburger menu controller
 * ==============================================================================
 */

import { initCharacter } from './character.js';
import { initHandScene } from './hand-scene.js';
import { initVideoGrid } from './video-grid.js';

// ------------------------------------------------------------------------------
// 1. GSAP PLUGIN REGISTRATION
// ------------------------------------------------------------------------------
if (window.gsap && window.ScrollTrigger) {
  window.gsap.registerPlugin(window.ScrollTrigger);
}

// ------------------------------------------------------------------------------
// 2. PRELOADER CONTROLLER
// ------------------------------------------------------------------------------
function setupPreloader() {
  let preloader = document.getElementById('preloader');

  // If preloader element is not in static HTML, inject high-performance overlay
  if (!preloader) {
    preloader = document.createElement('div');
    preloader.id = 'preloader';
    preloader.innerHTML = `
      <div class="preloader-content">
        <div class="preloader-spinner"></div>
        <div class="preloader-brand">
          <span class="preloader-dot"></span>
          <span>ADITYA KAPGATE</span>
        </div>
      </div>
    `;

    const preloaderStyles = document.createElement('style');
    preloaderStyles.id = 'preloader-inline-styles';
    preloaderStyles.textContent = `
      #preloader {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background-color: #0a0a0f;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
        visibility: visible;
        transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                    visibility 0.65s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #preloader.fade-out {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      .preloader-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 22px;
      }
      .preloader-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(255, 255, 255, 0.08);
        border-top-color: #00d4ff;
        border-right-color: #a855f7;
        border-radius: 50%;
        animation: preloaderSpin 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.35);
      }
      .preloader-brand {
        font-family: 'Outfit', sans-serif;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        color: #f0f0f5;
        display: flex;
        align-items: center;
        gap: 10px;
        text-transform: uppercase;
      }
      .preloader-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #00d4ff;
        box-shadow: 0 0 10px #00d4ff;
      }
      @keyframes preloaderSpin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(preloaderStyles);
    document.body.prepend(preloader);
  }

  // Hide loading screen after 1.5 seconds with graceful fade out
  setTimeout(() => {
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.remove();
      const styleEl = document.getElementById('preloader-inline-styles');
      if (styleEl) styleEl.remove();
    }, 700);
  }, 1500);
}

// ------------------------------------------------------------------------------
// 3. CURSOR GLOW CONTROLLER
// ------------------------------------------------------------------------------
function setupCursorGlow() {
  let glow = document.getElementById('cursor-glow');

  if (!glow) {
    glow = document.createElement('div');
    glow.id = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let currentX = mouseX;
  let currentY = mouseY;
  let isPointerInWindow = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isPointerInWindow) {
      isPointerInWindow = true;
      glow.style.opacity = '1';
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    isPointerInWindow = false;
    glow.style.opacity = '0';
  });

  function renderGlow() {
    // Smooth lerp follow
    currentX += (mouseX - currentX) * 0.14;
    currentY += (mouseY - currentY) * 0.14;

    glow.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(renderGlow);
  }

  requestAnimationFrame(renderGlow);
}

// ------------------------------------------------------------------------------
// 4. NAVIGATION SCROLL-SPY & HIGHLIGHTING
// ------------------------------------------------------------------------------
function setupNavHighlighting() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .nav-link');

  if (sections.length === 0 || navLinks.length === 0) return;

  function onScroll() {
    const scrollPosition = window.scrollY + 180;

    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPosition >= top && scrollPosition < top + height) {
        navLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (href === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ------------------------------------------------------------------------------
// 5. SMOOTH SCROLLING FOR INTERNAL LINKS & CTAs
// ------------------------------------------------------------------------------
function setupSmoothScrolling(closeMobileNavCallback) {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();

        // Calculate header offset
        const navbar = document.querySelector('.navbar');
        const headerOffset = navbar ? navbar.offsetHeight : 70;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Close mobile drawer if open
        if (typeof closeMobileNavCallback === 'function') {
          closeMobileNavCallback();
        }

        // Update history state smoothly without jumping
        if (history.pushState) {
          history.pushState(null, '', targetId);
        }
      }
    });
  });
}

// ------------------------------------------------------------------------------
// 6. SCROLL-REVEAL OBSERVER (.skill-card, .section-title)
// ------------------------------------------------------------------------------
function setupScrollReveal() {
  const revealElements = document.querySelectorAll('.skill-card, .section-title');

  if (revealElements.length === 0) return;

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach((el) => {
    el.classList.add('hidden');
    revealObserver.observe(el);
  });
}

// ------------------------------------------------------------------------------
// 7. RESPONSIVE MOBILE NAVIGATION (HAMBURGER)
// ------------------------------------------------------------------------------
function setupMobileNav() {
  const hamburger = document.getElementById('hamburger') || document.querySelector('.hamburger');
  const navLinks = document.getElementById('nav-links') || document.querySelector('.nav-links');
  const navbar = document.getElementById('navbar') || document.querySelector('.navbar');

  if (!hamburger || !navLinks) return { close: () => {} };

  function closeMobileNav() {
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('active');
    document.body.style.overflow = '';
  }

  function toggleMobileNav() {
    const isOpening = !hamburger.classList.contains('active');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpening ? 'true' : 'false');
    navLinks.classList.toggle('active');

    // Prevent background scrolling while full-screen mobile menu is open
    document.body.style.overflow = isOpening ? 'hidden' : '';
  }

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileNav();
  });

  // Close when clicking outside of navbar
  document.addEventListener('click', (e) => {
    if (navbar && !navbar.contains(e.target) && navLinks.classList.contains('active')) {
      closeMobileNav();
    }
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
      closeMobileNav();
    }
  });

  return { close: closeMobileNav };
}

// ------------------------------------------------------------------------------
// 8. APPLICATION INITIALIZATION LIFECYCLE
// ------------------------------------------------------------------------------
function initApp() {
  // Step 1: Preloader
  setupPreloader();

  // Step 2: Cursor Glow
  setupCursorGlow();

  // Step 3: Interactive 2.5D Character
  const characterContainer = document.getElementById('character-container');
  if (characterContainer) {
    initCharacter(characterContainer);
  }

  // Step 4: Three.js Procedural Hand Scene
  const handContainer = document.getElementById('hand-scene-container');
  if (handContainer) {
    initHandScene(handContainer);
  }

  // Step 5: Video Portfolio Grid & Lightbox
  initVideoGrid();

  // Step 6: Mobile Hamburger Navigation
  const mobileNav = setupMobileNav();

  // Step 7: Smooth Scrolling for internal anchors
  setupSmoothScrolling(mobileNav.close);

  // Step 8: Active Nav Highlighting (Scroll-Spy)
  setupNavHighlighting();

  // Step 9: Scroll Reveal Animations
  setupScrollReveal();
}

// Ensure DOM is ready before executing initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
