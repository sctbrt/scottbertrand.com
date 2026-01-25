/**
 * Dot Grid Background Animation
 * Canvas-based organic radial wave pattern
 */
(function() {
    const canvas = document.getElementById('dotWaveCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mobile detection
    const isMobile = window.innerWidth <= 640;

    // Configuration - radial waves like ripples in water
    // Mobile: increased spacing (28 vs 22), reduced opacity (~15% less)
    const config = {
        dotSpacing: isMobile ? 28 : 22,
        dotRadius: isMobile ? 1.8 : 2.0,
        // Multiple radial wave sources - gentle but perceptible
        waveSources: [
            { x: 0.25, y: 0.35, amplitude: 5, wavelength: 140, speed: 0.028, phase: 0 },
            { x: 0.75, y: 0.65, amplitude: 4.5, wavelength: 170, speed: 0.024, phase: Math.PI * 0.6 },
            { x: 0.5, y: 0.2, amplitude: 3.5, wavelength: 200, speed: 0.020, phase: Math.PI * 1.2 }
        ],
        // Global breathing wave - slow, affects all dots
        breathingWave: {
            amplitude: 0.15,  // Subtle size pulse
            speed: 0.008     // Very slow breathing
        },
        horizontalFactor: 0.3,  // How much horizontal movement (0-1)
        sizeVariation: 0.5,     // How much dots grow/shrink (increased near sources)
        opacityVariation: 0.35, // Dots fade as displaced for depth
        // Mobile: ~15% reduced opacity so dots don't compete with text
        opacity: {
            light: isMobile ? 0.27 : 0.32,
            dark: isMobile ? 0.18 : 0.22
        }
    };

    // Soft easing function - smoother than pure sine
    function softWave(t) {
        // Attempt a smoother curve at peaks/troughs
        const sin = Math.sin(t * Math.PI * 2);
        return sin * (1 - 0.15 * sin * sin);
    }

    let animationId = null;
    let centerX, centerY;
    let lastFrameTime = 0;
    let isScrolling = false;
    let scrollTimeout = null;

    // Mobile frame rate limiting - 30fps on mobile for battery savings
    const TARGET_FPS = isMobile ? 30 : 60;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    // Theme detection
    function isDarkMode() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // Get dot color with optional opacity modifier
    function getDotColor(opacityMod = 1) {
        const dark = isDarkMode();
        const baseOpacity = dark ? config.opacity.dark : config.opacity.light;
        const opacity = baseOpacity * opacityMod;
        return dark
            ? `rgba(245, 158, 11, ${opacity})`
            : `rgba(217, 119, 6, ${opacity})`;
    }

    // Resize canvas
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        centerX = window.innerWidth / 2;
        centerY = window.innerHeight / 2;
    }

    // Main draw function with frame rate limiting
    function draw(timestamp) {
        // Frame rate limiting for mobile performance
        if (isMobile && lastFrameTime) {
            const elapsed = timestamp - lastFrameTime;
            if (elapsed < FRAME_INTERVAL) {
                animationId = requestAnimationFrame(draw);
                return;
            }
        }
        lastFrameTime = timestamp;

        const time = timestamp * 0.001; // Seconds

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dynamic spacing for ultra-wide/4K displays to limit dot count
        // Cap dot count at ~2500 for performance (50x50 grid)
        const MAX_DOTS = 2500;
        const viewportArea = window.innerWidth * window.innerHeight;
        const baseSpacing = config.dotSpacing;

        // Calculate minimum spacing needed to stay under MAX_DOTS
        const minSpacingForLimit = Math.sqrt(viewportArea / MAX_DOTS);
        const spacing = Math.max(baseSpacing, minSpacingForLimit);

        const cols = Math.ceil(window.innerWidth / spacing) + 2;
        const rows = Math.ceil(window.innerHeight / spacing) + 2;
        const offsetX = (window.innerWidth % spacing) / 2;
        const offsetY = (window.innerHeight % spacing) / 2;

        // Store dots by opacity level for batched drawing
        const dotsByOpacity = new Map();

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const baseX = col * spacing + offsetX;
                const baseY = row * spacing + offsetY;

                let x = baseX;
                let y = baseY;
                let radius = config.dotRadius;
                let opacityMod = 1;

                if (!reducedMotion) {
                    let totalWaveY = 0;
                    let totalWaveX = 0;
                    let maxIntensity = 0;

                    // Calculate radial waves from each source
                    config.waveSources.forEach(source => {
                        const sourceX = source.x * window.innerWidth;
                        const sourceY = source.y * window.innerHeight;
                        const dx = baseX - sourceX;
                        const dy = baseY - sourceY;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        // Radial wave with softer easing
                        const wavePhase = (distance / source.wavelength) - (time * source.speed * 10) + source.phase;
                        const waveValue = softWave(wavePhase);

                        // Gentler falloff for more visible distant waves
                        const falloff = Math.exp(-distance / 700);
                        const contribution = waveValue * source.amplitude * falloff;

                        // Vertical displacement
                        totalWaveY += contribution;

                        // Horizontal displacement - dots push outward from source
                        if (distance > 1) {
                            const normalX = dx / distance;
                            const normalY = dy / distance;
                            totalWaveX += contribution * normalX * config.horizontalFactor;
                        }

                        // Track intensity for size/opacity (stronger near sources)
                        const intensity = Math.abs(waveValue) * falloff;
                        if (intensity > maxIntensity) maxIntensity = intensity;
                    });

                    // Apply displacements
                    x += totalWaveX;
                    y += totalWaveY;

                    // Global breathing wave - gentle pulse affecting all dots
                    const breathPhase = time * config.breathingWave.speed * 10;
                    const breathValue = Math.sin(breathPhase * Math.PI * 2);
                    const breathScale = 1 + breathValue * config.breathingWave.amplitude;

                    // Size varies with wave intensity (more dramatic near sources)
                    const sizeBoost = 1 + maxIntensity * 2; // Stronger effect near wave origins
                    radius = config.dotRadius * breathScale * (1 + (totalWaveY / 10) * config.sizeVariation * sizeBoost);
                    radius = Math.max(radius, config.dotRadius * 0.5); // Minimum size

                    // Opacity varies with displacement for depth
                    const displacement = Math.sqrt(totalWaveX * totalWaveX + totalWaveY * totalWaveY);
                    opacityMod = 1 - (displacement / 15) * config.opacityVariation;
                    opacityMod = Math.max(opacityMod, 0.5); // Minimum opacity
                }

                // Round opacity for batching (reduces draw calls)
                const opacityKey = Math.round(opacityMod * 20) / 20;
                if (!dotsByOpacity.has(opacityKey)) {
                    dotsByOpacity.set(opacityKey, []);
                }
                dotsByOpacity.get(opacityKey).push({ x, y, radius });
            }
        }

        // Draw dots batched by opacity level
        dotsByOpacity.forEach((dots, opacityMod) => {
            ctx.fillStyle = getDotColor(opacityMod);
            ctx.beginPath();
            dots.forEach(dot => {
                ctx.moveTo(dot.x + dot.radius, dot.y);
                ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
            });
            ctx.fill();
        });

        if (!reducedMotion) {
            animationId = requestAnimationFrame(draw);
        }
    }

    // Initialize
    resize();

    if (reducedMotion) {
        draw(0);
    } else {
        animationId = requestAnimationFrame(draw);
    }

    // Resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resize, 150);
    }, { passive: true });

    // Theme change handler
    const observer = new MutationObserver(() => {
        if (reducedMotion) draw(0);
    });
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    // Visibility handler
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        } else if (!document.hidden && !reducedMotion && !animationId) {
            animationId = requestAnimationFrame(draw);
        }
    });

    // Pause animation during active scrolling on mobile for better performance
    if (isMobile) {
        window.addEventListener('scroll', () => {
            isScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 150);
        }, { passive: true });
    }
})();
