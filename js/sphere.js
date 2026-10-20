import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(function() {
    let cfg = window.GIFT_DATA || {};
    let scene, camera, renderer, controls;
    let spGroup, spClickSphere, spRaycaster, spMouse;
    let spTextures = [], spSphereImageUrls = [];
    let spMeshes = [], spFloatingImages = [], spFloatingGroup = null;
    let spParticlesMesh, spRainMesh, spRainPositions;
    let orbitingWishGroup = null, orbitingWishAppearStart = null;
    
    // Ripple and Pulse Pool
    const effectPool = { waves: [], sparkles: [] };
    const POOL_SIZE = 4;
    let isPulsing = false, pulseStartTime = 0;
    const PULSE_DURATION = 0.6;
    const PULSE_AMPLITUDE = 0.12;

    // Phase flags & states
    let isSphereActive = false;
    let spPhase = false;
    let spIntroComplete = false;
    let spIntroStartTime = 0;
    let spIntroCompleteTime = 0;
    let spHasZoomedIn = false;
    let spNeedZoomIn = false;
    let spZoomInTime = 0;
    let spZoomInTarget = new THREE.Vector3();
    let spIsExploded = false;
    let spExplosionProgress = 0;
    let spFadeProgress = 0;
    let spExplosionStartTime = 0;
    let spTime = 0;
    let spDriftTiltAngle = 0;
    let spDriftTiltDir = 1;
    let lastTime = performance.now();

    // Gestures
    let spMouseDownX = 0, spMouseDownY = 0;
    let spIsPointerDown = false, spWasDrag = false;
    const SP_DRAG_THRESHOLD = 6;

    // Sphere Constants
    const SP_RADIUS = 5.8;
    const SP_ROWS = 6;
    const SP_POLAR_MARGIN = 0.0;
    const SP_INTRO_RADIUS = 16;
    const SP_INTRO_DURATION_MS = 2600;
    const SP_INTRO_STAGGER_MS = 800;
    const SP_FLYOUT_BOUND = 12;
    const SP_RAIN_SPEED = 0.028;
    const SP_RAIN_COUNT = 400;

    // Orbiting Wishes Constants
    const ORBIT_WISH_COUNT = 65;
    const ORBIT_WISH_PINK = "#ff69b4";
    const ORBIT_WISH_PINK_STROKE = "rgba(255, 20, 147, 0.95)";
    const ORBIT_WISH_APPEAR_SPAN = 8.0;
    const ORBIT_WISH_FADE_DURATION = 1.4;

    // Letter states
    let cupidLetterState = 'idle';
    let cupidFlyStartTime = 0;
    const CUPID_FLY_DURATION_MS = 1800;

    // Helper: random point on sphere
    function spRandOnSphere(r) {
        const t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
        return new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
    }

    // Helper: spherical patch geometry
    function spCreatePatch(r, t0, t1, p0, p1, ws, hs) {
        const geo = new THREE.BufferGeometry();
        const verts = [], uvs = [], idx = [];
        for (let y = 0; y <= hs; y++) {
            const v = y / hs, phi = p0 + v * (p1 - p0);
            for (let x = 0; x <= ws; x++) {
                const u = x / ws, theta = t0 + u * (t1 - t0);
                verts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
                uvs.push(u, 1 - v);
            }
        }
        for (let y = 0; y < hs; y++) {
            for (let x = 0; x < ws; x++) {
                const a = y * (ws + 1) + x, b = a + 1, c = a + (ws + 1), d = c + 1;
                idx.push(a, c, b, b, c, d);
            }
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }

    // Helper: rounded rectangle geometry for floating images
    function spRoundedRectGeo(w, h, radius) {
        const shape = new THREE.Shape();
        const x = -w / 2, y = -h / 2;
        shape.moveTo(x + radius, y);
        shape.lineTo(x + w - radius, y);
        shape.quadraticCurveTo(x + w, y, x + w, y + radius);
        shape.lineTo(x + w, y + h - radius);
        shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        shape.lineTo(x + radius, y + h);
        shape.quadraticCurveTo(x, y + h, x, y + h - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);
        const geo = new THREE.ShapeGeometry(shape);
        const pos = geo.attributes.position, uvsArr = [];
        for (let i = 0; i < pos.count; i++) {
            uvsArr.push((pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
        }
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvsArr, 2));
        return geo;
    }

    // Helper: radial glow texture
    function spGlowTexture(size) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d'), cx = size / 2;
        const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
        g.addColorStop(0, 'rgba(255, 105, 180, 1)');
        g.addColorStop(0.25, 'rgba(255, 182, 193, 0.85)');
        g.addColorStop(0.5, 'rgba(255, 105, 180, 0.4)');
        g.addColorStop(0.75, 'rgba(255, 105, 180, 0.15)');
        g.addColorStop(1, 'rgba(255, 105, 180, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(c);
    }

    // Text texture for orbiting wishes (dynamic measurement to prevent any text clipping)
    const orbitWishTextureCache = new Map();

    function createOrbitingWishTexture(text) {
        const lines = String(text).split('\n');
        const fontSize = 76;
        const fontFace = (cfg.sphere && cfg.sphere.wishFontFamily)
            ? `${cfg.sphere.wishFontFamily}, "Pacifico", "Dancing Script", cursive, sans-serif`
            : '"Pacifico", "Dancing Script", cursive, "Segoe UI Emoji", sans-serif';

        // Measure text with offscreen canvas
        const measureCanvas = document.createElement("canvas");
        const measureCtx = measureCanvas.getContext("2d");
        measureCtx.font = `${fontSize}px ${fontFace}`;

        let maxTextWidth = 0;
        lines.forEach(line => {
            const w = Math.ceil(measureCtx.measureText(line).width);
            if (w > maxTextWidth) maxTextWidth = w;
        });

        // Generous padding so strokes, diacritics and emojis never get clipped
        const paddingX = 90;
        const paddingY = 40;
        const lineHeight = Math.round(fontSize * 1.35);
        const canvasWidth = Math.max(512, Math.ceil(maxTextWidth + paddingX * 2));
        const canvasHeight = Math.max(220, Math.ceil(lines.length * lineHeight + paddingY * 2));

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        ctx.font = `${fontSize}px ${fontFace}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        const strokeColor = (cfg.sphere && cfg.sphere.wishStrokeColor) || ORBIT_WISH_PINK_STROKE;
        const fillColor = (cfg.sphere && cfg.sphere.wishColor) || ORBIT_WISH_PINK;

        const startY = (canvasHeight - (lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, idx) => {
            const y = startY + idx * lineHeight;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 9;
            ctx.strokeText(line, canvasWidth / 2, y);

            ctx.fillStyle = fillColor;
            ctx.fillText(line, canvasWidth / 2, y);
        });

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        return tex;
    }

    function getOrbitingWishTexture(text) {
        if (orbitWishTextureCache.has(text)) {
            return orbitWishTextureCache.get(text);
        }
        const tex = createOrbitingWishTexture(text);
        orbitWishTextureCache.set(text, tex);
        return tex;
    }

    // Build the 3D Sphere from textures
    function spBuildSphere() {
        let imgIdx = 0, midIdx = 0;
        const midRows = [2, 3];
        const spPhiStart = Math.PI * SP_POLAR_MARGIN;
        const spPhiEnd   = Math.PI * (1 - SP_POLAR_MARGIN);
        const spPhiRange = spPhiEnd - spPhiStart;
        const len = spTextures.length;

        for (let row = 0; row < SP_ROWS; row++) {
            const p1 = spPhiStart + (row / SP_ROWS) * spPhiRange;
            const p2 = spPhiStart + ((row + 1) / SP_ROWS) * spPhiRange;
            const pMid = (p1 + p2) / 2;
            const circ = 2 * Math.PI * SP_RADIUS * Math.sin(pMid);
            const imgH = spPhiRange * SP_RADIUS / SP_ROWS;
            const n = Math.max(3, Math.round(circ / imgH));
            const tStep = (2 * Math.PI) / n;

            for (let col = 0; col < n; col++) {
                const t = col * tStep;
                let tex;
                if (midRows.includes(row)) {
                    tex = spTextures[midIdx % len];
                    midIdx++;
                } else {
                    tex = spTextures[imgIdx % len];
                    imgIdx++;
                }

                const geo = spCreatePatch(SP_RADIUS, t, t + tStep, p1, p2, 10, 10);
                const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 1 });
                const mesh = new THREE.Mesh(geo, mat);
                const startPos = spRandOnSphere(SP_INTRO_RADIUS);
                mesh.userData.introStartPos = startPos;
                mesh.userData.introDelay = Math.random() * SP_INTRO_STAGGER_MS;
                mesh.position.copy(startPos);
                spGroup.add(mesh);
                spMeshes.push(mesh);
            }
        }
        spIntroStartTime = Date.now();
    }

    // Build 3D Orbiting Wishes
    function createOrbitingWishSprites() {
        if (orbitingWishGroup) return;
        const wishes = (cfg.sphere && Array.isArray(cfg.sphere.wishes) && cfg.sphere.wishes.length)
            ? cfg.sphere.wishes
            : [
                "Happy Valentine's Day 💖",
                "Mãi bên nhau nhé 💕",
                "Anh yêu em nhiều 💓",
                "iuuu Hương Giang 😘",
                "Cảm ơn vì em đã đến bên anh ✨",
                "Always with you 🌸"
            ];

        orbitingWishGroup = new THREE.Group();
        orbitingWishGroup.visible = true;

        // Base 3D scale for wishes (increased for readability and grandeur)
        const baseScale = (cfg.sphere && typeof cfg.sphere.wishScale === 'number')
            ? cfg.sphere.wishScale
            : (isMobile ? 2.4 : 2.9);

        for (let i = 0; i < ORBIT_WISH_COUNT; i++) {
            const text = wishes[i % wishes.length];
            const tex = getOrbitingWishTexture(text);
            const mat = new THREE.SpriteMaterial({
                map: tex,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const sprite = new THREE.Sprite(mat);
            sprite.material.opacity = 0;
            const aspect = (tex.image && tex.image.height) ? (tex.image.width / tex.image.height) : 7;
            sprite.scale.set(aspect * baseScale, baseScale, 1);
            sprite.userData.orbitAngle = Math.random() * Math.PI * 2;
            sprite.userData.orbitSpeed = 0.04 + Math.random() * 0.06;
            sprite.userData.orbitRadius = 15 + Math.random() * 22;
            sprite.userData.baseY = (Math.random() - 0.5) * 24;
            sprite.userData.floatSpeed = 0.25 + Math.random() * 0.35;
            sprite.userData.floatAmplitude = 1.2 + Math.random() * 2.0;
            sprite.userData.floatPhase = Math.random() * Math.PI * 2;
            sprite.userData.appearDelay = Math.random() * ORBIT_WISH_APPEAR_SPAN;
            orbitingWishGroup.add(sprite);
        }
        scene.add(orbitingWishGroup);
    }

    // Build floating images upon explosion
    function spCreateFloatingImages() {
        if (spFloatingGroup) return;
        spFloatingGroup = new THREE.Group();
        scene.add(spFloatingGroup);

        const total = 36, grid = 15, used = [];
        const glowTex = spGlowTexture(128);

        function validPos(x, y, z, d) {
            return used.every(p => Math.hypot(x - p.x, y - p.y, z - p.z) >= d);
        }
        function findPos(size) {
            const minDist = Math.max(size * 1.5, 2.5);
            for (let att = 0; att < 120; att++) {
                const a = Math.random() * Math.PI * 2, dist = 5.5 + Math.random() * 7;
                const pos = { x: Math.cos(a) * dist, y: (Math.random() - 0.5) * grid, z: Math.sin(a) * dist };
                if (validPos(pos.x, pos.y, pos.z, minDist)) {
                    used.push(pos);
                    return pos;
                }
            }
            const a = Math.random() * Math.PI * 2, dist = 6 + Math.random() * 6;
            return { x: Math.cos(a) * dist, y: (Math.random() - 0.5) * grid, z: Math.sin(a) * dist };
        }

        for (let i = 0; i < total; i++) {
            const ti = i % spTextures.length;
            const tex = spTextures[ti];
            const sv = 0.6 + Math.random() * 1.6, w = 1.4 * sv, h = 1.0 * sv, cr = 0.12 * sv;
            const ig = new THREE.Group();

            const goMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
            ig.add(new THREE.Mesh(spRoundedRectGeo(w * 2.0, h * 2.0, cr * 2.0), goMat));

            const gMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
            ig.add(new THREE.Mesh(spRoundedRectGeo(w * 1.4, h * 1.4, cr * 1.4), gMat));

            const iMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0 });
            ig.add(new THREE.Mesh(spRoundedRectGeo(w, h, cr), iMat));

            const tPhi = Math.acos(2 * Math.random() - 1), tTheta = Math.random() * Math.PI * 2;
            ig.position.set(SP_RADIUS * 0.5 * Math.sin(tPhi) * Math.cos(tTheta), SP_RADIUS * 0.5 * Math.cos(tPhi), SP_RADIUS * 0.5 * Math.sin(tPhi) * Math.sin(tTheta));
            const tp = findPos(Math.max(w, h));

            ig.userData = {
                startPos: ig.position.clone(),
                targetPos: new THREE.Vector3(tp.x, tp.y, tp.z),
                floatSpeedY: 0.3 + Math.random() * 0.5,
                floatAmplY: 0.12 + Math.random() * 0.25,
                floatPhase: Math.random() * Math.PI * 2,
                delay: Math.random() * 0.45,
                basePos: new THREE.Vector3(tp.x, tp.y, tp.z),
                iMat, gMat, goMat,
                driftSpeed: 0.002 + Math.random() * 0.003,
                baseZ: tp.z
            };
            spFloatingGroup.add(ig);
            spFloatingImages.push(ig);
        }
    }

    // Trigger sphere explosion & reveal orbiting wishes
    function spTriggerExplosion() {
        if (spIsExploded) return;
        spIsExploded = true;
        spExplosionProgress = 0;
        spFadeProgress = 0;
        spMeshes.forEach(m => { if (m.material) m.material.transparent = true; });
        spExplosionStartTime = Date.now();
        controls.autoRotate = false;
        controls.enableRotate = true;
        controls.maxDistance = 36;

        // Create floating image cards
        spCreateFloatingImages();

        // Create the signature 3D orbiting wishes from Gift for you!
        createOrbitingWishSprites();

        // Flash effect
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;background:radial-gradient(circle,rgba(255,105,180,0.85) 0%,transparent 70%);pointer-events:none;z-index:1000;animation:flashFade 1.2s ease-out forwards;';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1200);

        // Update hints
        const hintEl = document.getElementById('sphere-click-hint');
        if (hintEl) {
            hintEl.innerText = "Chạm vào màn hình để lan tỏa yêu thương 💖";
            hintEl.classList.add('visible');
            setTimeout(() => hintEl.classList.remove('visible'), 5000);
        }

        // Show letter button if enabled
        if (cfg.sphere && cfg.sphere.letter && cfg.sphere.letter.enabled !== false) {
            const letterBtn = document.getElementById('btn-flying-corner');
            if (letterBtn) {
                setTimeout(() => letterBtn.classList.add('visible'), 1500);
            }
        }
    }

    // Ripple & pulse effect on screen tap
    function triggerCosmicRipple() {
        const pulseColor = new THREE.Color('#ff69b4');
        isPulsing = true;
        pulseStartTime = performance.now() / 1000;

        const wave = effectPool.waves.find(w => !w.userData.active);
        if (wave) {
            wave.userData.active = true;
            wave.visible = true;
            wave.userData.creationTime = performance.now() / 1000;
            wave.position.set(0, 0, 0);
            wave.scale.set(1, 1, 1);
            wave.material.color.copy(pulseColor);
        }

        const sparkles = effectPool.sparkles.find(s => !s.userData.active);
        if (sparkles) {
            sparkles.userData.active = true;
            sparkles.visible = true;
            sparkles.userData.creationTime = performance.now() / 1000;
            sparkles.position.set(0, 0, 0);
            sparkles.material.color.copy(pulseColor);

            const positions = sparkles.geometry.attributes.position.array;
            for (let i = 0; i < 90; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 2 + Math.random() * 4;
                const speed = Math.random() * 15 + 15;
                const idx = i * 3;
                positions[idx] = Math.cos(angle) * radius;
                positions[idx + 1] = (Math.random() - 0.5) * 4;
                positions[idx + 2] = Math.sin(angle) * radius;

                if (!sparkles.userData.velocities) sparkles.userData.velocities = [];
                sparkles.userData.velocities[idx] = Math.cos(angle) * speed;
                sparkles.userData.velocities[idx + 1] = (Math.random() - 0.5) * 8;
                sparkles.userData.velocities[idx + 2] = Math.sin(angle) * speed;
            }
            sparkles.geometry.attributes.position.needsUpdate = true;
        }
    }

    function setupEffectPools() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.35, 'rgba(255,105,180,0.6)');
        gradient.addColorStop(1, 'rgba(255,105,180,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        const waveTex = new THREE.CanvasTexture(canvas);

        for (let i = 0; i < POOL_SIZE; i++) {
            const waveMat = new THREE.MeshBasicMaterial({
                map: waveTex,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const wave = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), waveMat);
            wave.rotation.x = Math.PI / 2;
            wave.visible = false;
            wave.userData.active = false;
            scene.add(wave);
            effectPool.waves.push(wave);

            const SPARKLE_COUNT = 90;
            const sparkleGeo = new THREE.BufferGeometry();
            sparkleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKLE_COUNT * 3), 3));
            const sparkleMat = new THREE.PointsMaterial({
                size: 0.16,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                color: 0xff69b4
            });
            const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
            sparkles.visible = false;
            sparkles.userData.active = false;
            scene.add(sparkles);
            effectPool.sparkles.push(sparkles);
        }
    }

    // Tap handler on Canvas
    function spHandleTap(cx, cy) {
        if (!isSphereActive) return;
        spMouse.x = (cx / window.innerWidth) * 2 - 1;
        spMouse.y = -(cy / window.innerHeight) * 2 + 1;
        spRaycaster.setFromCamera(spMouse, camera);

        if (spWasDrag) { spWasDrag = false; return; }
        spWasDrag = false;

        // If sphere is already exploded, clicks create ripples & pulse!
        if (spIsExploded) {
            triggerCosmicRipple();
            return;
        }

        if (!spIntroComplete) {
            console.log('spHandleTap: completing intro early on tap');
            spIntroComplete = true;
            spIntroCompleteTime = Date.now();
            spMeshes.forEach(m => {
                m.position.set(0, 0, 0);
                if (m.material) { m.material.opacity = 1; m.visible = true; }
            });
        }

        const hits = spRaycaster.intersectObjects([spClickSphere, ...spMeshes]);
        console.log('spHandleTap: hits =', hits.length, 'spHasZoomedIn =', spHasZoomedIn);
        if (hits.length > 0 || spHasZoomedIn) {
            document.getElementById('sphere-click-hint')?.classList.remove('visible');
            if (!spHasZoomedIn) {
                // First click: Zoom in
                spHasZoomedIn = true;
                spZoomInTime = Date.now();
                spNeedZoomIn = true;
                const dir = camera.position.clone().sub(controls.target).normalize();
                spZoomInTarget.copy(controls.target).add(dir.multiplyScalar(controls.minDistance));
                setTimeout(() => {
                    const hintEl = document.getElementById('sphere-click-hint');
                    if (hintEl && !spIsExploded) {
                        hintEl.innerText = "Click lần nữa nào 💕";
                        hintEl.classList.add('visible');
                    }
                }, 1000);
            } else {
                // Second click: Explode into floating pictures and orbiting wishes!
                spTriggerExplosion();
            }
        }
    }

    // Main animation loop for 3D sphere
    function animate() {
        requestAnimationFrame(animate);
        if (!isSphereActive) return;

        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        spTime += 0.01;

        // Auto zoom-in interpolation
        if (spNeedZoomIn) {
            controls.autoRotate = false;
            camera.position.lerp(spZoomInTarget, 0.08);
            if (camera.position.distanceTo(controls.target) <= controls.minDistance + 0.06) {
                spNeedZoomIn = false;
                controls.autoRotate = true;
            }
        }

        // Rain particles
        if (spRainMesh && spRainPositions) {
            const n = spRainPositions.length / 3;
            for (let j = 0; j < n; j++) {
                spRainPositions[j * 3 + 1] += SP_RAIN_SPEED;
                if (spRainPositions[j * 3 + 1] > 7) {
                    spRainPositions[j * 3 + 1] = -SP_FLYOUT_BOUND;
                    spRainPositions[j * 3] = (Math.random() - 0.5) * 2 * SP_FLYOUT_BOUND;
                    spRainPositions[j * 3 + 2] = (Math.random() - 0.5) * 2 * SP_FLYOUT_BOUND;
                }
            }
            spRainMesh.geometry.attributes.position.needsUpdate = true;
        }

        // Halo rotation
        if (spParticlesMesh) {
            spParticlesMesh.rotation.y += 0.0006;
            spParticlesMesh.rotation.x += 0.0003;
        }

        // Intro assemble animation
        if (!spIntroComplete && spIntroStartTime > 0 && spMeshes.length > 0) {
            const elapsed = Date.now() - spIntroStartTime, dur = SP_INTRO_DURATION_MS / 1000;
            spMeshes.forEach(mesh => {
                const delay = (mesh.userData.introDelay || 0) / 1000;
                const t = Math.min(1, Math.max(0, (elapsed / 1000 - delay) / dur));
                const eased = 1 - Math.pow(1 - t, 1.4);
                mesh.position.lerpVectors(mesh.userData.introStartPos, new THREE.Vector3(0, 0, 0), eased);
                if (mesh.material) mesh.material.opacity = 1;
            });
            if (elapsed > SP_INTRO_DURATION_MS + SP_INTRO_STAGGER_MS) {
                spIntroComplete = true;
                spIntroCompleteTime = Date.now();
                spMeshes.forEach(m => {
                    m.position.set(0, 0, 0);
                    if (m.material) { m.material.opacity = 1; m.visible = true; }
                });
                // Show first hint
                setTimeout(() => {
                    if (!spHasZoomedIn && !spIsExploded) {
                        const h = document.getElementById('sphere-click-hint');
                        if (h) { h.innerText = "Click vào quả cầu nhé ✨"; h.classList.add('visible'); }
                    }
                }, 1200);
            }
        }

        // Explosion & floating images update
        if (spIsExploded) {
            spExplosionProgress = Math.min(1, spExplosionProgress + 0.018);
            spFadeProgress = Math.min(1, spFadeProgress + 0.04);
            spGroup.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = Math.max(0, 1 - spFadeProgress);
                    if (child.material.opacity <= 0) child.visible = false;
                }
            });
            spClickSphere.visible = false;

            if (spFloatingGroup) {
                spDriftTiltAngle += spDriftTiltDir * 0.0003;
                if (spDriftTiltAngle >= 0.22) { spDriftTiltAngle = 0.22; spDriftTiltDir = -1; }
                else if (spDriftTiltAngle <= -0.22) { spDriftTiltAngle = -0.22; spDriftTiltDir = 1; }
                spFloatingGroup.rotation.y = spDriftTiltAngle;
            }

            const maxY = 10, minY = -10;
            spFloatingImages.forEach((img, idx) => {
                const d = img.userData;
                const dp = Math.max(0, (spExplosionProgress - d.delay) / (1 - d.delay));
                if (dp > 0) {
                    const t = Math.min(1, dp), eased = 1 - Math.pow(1 - t, 2);
                    const fY = Math.sin(spTime * 2 * d.floatSpeedY + d.floatPhase) * d.floatAmplY;
                    d.basePos.y += d.driftSpeed * 1.5;

                    if (eased < 1) {
                        img.position.x = d.startPos.x + (d.targetPos.x - d.startPos.x) * eased;
                        img.position.z = d.startPos.z + (d.targetPos.z - d.startPos.z) * eased;
                        img.position.y = d.startPos.y + (d.targetPos.y - d.startPos.y) * eased + (d.basePos.y - d.targetPos.y) + fY;
                    } else {
                        img.position.x = d.basePos.x;
                        img.position.y = d.basePos.y + fY;
                        img.position.z = d.baseZ;
                    }

                    if (d.basePos.y > maxY) {
                        d.basePos.y = minY;
                        d.basePos.x = (Math.random() - 0.5) * 16;
                        d.baseZ = (Math.random() - 0.5) * 16;
                        img.position.x = d.basePos.x;
                        img.position.z = d.baseZ;
                    }

                    const op = Math.min(1, dp * 2);
                    const gp = 0.65 + Math.sin(spTime * 3 + idx * 0.5) * 0.25;
                    d.iMat.opacity = op;
                    if (d.gMat && d.goMat) {
                        d.gMat.opacity = Math.min(1, op * gp);
                        d.goMat.opacity = Math.min(1, op * gp * 0.75);
                    }
                }
            });

            // Update Orbiting Wishes text
            if (orbitingWishGroup && orbitingWishGroup.children.length > 0) {
                if (orbitingWishAppearStart === null) orbitingWishAppearStart = performance.now() / 1000;
                const curSec = performance.now() / 1000;
                const elapsedSec = curSec - orbitingWishAppearStart;

                orbitingWishGroup.children.forEach(sprite => {
                    if (!sprite.userData.orbitSpeed) return;
                    sprite.userData.orbitAngle += sprite.userData.orbitSpeed * dt;
                    const r = sprite.userData.orbitRadius;
                    const a = sprite.userData.orbitAngle;
                    const floatY = Math.sin(curSec * sprite.userData.floatSpeed + sprite.userData.floatPhase) * sprite.userData.floatAmplitude;
                    sprite.position.set(Math.cos(a) * r, sprite.userData.baseY + floatY, Math.sin(a) * r);

                    const startAt = sprite.userData.appearDelay;
                    if (elapsedSec <= startAt) {
                        sprite.material.opacity = 0;
                    } else {
                        const fadeProg = (elapsedSec - startAt) / ORBIT_WISH_FADE_DURATION;
                        sprite.material.opacity = Math.min(1, fadeProg);
                    }
                });
            }

            // Update Waves & Sparkles ripple effect
            const curT = performance.now() / 1000;
            effectPool.waves.forEach(wave => {
                if (wave.userData.active) {
                    const age = curT - wave.userData.creationTime;
                    if (age >= 1.4) {
                        wave.userData.active = false;
                        wave.visible = false;
                    } else {
                        const prog = age / 1.4;
                        const scale = 1 + prog * 4.5;
                        wave.scale.set(scale, scale, 1);
                        wave.material.opacity = (1 - prog) * 0.75;
                    }
                }
            });

            effectPool.sparkles.forEach(sparkles => {
                if (sparkles.userData.active) {
                    const age = curT - sparkles.userData.creationTime;
                    if (age >= 1.5) {
                        sparkles.userData.active = false;
                        sparkles.visible = false;
                    } else {
                        const prog = age / 1.5;
                        const positions = sparkles.geometry.attributes.position.array;
                        const velocities = sparkles.userData.velocities;
                        for (let i = 0; i < 90; i++) {
                            const idx = i * 3;
                            positions[idx] += velocities[idx] * dt;
                            positions[idx + 1] += velocities[idx + 1] * dt;
                            positions[idx + 2] += velocities[idx + 2] * dt;
                        }
                        sparkles.geometry.attributes.position.needsUpdate = true;
                        sparkles.material.opacity = (1 - prog);
                    }
                }
            });

            // Pulse scaling
            if (isPulsing) {
                const pulseProg = (curT - pulseStartTime) / PULSE_DURATION;
                if (pulseProg >= 1) {
                    isPulsing = false;
                    if (spFloatingGroup) spFloatingGroup.scale.set(1, 1, 1);
                    if (orbitingWishGroup) orbitingWishGroup.scale.set(1, 1, 1);
                } else {
                    const pulseSine = Math.sin(pulseProg * Math.PI);
                    const s = 1 + PULSE_AMPLITUDE * pulseSine;
                    if (spFloatingGroup) spFloatingGroup.scale.set(s, s, s);
                    if (orbitingWishGroup) orbitingWishGroup.scale.set(s, s, s);
                }
            }
        }

        // Cupid fly update
        if (cupidLetterState === 'flying') {
            const elapsed = Date.now() - cupidFlyStartTime;
            const progress = Math.min(1, elapsed / CUPID_FLY_DURATION_MS);
            const eased = 1 - Math.pow(1 - progress, 1.2);
            const cupidImg = document.getElementById('cupid-flying-img');
            if (cupidImg) {
                const startLeft = window.innerWidth * 0.15, startTop = window.innerHeight * 0.85;
                const endLeft = window.innerWidth * 0.5, endTop = window.innerHeight * 0.45;
                const curLeft = startLeft + (endLeft - startLeft) * eased;
                const curTop = startTop + (endTop - startTop) * eased;
                cupidImg.style.left = curLeft + 'px';
                cupidImg.style.top = curTop + 'px';

                if (progress >= 1) {
                    cupidLetterState = 'dropped';
                    cupidImg.style.display = 'none';
                    showLetterFrame();
                }
            }
        }

        controls.update();
        renderer.render(scene, camera);
    }

    // Hiển thị khung thư và chạy hiệu ứng đánh chữ
    function showLetterFrame() {
        const letterFrame = document.getElementById('cupid-letter-frame');
        const letterTitleEl = document.getElementById('letterTitle');
        const contentEl = document.getElementById('letterContent') || document.querySelector('#cupid-letter-frame .letter-content');
        const env = document.getElementById('letter-envelope-img');
        if (env) env.classList.remove('visible');

        if (letterFrame && contentEl) {
            letterFrame.classList.add('visible');
            const letterTitle = (cfg.sphere && cfg.sphere.letter && cfg.sphere.letter.title)
                ? cfg.sphere.letter.title
                : "Gửi Hương Giang ❤️";
            if (letterTitleEl) letterTitleEl.textContent = letterTitle;

            const letterText = (cfg.sphere && cfg.sphere.letter && cfg.sphere.letter.text)
                ? cfg.sphere.letter.text
                : "Gửi em yêu,\n\nChúc em luôn xinh đẹp, hạnh phúc và bình yên mỗi ngày! ❤️";
            startLetterTypingEffect(contentEl, letterText);
        }
    }

    // Typewriter effect for Cupid's Letter
    function startLetterTypingEffect(container, text) {
        container.innerHTML = '';
        let index = 0;
        const cursor = document.createElement('span');
        cursor.textContent = '|';
        cursor.style.animation = 'loadingTextFade 0.8s infinite';
        container.appendChild(cursor);

        const timer = setInterval(() => {
            if (index < text.length) {
                const char = text.charAt(index);
                const charNode = document.createTextNode(char);
                container.insertBefore(charNode, cursor);
                index++;
                container.scrollTop = container.scrollHeight;
            } else {
                clearInterval(timer);
                cursor.remove();
            }
        }, 35);
    }

    // Launch Cupid Letter Sequence
    function startCupidLetterSequence() {
        const overlay = document.getElementById('cupid-letter-overlay');
        const cupidImg = document.getElementById('cupid-flying-img');
        const letterFrame = document.getElementById('cupid-letter-frame');
        const env = document.getElementById('letter-envelope-img');
        if (!overlay || !letterFrame) return;

        overlay.classList.add('visible');

        if (cupidImg) {
            cupidLetterState = 'flying';
            cupidFlyStartTime = Date.now();
            cupidImg.style.display = 'block';
            cupidImg.style.left = (window.innerWidth * 0.15) + 'px';
            cupidImg.style.top = (window.innerHeight * 0.85) + 'px';
            letterFrame.classList.remove('visible');
            if (env) env.classList.remove('visible');

            // Timeout dự phòng mở thư sau 1.2s nếu loop frame lag
            setTimeout(() => {
                if (cupidLetterState === 'flying') {
                    cupidLetterState = 'dropped';
                    cupidImg.style.display = 'none';
                    showLetterFrame();
                }
            }, 1200);
        } else {
            showLetterFrame();
        }
    }

    // Public method: openSphereScreen (called from book.js when giftBox is clicked)
    window.openSphereScreen = function() {
        if (isSphereActive) return;
        isSphereActive = true;

        const introScreen = document.getElementById('introScreen');
        const secondScreen = document.getElementById('secondScreen');
        const sphereScreen = document.getElementById('sphereScreen');
        const giftBoxContainer = document.getElementById('giftBoxContainer');
        const canvasEl = document.getElementById('sphereCanvas');

        if (introScreen) {
            introScreen.classList.remove('is-visible');
            introScreen.style.display = 'none';
        }
        if (secondScreen) {
            secondScreen.classList.remove('is-visible');
            secondScreen.style.display = 'none';
        }
        if (giftBoxContainer) {
            giftBoxContainer.classList.remove('show');
            giftBoxContainer.style.display = 'none';
            giftBoxContainer.style.pointerEvents = 'none';
        }
        if (sphereScreen) {
            sphereScreen.style.display = 'block';
            setTimeout(() => sphereScreen.classList.add('is-visible'), 50);
        }

        // Setup Three.js
        const width = window.innerWidth, height = window.innerHeight;
        const isMobile = width <= 768;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x06020c);

        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 0, isMobile ? 15 : 10.5);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        controls = new OrbitControls(camera, canvasEl);
        controls.target.set(0, 0, 0);
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.minDistance = isMobile ? 4.2 : 5.0;
        controls.maxDistance = isMobile ? 26 : 22;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.2;
        controls.update();

        spGroup = new THREE.Group();
        scene.add(spGroup);

        spClickSphere = new THREE.Mesh(
            new THREE.SphereGeometry(SP_RADIUS * 1.1, 32, 32),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        );
        spClickSphere.renderOrder = -1;
        scene.add(spClickSphere);

        spRaycaster = new THREE.Raycaster();
        spMouse = new THREE.Vector2();

        // Sphere halo sparkles
        const sCnt = 500, sPos = new Float32Array(sCnt * 3), sCol = new Float32Array(sCnt * 3);
        for (let i = 0; i < sCnt; i++) {
            const t2 = Math.random() * Math.PI * 2, p2 = Math.acos(2 * Math.random() - 1), r2 = SP_RADIUS * 1.2 + Math.random() * 3.5;
            sPos[i * 3] = r2 * Math.sin(p2) * Math.cos(t2);
            sPos[i * 3 + 1] = r2 * Math.cos(p2);
            sPos[i * 3 + 2] = r2 * Math.sin(p2) * Math.sin(t2);
            sCol[i * 3] = 1; sCol[i * 3 + 1] = 0.4 + Math.random() * 0.3; sCol[i * 3 + 2] = 0.7 + Math.random() * 0.3;
        }
        const sGeo = new THREE.BufferGeometry();
        sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
        sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
        spParticlesMesh = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.85 }));
        scene.add(spParticlesMesh);

        // Particle rain upward
        const rPos = new Float32Array(SP_RAIN_COUNT * 3), rCol = new Float32Array(SP_RAIN_COUNT * 3);
        for (let i = 0; i < SP_RAIN_COUNT; i++) {
            rPos[i * 3] = (Math.random() - 0.5) * 2 * SP_FLYOUT_BOUND;
            rPos[i * 3 + 1] = -SP_FLYOUT_BOUND + Math.random() * 2 * SP_FLYOUT_BOUND;
            rPos[i * 3 + 2] = (Math.random() - 0.5) * 2 * SP_FLYOUT_BOUND;
            rCol[i * 3] = 1; rCol[i * 3 + 1] = 0.45 + Math.random() * 0.35; rCol[i * 3 + 2] = 0.75 + Math.random() * 0.25;
        }
        spRainPositions = rPos;
        const rGeo = new THREE.BufferGeometry();
        rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
        rGeo.setAttribute('color', new THREE.BufferAttribute(rCol, 3));
        spRainMesh = new THREE.Points(rGeo, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.75 }));
        scene.add(spRainMesh);

        // CSS background particles
        const bg = document.getElementById('sphere-particles-bg');
        if (bg) {
            bg.innerHTML = '';
            for (let i = 0; i < 30; i++) {
                const d = document.createElement('div');
                d.className = 'sp-particle';
                d.style.left = Math.random() * 100 + '%';
                d.style.animationDelay = Math.random() * 14 + 's';
                d.style.animationDuration = (10 + Math.random() * 10) + 's';
                bg.appendChild(d);
            }
            bg.style.opacity = '1';
        }

        // Setup pools for ripples
        setupEffectPools();

        // Image list from config
        const rawImages = (cfg.sphere && cfg.sphere.images && cfg.sphere.images.length)
            ? cfg.sphere.images
            : (cfg.book && cfg.book.pages ? cfg.book.pages.map(p => p.image).filter(Boolean) : []);
        const SPHERE_IMAGES = rawImages.length ? rawImages : ['assets/images/user/page1.jpg', 'assets/images/icons/couple.png'];

        // Load textures then build sphere
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';
        Promise.all(SPHERE_IMAGES.map(url => new Promise(res => loader.load(url, res, undefined, () => res(null)))))
        .then(textures => {
            spTextures = [];
            spSphereImageUrls = [];
            SPHERE_IMAGES.forEach((url, i) => {
                if (textures[i]) {
                    spTextures.push(textures[i]);
                    spSphereImageUrls.push(url);
                }
            });
            if (!spTextures.length) {
                const fc = document.createElement('canvas'); fc.width = fc.height = 64;
                fc.getContext('2d').fillStyle = '#ff69b4'; fc.getContext('2d').fillRect(0, 0, 64, 64);
                spTextures = [new THREE.CanvasTexture(fc)];
            }

            spBuildSphere();
            spPhase = true;

            // Touch / Mouse event handlers
            function spDown(e) {
                const c = e.touches ? e.touches[0] : e;
                spMouseDownX = c.clientX; spMouseDownY = c.clientY;
                spIsPointerDown = true; spWasDrag = false;
            }
            function spMove(e) {
                const c = e.touches ? e.touches[0] : e;
                if (spIsPointerDown) {
                    if (Math.hypot(c.clientX - spMouseDownX, c.clientY - spMouseDownY) > SP_DRAG_THRESHOLD) {
                        spWasDrag = true;
                    }
                }
            }
            function spUp() { spIsPointerDown = false; }

            canvasEl.addEventListener('mousedown', spDown);
            canvasEl.addEventListener('mouseup', spUp);
            canvasEl.addEventListener('mouseleave', spUp);
            canvasEl.addEventListener('mousemove', spMove);
            canvasEl.addEventListener('click', e => spHandleTap(e.clientX, e.clientY));

            canvasEl.addEventListener('touchstart', spDown, { passive: true });
            canvasEl.addEventListener('touchmove', spMove, { passive: true });
            canvasEl.addEventListener('touchend', e => {
                spUp();
                if (e.cancelable) e.preventDefault();
                const c = e.changedTouches[0];
                spHandleTap(c.clientX, c.clientY);
            }, { passive: false });

            // Corner button: open letter
            document.getElementById('btn-flying-corner')?.addEventListener('click', () => {
                startCupidLetterSequence();
            });

            // Envelope click: show letter frame & type text
            document.getElementById('letter-envelope-img')?.addEventListener('click', () => {
                showLetterFrame();
            });

            // Close letter button
            document.getElementById('letterCloseBtn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const overlay = document.getElementById('cupid-letter-overlay');
                const letterFrame = document.getElementById('cupid-letter-frame');
                if (letterFrame) letterFrame.classList.remove('visible');
                if (overlay) overlay.classList.remove('visible');
                cupidLetterState = 'idle';
            });

            // Click outside letter frame to close
            document.getElementById('cupid-letter-overlay')?.addEventListener('click', (e) => {
                if (e.target.id === 'cupid-letter-overlay') {
                    const overlay = document.getElementById('cupid-letter-overlay');
                    const letterFrame = document.getElementById('cupid-letter-frame');
                    if (letterFrame) letterFrame.classList.remove('visible');
                    if (overlay) overlay.classList.remove('visible');
                    cupidLetterState = 'idle';
                }
            });

            // Expose test & control hooks
            window.triggerSphereExplosion = spTriggerExplosion;
            window.handleSphereTap = spHandleTap;
            window.openCupidLetter = startCupidLetterSequence;
            window.closeCupidLetter = function() {
                const overlay = document.getElementById('cupid-letter-overlay');
                const letterFrame = document.getElementById('cupid-letter-frame');
                if (letterFrame) letterFrame.classList.remove('visible');
                if (overlay) overlay.classList.remove('visible');
                cupidLetterState = 'idle';
            };

            // Start animation loop
            lastTime = performance.now();
            animate();
        });
    };

    // Window resize handler
    window.addEventListener('resize', () => {
        if (!isSphereActive || !camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();
