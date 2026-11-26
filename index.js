(() => {
  const canvas = document.getElementById("space");
  const ctx = canvas.getContext("2d");
  const startOverlay = document.getElementById("startOverlay");
  const startBtn = document.getElementById("startBtn");
  const bgMusic = document.getElementById("bgMusic");

  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  const STAR_COUNT = 680;
  const stars = [];

  for (let i = 0; i < STAR_COUNT; i++) {
    const isPurple = Math.random() < 0.24;
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      tx: null,
      ty: null,
      size: 0.9 + Math.random() * 1.6,
      alpha: 0,
      targetAlpha: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      color: isPurple
        ? Math.random() < 0.5
          ? [216, 180, 254]
          : [192, 132, 252]
        : [255, 255, 255],
      z: Math.random() * 1600 + 50,
      wx: (Math.random() - 0.5) * 2600,
      wy: (Math.random() - 0.5) * 2600,
      inText: false,
    });
  }

  function sampleTextPoints(lines, fontSize, step) {
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");

    octx.fillStyle = "#ffffff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.font = `300 ${fontSize}px Georgia, "Times New Roman", serif`;

    const lineHeight = fontSize * 1.38;
    const totalHeight = lines.length * lineHeight;
    const startY = h / 2 - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, idx) => {
      octx.fillText(line, w / 2, startY + idx * lineHeight);
    });

    const data = octx.getImageData(0, 0, w, h).data;
    const points = [];

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 140) {
          points.push({ x, y });
        }
      }
    }

    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }

    return points;
  }

  function assignTargets(points) {
    const usable = Math.min(points.length, stars.length - 90);
    for (let i = 0; i < stars.length; i++) {
      if (i < usable) {
        stars[i].tx = points[i].x;
        stars[i].ty = points[i].y;
        stars[i].inText = true;
      } else {
        stars[i].tx = null;
        stars[i].ty = null;
        stars[i].inText = false;
      }
    }
  }

  function scatterStars(force) {
    for (let i = 0; i < stars.length; i++) {
      if (stars[i].inText) {
        const angle = Math.random() * Math.PI * 2;
        const spd = force * (0.4 + Math.random() * 0.9);
        stars[i].vx = Math.cos(angle) * spd;
        stars[i].vy = Math.sin(angle) * spd;
      }
      stars[i].tx = null;
      stars[i].ty = null;
      stars[i].inText = false;
    }
  }

  const cosmicObjects = [];

  function createGalaxyObj(z) {
    const pts = [];
    const purpleShift = Math.random() < 0.6;
    for (let i = 0; i < 160; i++) {
      const d = i / 160;
      const arm = i % 3;
      const angle = (arm * Math.PI * 2) / 3 + d * 4.8 + (Math.random() - 0.5) * 0.45;
      const r = 6 + d * 110;
      pts.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r * 0.52,
        color: purpleShift
          ? d < 0.35
            ? "rgba(250, 232, 255, 0.9)"
            : "rgba(168, 85, 247, 0.72)"
          : d < 0.35
            ? "rgba(255, 243, 196, 0.9)"
            : "rgba(129, 140, 248, 0.72)",
        size: 1.4 + Math.random() * 1.4,
      });
    }
    return {
      type: "galaxy",
      x: (Math.random() - 0.5) * 1400,
      y: (Math.random() - 0.5) * 1100,
      z,
      tilt: (Math.random() - 0.5) * 1.4,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.012,
      pts,
    };
  }

  function createPlanetObj(z) {
    const palettes = [
      { main: "#7e22ce", dark: "#1e0936", rim: "#e9d5ff", ring: true },
      { main: "#4338ca", dark: "#0f102e", rim: "#c7d2fe", ring: false },
      { main: "#9333ea", dark: "#240a3d", rim: "#f3e8ff", ring: true },
      { main: "#6d28d9", dark: "#170a33", rim: "#ddd6fe", ring: false },
    ];
    const pal = palettes[Math.floor(Math.random() * palettes.length)];
    return {
      type: "planet",
      x: (Math.random() - 0.5) * 1300,
      y: (Math.random() - 0.5) * 1000,
      z,
      radius: 36 + Math.random() * 38,
      tilt: -0.35 + Math.random() * 0.7,
      pal,
    };
  }

  function createBlackHoleObj(z) {
    return {
      type: "blackhole",
      x: (Math.random() - 0.5) * 1100,
      y: (Math.random() - 0.5) * 850,
      z,
      radius: 42 + Math.random() * 24,
      tilt: (Math.random() - 0.5) * 0.8,
      rot: 0,
    };
  }

  function createNebulaObj(z) {
    const colors = [
      "rgba(147, 51, 234, 0.16)",
      "rgba(109, 40, 217, 0.15)",
      "rgba(192, 132, 252, 0.12)",
    ];
    return {
      type: "nebula",
      x: (Math.random() - 0.5) * 1500,
      y: (Math.random() - 0.5) * 1200,
      z,
      radius: 220 + Math.random() * 180,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }

  function seedCosmicObjects() {
    cosmicObjects.length = 0;
    for (let i = 0; i < 16; i++) {
      const z = 500 + i * 260;
      const r = i % 4;
      if (r === 0) cosmicObjects.push(createNebulaObj(z));
      if (r === 1) cosmicObjects.push(createGalaxyObj(z));
      if (r === 2) cosmicObjects.push(createPlanetObj(z));
      if (r === 3) cosmicObjects.push(createBlackHoleObj(z));
    }
  }

  function recycleCosmicObject(obj) {
    obj.z = 3800 + Math.random() * 600;
    obj.x = (Math.random() - 0.5) * 1400;
    obj.y = (Math.random() - 0.5) * 1100;
  }

  function drawCosmicObject(obj, camX, camY, camRoll, fov, dimFactor) {
    const scale = fov / obj.z;
    if (scale <= 0) return;

    const dx = obj.x - camX;
    const dy = obj.y - camY;
    const cosR = Math.cos(camRoll);
    const sinR = Math.sin(camRoll);
    const rx = dx * cosR - dy * sinR;
    const ry = dx * sinR + dy * cosR;

    const sx = w / 2 + rx * scale;
    const sy = h / 2 + ry * scale;

    const fadeIn = Math.min(1, (3800 - obj.z) / 900);
    const fadeOut = Math.min(1, obj.z / 180);
    const alpha = Math.max(0, fadeIn * fadeOut * dimFactor);
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(camRoll);
    ctx.globalAlpha = alpha;

    if (obj.type === "nebula") {
      const r = obj.radius * scale;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      grad.addColorStop(0, obj.color);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (obj.type === "galaxy") {
      obj.rot += obj.rotSpd;
      ctx.rotate(obj.tilt);
      const cosG = Math.cos(obj.rot);
      const sinG = Math.sin(obj.rot);

      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 26 * scale);
      coreGrad.addColorStop(0, "rgba(243, 232, 255, 0.9)");
      coreGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.35)");
      coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 26 * scale, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < obj.pts.length; i++) {
        const p = obj.pts[i];
        const px = (p.x * cosG - p.y * sinG) * scale;
        const py = (p.x * sinG + p.y * cosG) * 0.55 * scale;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.7, p.size * scale), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obj.type === "planet") {
      const r = obj.radius * scale;
      ctx.rotate(obj.tilt);

      const glow = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 1.45);
      glow.addColorStop(0, "rgba(192, 132, 252, 0.32)");
      glow.addColorStop(1, "rgba(192, 132, 252, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
      ctx.fill();

      const bodyGrad = ctx.createRadialGradient(-r * 0.32, -r * 0.32, r * 0.1, 0, 0, r);
      bodyGrad.addColorStop(0, obj.pal.rim);
      bodyGrad.addColorStop(0.45, obj.pal.main);
      bodyGrad.addColorStop(1, obj.pal.dark);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      if (obj.pal.ring) {
        ctx.strokeStyle = "rgba(233, 213, 255, 0.45)";
        ctx.lineWidth = Math.max(1.2, 4.5 * scale);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.15, r * 0.52, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
        ctx.lineWidth = Math.max(0.8, 2 * scale);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.75, r * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (obj.type === "blackhole") {
      const r = obj.radius * scale;
      ctx.rotate(obj.tilt);

      const lensing = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 2.8);
      lensing.addColorStop(0, "rgba(192, 132, 252, 0.85)");
      lensing.addColorStop(0.35, "rgba(126, 34, 206, 0.4)");
      lensing.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = lensing;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(245, 208, 254, 0.8)";
      ctx.lineWidth = Math.max(1.5, 4 * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.45, r * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#010003";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(233, 213, 255, 0.65)";
      ctx.lineWidth = Math.max(1, 1.8 * scale);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  let started = false;
  let startTime = 0;
  let currentStage = -1;

  function triggerStage(stage) {
    if (currentStage === stage) return;
    currentStage = stage;

    const isMobile = w < 600;
    const phraseFont = isMobile ? Math.max(24, w * 0.068) : Math.max(36, w * 0.036);
    const step = isMobile ? 4 : 5;
    const countFont = isMobile ? Math.min(w * 0.34, 150) : Math.min(h * 0.28, 190);
    const countStep = isMobile ? 4 : 5;

    if (stage === 1) {
      const lines = isMobile
        ? ["¿Quieres saber", "cuánto he de amarte?..."]
        : ["¿Quieres saber cuánto he de amarte?..."];
      assignTargets(sampleTextPoints(lines, phraseFont, step));
    } else if (stage === 2) {
      const lines = isMobile
        ? ["¿Quieres saber", "cuánto he de amarte?...", "", "Solo espera"]
        : ["¿Quieres saber cuánto he de amarte?...", "", "Solo espera"];
      assignTargets(sampleTextPoints(lines, phraseFont, step));
    } else if (stage === 3) {
      scatterStars(2.4);
    } else if (stage === 4) {
      assignTargets(sampleTextPoints(["3"], countFont, countStep));
    } else if (stage === 5) {
      scatterStars(1.8);
    } else if (stage === 6) {
      assignTargets(sampleTextPoints(["2"], countFont, countStep));
    } else if (stage === 7) {
      scatterStars(1.8);
    } else if (stage === 8) {
      assignTargets(sampleTextPoints(["1"], countFont, countStep));
    } else if (stage === 9) {
      scatterStars(3.5);
      seedCosmicObjects();
      for (let i = 0; i < stars.length; i++) {
        stars[i].wx = (stars[i].x - w / 2) * 2.5;
        stars[i].wy = (stars[i].y - h / 2) * 2.5;
        stars[i].z = 120 + Math.random() * 1800;
      }
    } else if (stage === 10) {
      const finalFont = isMobile ? Math.max(21, w * 0.056) : Math.max(32, w * 0.03);
      const finalLines = isMobile
        ? [
            "Te amo más allá",
            "de tu vida...",
            "De la mía... y del tiempo...",
            "Porque poca es la",
            "infinita eternidad",
            "para adorarte....",
          ]
        : [
            "Te amo más allá de tu vida...",
            "De la mía... y del tiempo...",
            "Porque poca es la infinita eternidad",
            "para adorarte....",
          ];
      assignTargets(sampleTextPoints(finalLines, finalFont, isMobile ? 4 : 5));
    }
  }

  function render(now) {
    if (!started) {
      requestAnimationFrame(render);
      return;
    }

    const elapsed = (now - startTime) / 1000;

    if (elapsed < 2.2) triggerStage(0);
    else if (elapsed < 5.8) triggerStage(1);
    else if (elapsed < 9.8) triggerStage(2);
    else if (elapsed < 11.4) triggerStage(3);
    else if (elapsed < 13.2) triggerStage(4);
    else if (elapsed < 14.2) triggerStage(5);
    else if (elapsed < 16.0) triggerStage(6);
    else if (elapsed < 17.0) triggerStage(7);
    else if (elapsed < 18.8) triggerStage(8);
    else if (elapsed < 78.8) triggerStage(9);
    else triggerStage(10);

    const isJourney = currentStage >= 9;
    const isFinalText = currentStage === 10;

    if (!isJourney) {
      ctx.fillStyle = "rgba(2, 1, 8, 0.36)";
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (s.alpha < s.targetAlpha) {
          s.alpha = Math.min(s.targetAlpha, s.alpha + 0.008);
        }

        if (s.tx !== null && s.ty !== null) {
          s.x += (s.tx - s.x) * 0.055;
          s.y += (s.ty - s.y) * 0.055;
        } else {
          s.x += s.vx;
          s.y += s.vy;
          s.vx *= 0.992;
          s.vy *= 0.992;

          if (s.x < 0) s.x += w;
          if (s.x > w) s.x -= w;
          if (s.y < 0) s.y += h;
          if (s.y > h) s.y -= h;
        }

        const twinkle = 0.72 + 0.28 * Math.sin(now * 0.003 + s.phase);
        const alpha = (s.inText ? 0.95 : s.alpha) * twinkle;
        const radius = s.inText ? Math.max(1.1, s.size * 0.85) : s.size;

        if (s.inText) {
          ctx.fillStyle = `rgba(233, 213, 255, ${(alpha * 0.28).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, radius * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const journeyTime = elapsed - 18.8;
      const warpBoost = journeyTime < 3.5 ? 1 + (3.5 - journeyTime) * 2.2 : 1;
      const baseSpeed = isFinalText ? 5.2 : 11.5 * warpBoost;

      ctx.fillStyle = isFinalText
        ? "rgba(2, 1, 8, 0.42)"
        : "rgba(2, 1, 8, 0.26)";
      ctx.fillRect(0, 0, w, h);

      const camX = Math.sin(journeyTime * 0.28) * 220 + Math.cos(journeyTime * 0.13) * 120;
      const camY = Math.cos(journeyTime * 0.22) * 180 + Math.sin(journeyTime * 0.17) * 90;
      const camRoll = Math.sin(journeyTime * 0.19) * 0.38;
      const fov = 420;
      const dimObjects = isFinalText ? 0.35 : 0.95;

      cosmicObjects.sort((a, b) => b.z - a.z);
      for (let i = 0; i < cosmicObjects.length; i++) {
        const obj = cosmicObjects[i];
        obj.z -= baseSpeed * 0.85;
        if (obj.z < 60) {
          recycleCosmicObject(obj);
        }
        drawCosmicObject(obj, camX, camY, camRoll, fov, dimObjects);
      }

      const cosR = Math.cos(camRoll);
      const sinR = Math.sin(camRoll);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        if (isFinalText && s.inText && s.tx !== null && s.ty !== null) {
          s.x += (s.tx - s.x) * 0.045;
          s.y += (s.ty - s.y) * 0.045;

          const twinkle = 0.82 + 0.18 * Math.sin(now * 0.0025 + s.phase);
          const r = Math.max(1.15, s.size * 0.85);

          ctx.fillStyle = `rgba(192, 132, 252, ${(0.34 * twinkle).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r * 2.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${(0.96 * twinkle).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const prevZ = s.z;
          s.z -= baseSpeed * (0.8 + (i % 5) * 0.15);

          if (s.z <= 12) {
            s.z = 1900;
            s.wx = (Math.random() - 0.5) * 2600 + camX;
            s.wy = (Math.random() - 0.5) * 2600 + camY;
            continue;
          }

          const dx = s.wx - camX;
          const dy = s.wy - camY;
          const rx = dx * cosR - dy * sinR;
          const ry = dx * sinR + dy * cosR;

          const scaleNow = fov / s.z;
          const scalePrev = fov / prevZ;

          const sx = w / 2 + rx * scaleNow;
          const sy = h / 2 + ry * scaleNow;
          const px = w / 2 + rx * scalePrev;
          const py = h / 2 + ry * scalePrev;

          s.x = sx;
          s.y = sy;

          if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;

          const depthAlpha = Math.min(1, (1900 - s.z) / 500) * (isFinalText ? 0.55 : 0.95);
          const radius = Math.min(3.5, Math.max(0.7, s.size * scaleNow * 0.65));

          if (warpBoost > 1.2 || baseSpeed > 9) {
            ctx.strokeStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${(depthAlpha * 0.65).toFixed(3)})`;
            ctx.lineWidth = radius * 1.2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }

          ctx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${depthAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    requestAnimationFrame(render);
  }

  function fadeInAudio(audio) {
    audio.volume = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          const iv = setInterval(() => {
            if (audio.volume < 0.72) {
              audio.volume = Math.min(0.72, audio.volume + 0.03);
            } else {
              clearInterval(iv);
            }
          }, 120);
        })
        .catch(() => {});
    }
  }

  startBtn.addEventListener("click", () => {
    if (started) return;
    started = true;
    startOverlay.classList.add("hidden");
    fadeInAudio(bgMusic);
    startTime = performance.now();
    requestAnimationFrame(render);
  });
})();