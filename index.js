(() => {
  const canvas = document.getElementById("space");
  const ctx = canvas.getContext("2d");
  const startOverlay = document.getElementById("startOverlay");
  const startBtn = document.getElementById("startBtn");
  const bgMusic = document.getElementById("bgMusic");

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = window.innerWidth;
  let h = window.innerHeight;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const STAR_COUNT = 1350;
  const stars = [];

  for (let i = 0; i < STAR_COUNT; i++) {
    const isPurple = Math.random() < 0.28;
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      tx: null,
      ty: null,
      size: 0.8 + Math.random() * 1.5,
      alpha: 0,
      targetAlpha: 0.45 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      color: isPurple
        ? Math.random() < 0.5
          ? [216, 180, 254]
          : [192, 132, 252]
        : [255, 255, 255],
      wx: (Math.random() - 0.5) * 5200,
      wy: (Math.random() - 0.5) * 4200,
      wz: 80 + Math.random() * 3400,
      inText: false,
    });
  }

  let activeTextState = {
    lines: [],
    fontSize: 32,
    weight: 500,
    opacity: 0,
    targetOpacity: 0,
  };

  function sampleTextPoints(lines, fontSize, weight, step) {
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");

    octx.fillStyle = "#ffffff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`;

    const lineHeight = fontSize * 1.42;
    const totalHeight = lines.length * lineHeight;
    const startY = h / 2 - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, idx) => {
      octx.fillText(line, w / 2, startY + idx * lineHeight);
    });

    const data = octx.getImageData(0, 0, w, h).data;
    const points = [];

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] > 128) {
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

  function setCrispText(lines, fontSize, weight, step) {
    const points = sampleTextPoints(lines, fontSize, weight, step);
    const usable = Math.min(points.length, stars.length - 250);

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

    activeTextState.lines = lines;
    activeTextState.fontSize = fontSize;
    activeTextState.weight = weight;
    activeTextState.targetOpacity = 1;
  }

  function releaseText(scatterSpeed) {
    activeTextState.targetOpacity = 0;
    for (let i = 0; i < stars.length; i++) {
      if (stars[i].inText) {
        const angle = Math.random() * Math.PI * 2;
        const spd = scatterSpeed * (0.35 + Math.random() * 0.85);
        stars[i].vx = Math.cos(angle) * spd;
        stars[i].vy = Math.sin(angle) * spd;
      }
      stars[i].tx = null;
      stars[i].ty = null;
      stars[i].inText = false;
    }
  }

  function drawCrispTextLayer() {
    if (activeTextState.opacity <= 0.005 || activeTextState.lines.length === 0) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${activeTextState.weight} ${activeTextState.fontSize}px ${FONT_FAMILY}`;

    const lineHeight = activeTextState.fontSize * 1.42;
    const totalHeight = activeTextState.lines.length * lineHeight;
    const startY = h / 2 - totalHeight / 2 + lineHeight / 2;

    ctx.shadowColor = `rgba(192, 132, 252, ${(0.65 * activeTextState.opacity).toFixed(3)})`;
    ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(255, 255, 255, ${activeTextState.opacity.toFixed(3)})`;

    activeTextState.lines.forEach((line, idx) => {
      if (line !== "") {
        ctx.fillText(line, w / 2, startY + idx * lineHeight);
      }
    });

    ctx.restore();
  }

  const shootingStars = [];

  function spawnShootingStar() {
    const bright = Math.random() > 0.6;
    const startX = Math.random() * w;
    const startY = Math.random() * h * 0.65;
    const angle = Math.PI * (0.15 + Math.random() * 0.25);
    const speed = bright ? 5.5 + Math.random() * 3 : 3.8 + Math.random() * 2;

    shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: bright ? 110 + Math.random() * 65 : 55 + Math.random() * 40,
      width: bright ? 2.1 : 1.1,
      alpha: 1,
      decay: bright ? 0.011 : 0.015,
      purple: Math.random() < 0.35,
    });
  }

  function updateAndDrawShootingStars(chance) {
    if (Math.random() < chance) {
      spawnShootingStar();
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const st = shootingStars[i];
      const norm = Math.hypot(st.vx, st.vy);
      const tx = st.x - (st.vx / norm) * st.len;
      const ty = st.y - (st.vy / norm) * st.len;

      const grad = ctx.createLinearGradient(st.x, st.y, tx, ty);
      grad.addColorStop(0, `rgba(255, 255, 255, ${st.alpha})`);
      grad.addColorStop(
        0.4,
        st.purple
          ? `rgba(216, 180, 254, ${st.alpha * 0.5})`
          : `rgba(233, 213, 255, ${st.alpha * 0.45})`
      );
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = st.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      st.x += st.vx;
      st.y += st.vy;
      st.alpha -= st.decay;

      if (st.alpha <= 0 || st.x > w + 120 || st.y > h + 120) {
        shootingStars.splice(i, 1);
      }
    }
  }

  const cosmicObjects = [];

  function createGalaxy(z, camX, camY) {
    const variant = Math.floor(Math.random() * 3);
    const pts = [];
    const count = variant === 1 ? 150 : 210;
    const arms = variant === 0 ? 2 : variant === 2 ? 4 : 1;
    const hueMode = Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const d = i / count;
      const arm = i % arms;
      const spread = variant === 1 ? 0.18 : 0.42;
      const angle = (arm * Math.PI * 2) / arms + d * 5.2 + (Math.random() - 0.5) * spread;
      const r = 5 + d * 135;

      let color;
      if (hueMode === 0) {
        color = d < 0.3 ? "rgba(250, 232, 255, 0.92)" : "rgba(168, 85, 247, 0.78)";
      } else if (hueMode === 1) {
        color = d < 0.3 ? "rgba(255, 243, 196, 0.92)" : "rgba(192, 132, 252, 0.75)";
      } else {
        color = d < 0.3 ? "rgba(224, 242, 254, 0.92)" : "rgba(129, 140, 248, 0.78)";
      }

      pts.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        color,
        size: 1.3 + Math.random() * 1.5,
      });
    }

    return {
      type: "galaxy",
      variant,
      wx: camX + (Math.random() - 0.5) * 2600,
      wy: camY + (Math.random() - 0.5) * 2000,
      wz: z,
      tilt: (Math.random() - 0.5) * 1.6,
      flatness: variant === 1 ? 0.22 : 0.52,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() < 0.5 ? 1 : -1) * (0.004 + Math.random() * 0.006),
      pts,
    };
  }

  function createPlanet(z, camX, camY) {
    const styles = [
      {
        kind: "ringed",
        c1: "#f3e8ff",
        c2: "#9333ea",
        c3: "#1e0936",
        ring1: "rgba(233, 213, 255, 0.55)",
        ring2: "rgba(168, 85, 247, 0.35)",
        hasMoon: true,
      },
      {
        kind: "banded",
        c1: "#e0e7ff",
        c2: "#6366f1",
        c3: "#131138",
        bandColor: "rgba(255, 255, 255, 0.14)",
        hasMoon: true,
      },
      {
        kind: "mystic",
        c1: "#fae8ff",
        c2: "#c026d3",
        c3: "#2a0838",
        ring1: "rgba(245, 208, 254, 0.45)",
        ring2: "rgba(192, 132, 252, 0.28)",
        hasMoon: false,
      },
      {
        kind: "banded",
        c1: "#fef3c7",
        c2: "#7c3aed",
        c3: "#190b33",
        bandColor: "rgba(233, 213, 255, 0.16)",
        hasMoon: true,
      },
      {
        kind: "ice",
        c1: "#ffffff",
        c2: "#818cf8",
        c3: "#0f172a",
        hasMoon: false,
      },
    ];

    const style = styles[Math.floor(Math.random() * styles.length)];
    return {
      type: "planet",
      wx: camX + (Math.random() - 0.5) * 2400,
      wy: camY + (Math.random() - 0.5) * 1900,
      wz: z,
      radius: 34 + Math.random() * 44,
      tilt: -0.45 + Math.random() * 0.9,
      moonAngle: Math.random() * Math.PI * 2,
      moonSpeed: 0.015 + Math.random() * 0.015,
      style,
    };
  }

  function createBlackHole(z, camX, camY) {
    return {
      type: "blackhole",
      wx: camX + (Math.random() - 0.5) * 2200,
      wy: camY + (Math.random() - 0.5) * 1700,
      wz: z,
      radius: 40 + Math.random() * 24,
      tilt: (Math.random() - 0.5) * 0.85,
    };
  }

  function createNebula(z, camX, camY) {
    const colors = [
      "rgba(147, 51, 234, 0.18)",
      "rgba(109, 40, 217, 0.16)",
      "rgba(192, 132, 252, 0.14)",
      "rgba(79, 70, 229, 0.15)",
    ];
    return {
      type: "nebula",
      wx: camX + (Math.random() - 0.5) * 2800,
      wy: camY + (Math.random() - 0.5) * 2200,
      wz: z,
      radius: 260 + Math.random() * 220,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }

  function initCosmicField(camX, camY) {
    cosmicObjects.length = 0;
    for (let i = 0; i < 28; i++) {
      const z = 700 + i * 160;
      const mod = i % 5;
      if (mod === 0) cosmicObjects.push(createNebula(z, camX, camY));
      else if (mod === 1 || mod === 3) cosmicObjects.push(createPlanet(z, camX, camY));
      else if (mod === 2) cosmicObjects.push(createGalaxy(z, camX, camY));
      else cosmicObjects.push(createBlackHole(z, camX, camY));
    }
  }

  function respawnCosmicObject(obj, camX, camY) {
    obj.wz = 4400 + Math.random() * 700;
    obj.wx = camX + (Math.random() - 0.5) * 2600;
    obj.wy = camY + (Math.random() - 0.5) * 2000;
  }

  function drawCosmicObject(obj, camX, camY, camYaw, camPitch, camRoll, fov, dim) {
    let dx = obj.wx - camX;
    let dy = obj.wy - camY;
    let dz = obj.wz;

    const cosY = Math.cos(camYaw);
    const sinY = Math.sin(camYaw);
    const x1 = dx * cosY - dz * sinY;
    const z1 = dx * sinY + dz * cosY;

    const cosP = Math.cos(camPitch);
    const sinP = Math.sin(camPitch);
    const y2 = dy * cosP - z1 * sinP;
    const z2 = dy * sinP + z1 * cosP;

    if (z2 <= 40) return;

    const scale = fov / z2;
    const cosR = Math.cos(camRoll);
    const sinR = Math.sin(camRoll);
    const rx = x1 * cosR - y2 * sinR;
    const ry = x1 * sinR + y2 * cosR;

    const sx = w / 2 + rx * scale;
    const sy = h / 2 + ry * scale;

    if (sx < -450 || sx > w + 450 || sy < -450 || sy > h + 450) return;

    const fadeIn = Math.min(1, (4400 - obj.wz) / 1100);
    const fadeOut = Math.min(1, z2 / 220);
    const alpha = Math.max(0, fadeIn * fadeOut * dim);
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

      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 28 * scale);
      core.addColorStop(0, "rgba(250, 232, 255, 0.95)");
      core.addColorStop(0.5, "rgba(168, 85, 247, 0.35)");
      core.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 28 * scale, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < obj.pts.length; i++) {
        const p = obj.pts[i];
        const px = (p.x * cosG - p.y * sinG) * scale;
        const py = (p.x * sinG + p.y * cosG) * obj.flatness * scale;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.7, p.size * scale), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obj.type === "planet") {
      const r = obj.radius * scale;
      ctx.rotate(obj.tilt);

      const atmo = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 1.45);
      atmo.addColorStop(0, "rgba(192, 132, 252, 0.32)");
      atmo.addColorStop(1, "rgba(192, 132, 252, 0)");
      ctx.fillStyle = atmo;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createRadialGradient(-r * 0.32, -r * 0.32, r * 0.08, 0, 0, r);
      body.addColorStop(0, obj.style.c1);
      body.addColorStop(0.48, obj.style.c2);
      body.addColorStop(1, obj.style.c3);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      if (obj.style.kind === "banded") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = obj.style.bandColor;
        ctx.fillRect(-r, -r * 0.45, r * 2, r * 0.22);
        ctx.fillRect(-r, r * 0.12, r * 2, r * 0.18);
        ctx.restore();
      }

      if (obj.style.kind === "ringed" || obj.style.kind === "mystic") {
        ctx.strokeStyle = obj.style.ring1;
        ctx.lineWidth = Math.max(1.2, 4.2 * scale);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.2, r * 0.48, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = obj.style.ring2;
        ctx.lineWidth = Math.max(0.8, 2 * scale);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.75, r * 0.36, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (obj.style.hasMoon) {
        obj.moonAngle += obj.moonSpeed;
        const mx = Math.cos(obj.moonAngle) * r * 1.65;
        const my = Math.sin(obj.moonAngle) * r * 0.42;
        ctx.fillStyle = "#f3e8ff";
        ctx.beginPath();
        ctx.arc(mx, my, Math.max(1.4, r * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obj.type === "blackhole") {
      const r = obj.radius * scale;
      ctx.rotate(obj.tilt);

      const lens = ctx.createRadialGradient(0, 0, r * 0.88, 0, 0, r * 2.8);
      lens.addColorStop(0, "rgba(192, 132, 252, 0.85)");
      lens.addColorStop(0.35, "rgba(126, 34, 206, 0.38)");
      lens.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = lens;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(245, 208, 254, 0.82)";
      ctx.lineWidth = Math.max(1.5, 4 * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.45, r * 0.4, 0, 0, Math.PI * 2);
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
  let travelSpeed = 0;

  function triggerStage(stage) {
    if (currentStage === stage) return;
    currentStage = stage;

    const isMobile = w < 600;
    const phraseFont = isMobile ? Math.max(22, w * 0.062) : Math.max(34, w * 0.032);
    const step = isMobile ? 4 : 5;
    const countFont = isMobile ? Math.min(w * 0.32, 145) : Math.min(h * 0.26, 180);

    if (stage === 1) {
      const lines = isMobile
        ? ["¿Quieres saber", "cuánto he de amarte?..."]
        : ["¿Quieres saber cuánto he de amarte?..."];
      setCrispText(lines, phraseFont, 500, step);
    } else if (stage === 2) {
      const lines = isMobile
        ? ["¿Quieres saber", "cuánto he de amarte?...", "", "Solo espera"]
        : ["¿Quieres saber cuánto he de amarte?...", "", "Solo espera"];
      setCrispText(lines, phraseFont, 500, step);
    } else if (stage === 3) {
      releaseText(1.4);
    } else if (stage === 4) {
      setCrispText(["3"], countFont, 600, step);
    } else if (stage === 5) {
      releaseText(1.3);
    } else if (stage === 6) {
      setCrispText(["2"], countFont, 600, step);
    } else if (stage === 7) {
      releaseText(1.3);
    } else if (stage === 8) {
      setCrispText(["1"], countFont, 600, step);
    } else if (stage === 9) {
      releaseText(1.6);
      const fov = 440;
      for (let i = 0; i < stars.length; i++) {
        const z = 220 + Math.random() * 3200;
        const scale = fov / z;
        stars[i].wz = z;
        stars[i].wx = (stars[i].x - w / 2) / scale + (Math.random() - 0.5) * 900;
        stars[i].wy = (stars[i].y - h / 2) / scale + (Math.random() - 0.5) * 900;
      }
      initCosmicField(0, 0);
    } else if (stage === 10) {
      const finalFont = isMobile ? Math.max(20, w * 0.052) : Math.max(30, w * 0.028);
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
      setCrispText(finalLines, finalFont, 500, step);
    }
  }

  function render(now) {
    if (!started) {
      requestAnimationFrame(render);
      return;
    }

    const elapsed = (now - startTime) / 1000;

    if (elapsed < 4.5) triggerStage(0);
    else if (elapsed < 10.5) triggerStage(1);
    else if (elapsed < 17.5) triggerStage(2);
    else if (elapsed < 20.5) triggerStage(3);
    else if (elapsed < 23.8) triggerStage(4);
    else if (elapsed < 26.0) triggerStage(5);
    else if (elapsed < 29.3) triggerStage(6);
    else if (elapsed < 31.5) triggerStage(7);
    else if (elapsed < 34.8) triggerStage(8);
    else if (elapsed < 125.0) triggerStage(9);
    else triggerStage(10);

    activeTextState.opacity +=
      (activeTextState.targetOpacity - activeTextState.opacity) * 0.032;

    const isJourney = currentStage >= 9;
    const isFinalText = currentStage === 10;

    if (!isJourney) {
      ctx.fillStyle = "rgba(2, 1, 8, 0.34)";
      ctx.fillRect(0, 0, w, h);

      updateAndDrawShootingStars(0.012);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (s.alpha < s.targetAlpha) {
          s.alpha = Math.min(s.targetAlpha, s.alpha + 0.005);
        }

        if (s.tx !== null && s.ty !== null) {
          s.x += (s.tx - s.x) * 0.032;
          s.y += (s.ty - s.y) * 0.032;
        } else {
          s.x += s.vx;
          s.y += s.vy;
          s.vx *= 0.994;
          s.vy *= 0.994;

          if (s.x < 0) s.x += w;
          if (s.x > w) s.x -= w;
          if (s.y < 0) s.y += h;
          if (s.y > h) s.y -= h;
        }

        const twinkle = 0.72 + 0.28 * Math.sin(now * 0.0025 + s.phase);
        const condenseFade = s.inText ? Math.max(0.25, 1 - activeTextState.opacity * 0.72) : 1;
        const alpha = (s.inText ? 0.9 : s.alpha) * twinkle * condenseFade;
        const radius = s.inText ? Math.max(0.9, s.size * 0.75) : s.size;

        ctx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      drawCrispTextLayer();
    } else {
      const journeyTime = elapsed - 34.8;
      const targetSpeed = isFinalText ? 4.2 : 8.5;
      travelSpeed += (targetSpeed - travelSpeed) * 0.012;

      ctx.fillStyle = isFinalText
        ? "rgba(2, 1, 8, 0.42)"
        : "rgba(2, 1, 8, 0.28)";
      ctx.fillRect(0, 0, w, h);

      const camX = Math.sin(journeyTime * 0.14) * 520 + Math.cos(journeyTime * 0.07) * 260;
      const camY = Math.cos(journeyTime * 0.11) * 420 + Math.sin(journeyTime * 0.09) * 210;
      const camYaw = Math.sin(journeyTime * 0.12) * 0.28;
      const camPitch = Math.cos(journeyTime * 0.1) * 0.2;
      const camRoll = Math.sin(journeyTime * 0.08) * 0.32;
      const fov = 440;
      const dimObjects = isFinalText ? 0.32 : 0.95;

      updateAndDrawShootingStars(isFinalText ? 0.014 : 0.022);

      cosmicObjects.sort((a, b) => b.wz - a.wz);
      for (let i = 0; i < cosmicObjects.length; i++) {
        const obj = cosmicObjects[i];
        obj.wz -= travelSpeed * 0.9;
        if (obj.wz < 60) {
          respawnCosmicObject(obj, camX, camY);
        }
        drawCosmicObject(obj, camX, camY, camYaw, camPitch, camRoll, fov, dimObjects);
      }

      const cosY = Math.cos(camYaw);
      const sinY = Math.sin(camYaw);
      const cosP = Math.cos(camPitch);
      const sinP = Math.sin(camPitch);
      const cosR = Math.cos(camRoll);
      const sinR = Math.sin(camRoll);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        if (isFinalText && s.inText && s.tx !== null && s.ty !== null) {
          s.x += (s.tx - s.x) * 0.028;
          s.y += (s.ty - s.y) * 0.028;

          const twinkle = 0.78 + 0.22 * Math.sin(now * 0.002 + s.phase);
          const condenseFade = Math.max(0.22, 1 - activeTextState.opacity * 0.75);
          const r = Math.max(0.95, s.size * 0.75);

          ctx.fillStyle = `rgba(233, 213, 255, ${(0.88 * twinkle * condenseFade).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          s.wz -= travelSpeed * (0.75 + (i % 5) * 0.14);

          if (s.wz <= 20) {
            s.wz = 3400;
            s.wx = camX + (Math.random() - 0.5) * 5200;
            s.wy = camY + (Math.random() - 0.5) * 4200;
            continue;
          }

          const dx = s.wx - camX;
          const dy = s.wy - camY;
          const dz = s.wz;

          const x1 = dx * cosY - dz * sinY;
          const z1 = dx * sinY + dz * cosY;
          const y2 = dy * cosP - z1 * sinP;
          const z2 = dy * sinP + z1 * cosP;

          if (z2 <= 20) continue;

          const scaleNow = fov / z2;
          const rx = x1 * cosR - y2 * sinR;
          const ry = x1 * sinR + y2 * cosR;

          const sx = w / 2 + rx * scaleNow;
          const sy = h / 2 + ry * scaleNow;

          s.x = sx;
          s.y = sy;

          if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;

          const depthAlpha =
            Math.min(1, (3400 - s.wz) / 800) * (isFinalText ? 0.5 : 0.95);
          const radius = Math.min(3.2, Math.max(0.65, s.size * scaleNow * 0.7));

          ctx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${depthAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (isFinalText) {
        drawCrispTextLayer();
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
            if (audio.volume < 0.75) {
              audio.volume = Math.min(0.75, audio.volume + 0.02);
            } else {
              clearInterval(iv);
            }
          }, 150);
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
