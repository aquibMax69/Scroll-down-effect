// ========================================
// FRAME-BASED SCROLL VIDEO PLAYER
// ========================================

const TOTAL_FRAMES = 132;
const FRAME_PATH = 'frames/frame_';
const FRAME_EXT = '.jpg';

// DOM Elements
const canvas = document.getElementById('frameCanvas');
const ctx = canvas.getContext('2d');
const videoSection = document.getElementById('videoSection');
const progressBar = document.getElementById('progressBar');
const progressPercentage = document.getElementById('progressPercentage');
const frameCounter = document.getElementById('frameCounter');
const overlays = document.querySelectorAll('.video-overlay');
const outroContent = document.querySelector('.outro-content');
const replayBtn = document.getElementById('replayBtn');
const loadingScreen = document.getElementById('loadingScreen');
const loaderBarFill = document.getElementById('loaderBarFill');
const loaderCount = document.getElementById('loaderCount');
const introSection = document.getElementById('intro');
const introContent = introSection.querySelector('.intro-content');

// Frame storage
const frames = [];
let currentFrame = 0;
let ticking = false;
let allLoaded = false;

// ========================================
// PAD FRAME NUMBER (e.g., 1 -> "0001")
// ========================================
function padNumber(num, size = 4) {
    let s = String(num);
    while (s.length < size) s = '0' + s;
    return s;
}

// ========================================
// PRELOAD ALL FRAMES
// ========================================
function preloadFrames() {
    let loaded = 0;

    return new Promise((resolve) => {
        for (let i = 1; i <= TOTAL_FRAMES; i++) {
            const img = new Image();
            img.src = `${FRAME_PATH}${padNumber(i)}${FRAME_EXT}`;

            img.onload = () => {
                loaded++;
                const percent = Math.round((loaded / TOTAL_FRAMES) * 100);
                loaderBarFill.style.width = `${percent}%`;
                loaderCount.textContent = `${loaded} / ${TOTAL_FRAMES}`;

                if (loaded === TOTAL_FRAMES) {
                    allLoaded = true;
                    resolve();
                }
            };

            img.onerror = () => {
                loaded++;
                console.warn(`Failed to load frame ${i}`);
                if (loaded === TOTAL_FRAMES) {
                    allLoaded = true;
                    resolve();
                }
            };

            frames[i - 1] = img;
        }
    });
}

// ========================================
// RENDER A FRAME TO CANVAS
// ========================================
function renderFrame(index) {
    if (index < 0 || index >= TOTAL_FRAMES) return;
    if (currentFrame === index) return; // Already showing this frame
    currentFrame = index;

    const img = frames[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    // Cover-fit the image to the canvas
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
        // Image is wider — fit by height, crop sides
        drawHeight = canvas.height;
        drawWidth = img.naturalWidth * (canvas.height / img.naturalHeight);
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
    } else {
        // Image is taller — fit by width, crop top/bottom
        drawWidth = canvas.width;
        drawHeight = img.naturalHeight * (canvas.width / img.naturalWidth);
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

// ========================================
// RESIZE CANVAS TO FILL VIEWPORT
// ========================================
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';

    // Re-render current frame at new size
    currentFrame = -1; // Force re-render
    handleScroll();
}

// ========================================
// MAIN SCROLL HANDLER
// ========================================
function handleScroll() {
    if (!allLoaded) return;

    const sectionTop = videoSection.offsetTop;
    const sectionHeight = videoSection.offsetHeight;
    const viewportHeight = window.innerHeight;

    // Progress through the video section (0 to 1)
    const scrolled = window.scrollY - sectionTop;
    const scrollableDistance = sectionHeight - viewportHeight;
    let progress = scrolled / scrollableDistance;
    progress = Math.max(0, Math.min(1, progress));

    // Map progress to a frame index
    const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.floor(progress * TOTAL_FRAMES)
    );

    // Render the frame
    renderFrame(frameIndex);

    // Update UI
    const percent = Math.round(progress * 100);
    progressBar.style.width = `${percent}%`;
    progressPercentage.textContent = `${percent}%`;
    frameCounter.textContent = `Frame ${frameIndex + 1} / ${TOTAL_FRAMES}`;

    // Text overlays
    overlays.forEach(overlay => {
        const showAt = parseFloat(overlay.dataset.showAt);
        const hideAt = parseFloat(overlay.dataset.hideAt);

        if (progress >= showAt && progress < hideAt) {
            overlay.classList.add('visible');
        } else {
            overlay.classList.remove('visible');
        }
    });

    // Outro
    if (progress > 0.95) {
        outroContent.classList.add('visible');
    }
}

// ========================================
// INTRO PARALLAX FADE
// ========================================
function handleIntroParallax() {
    const scrollY = window.scrollY;
    const introHeight = introSection.offsetHeight;

    if (scrollY < introHeight) {
        const p = scrollY / introHeight;
        introContent.style.opacity = 1 - p * 1.5;
        introContent.style.transform = `translateY(${scrollY * 0.3}px)`;
    }
}

// ========================================
// SCROLL EVENT (rAF throttled)
// ========================================
window.addEventListener('scroll', () => {
    handleIntroParallax();

    if (!ticking) {
        requestAnimationFrame(() => {
            handleScroll();
            ticking = false;
        });
        ticking = true;
    }
});

// ========================================
// RESIZE EVENT
// ========================================
window.addEventListener('resize', resizeCanvas);

// ========================================
// REPLAY BUTTON
// ========================================
replayBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    outroContent.classList.remove('visible');
});

// ========================================
// INIT
// ========================================
async function init() {
    // Set canvas size
    resizeCanvas();

    // Preload all frames with progress UI
    await preloadFrames();

    // Render the first frame
    renderFrame(0);

    // Hide loading screen
    loadingScreen.classList.add('hidden');

    // Process initial scroll position
    handleScroll();
}

init();
