/**
 * ==============================================================================
 * VIDEO GRID COMPONENT WITH GSAP FILTERING & LIGHTBOX PLAYER
 * ==============================================================================
 * Fetches data/videos.json, dynamically populates the portfolio grid, manages
 * animated category filtering with GSAP, and controls the YouTube modal lightbox.
 * ==============================================================================
 */

/**
 * Maps raw category slugs to human-friendly badge labels.
 */
const CATEGORY_LABELS = {
  editing: 'Video Editing',
  blender: 'Blender 3D',
  ai: 'AI Videos',
  vfx: 'VFX & Motion'
};

/**
 * Initializes the video grid, filters, and lightbox player.
 *
 * @returns {Promise<void>}
 */
export async function initVideoGrid() {
  const gridContainer = document.getElementById('video-grid');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const lightbox = document.getElementById('lightbox');
  const lightboxIframe = document.getElementById('lightbox-iframe') || lightbox?.querySelector('iframe');
  const lightboxCloseBtn = document.getElementById('lightbox-close') || lightbox?.querySelector('.lightbox-close');

  if (!gridContainer) {
    console.warn('[VideoGrid] #video-grid container element not found.');
    return;
  }

  // ----------------------------------------------------------------------------
  // 1. DATA FETCHING
  // ----------------------------------------------------------------------------
  let videos = [];
  try {
    const response = await fetch('data/videos.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    videos = await response.json();
  } catch (error) {
    console.error('[VideoGrid] Failed to load video data:', error);
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <p style="font-size: 1.1rem; margin-bottom: 8px;">Unable to load portfolio projects right now.</p>
        <p style="font-size: 0.9rem;">Please check your connection and try refreshing.</p>
      </div>
    `;
    return;
  }

  // ----------------------------------------------------------------------------
  // 2. RENDER VIDEO CARDS
  // ----------------------------------------------------------------------------
  gridContainer.innerHTML = '';

  const fragment = document.createDocumentFragment();

  videos.forEach((video) => {
    const card = document.createElement('article');
    card.className = 'video-card';
    card.dataset.category = video.category || 'all';
    card.dataset.youtube = video.youtube || '';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Play video: ${video.title}`);

    const categoryTitle = CATEGORY_LABELS[video.category] || (video.category ? video.category.toUpperCase() : 'Video');

    // High quality thumbnail with fallback on error
    const maxResThumb = `https://img.youtube.com/vi/${video.youtube}/maxresdefault.jpg`;
    const hqThumb = `https://img.youtube.com/vi/${video.youtube}/hqdefault.jpg`;

    card.innerHTML = `
      <div class="video-thumb-container">
        <img
          src="${maxResThumb}"
          alt="${video.title} thumbnail"
          class="video-thumb"
          loading="lazy"
          onerror="this.onerror=null;this.src='${hqThumb}';"
        />
        <div class="play-btn play-overlay" aria-hidden="true">▶</div>
      </div>
      <div class="video-info">
        <span class="video-category-tag">${categoryTitle}</span>
        <h3 class="video-title">${video.title}</h3>
        <p class="video-desc">${video.description}</p>
      </div>
    `;

    fragment.appendChild(card);
  });

  gridContainer.appendChild(fragment);

  // ----------------------------------------------------------------------------
  // 3. GSAP SCROLLTRIGGER ENTRANCE ANIMATION
  // ----------------------------------------------------------------------------
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.from('#video-grid .video-card', {
      scrollTrigger: {
        trigger: '#video-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 45,
      opacity: 0,
      duration: 0.65,
      stagger: 0.08,
      ease: 'power3.out',
      clearProps: 'transform'
    });
  }

  // ----------------------------------------------------------------------------
  // 4. LIGHTBOX PLAYER MODAL LOGIC
  // ----------------------------------------------------------------------------
  function openLightbox(youtubeId) {
    if (!lightbox || !lightboxIframe || !youtubeId) return;

    // Load video via youtube-nocookie with autoplay
    lightboxIframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    if (lightboxCloseBtn) {
      setTimeout(() => lightboxCloseBtn.focus(), 100);
    }
  }

  function closeLightbox() {
    if (!lightbox || !lightboxIframe) return;

    // Reset iframe to stop audio/video stream
    lightboxIframe.src = '';
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Event Delegation for clicking on video cards
  gridContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.video-card');
    if (card && card.dataset.youtube) {
      openLightbox(card.dataset.youtube);
    }
  });

  // Keyboard accessibility: Enter or Space opens card
  gridContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.video-card');
      if (card && card.dataset.youtube) {
        e.preventDefault();
        openLightbox(card.dataset.youtube);
      }
    }
  });

  // Close handlers
  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      // Close only if clicking the background overlay
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Escape key closes modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox?.classList.contains('active')) {
      closeLightbox();
    }
  });

  // ----------------------------------------------------------------------------
  // 5. CATEGORY FILTERING WITH ANIMATED TRANSITIONS
  // ----------------------------------------------------------------------------
  const cards = Array.from(gridContainer.querySelectorAll('.video-card'));

  function filterCards(category) {
    cards.forEach((card) => {
      const cardCategory = card.dataset.category;
      const isMatch = category === 'all' || cardCategory === category;

      if (gsap) {
        if (isMatch) {
          card.style.display = 'flex';
          gsap.fromTo(
            card,
            { opacity: 0, scale: 0.88, y: 15 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.35,
              ease: 'power2.out',
              clearProps: 'transform'
            }
          );
        } else {
          gsap.to(card, {
            opacity: 0,
            scale: 0.88,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
              card.style.display = 'none';
            }
          });
        }
      } else {
        card.style.display = isMatch ? 'flex' : 'none';
      }
    });

    if (window.ScrollTrigger) {
      setTimeout(() => window.ScrollTrigger.refresh(), 360);
    }
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const selectedCategory = btn.dataset.category || 'all';
      filterCards(selectedCategory);
    });
  });
}
