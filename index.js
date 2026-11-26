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

  const CURSIVE_FONT = '"Dancing Script", "Brush Script MT", cursive';
  const COUNT_FONT = 'Georgia, "Times New Roman", serif';
  const FOV = 460;

  const STAR_PALETTES = [
    [255, 255, 255],
    [255, 255, 255],
    [233, 213, 255],
    [192, 132, 252],
    [199, 210, 254],
    [254, 243, 199],
  ];

  const STAR_COUNT = 2600;
  const stars = [];

  for (let i = 0; i < STAR_COUNT; i++) {
    const wz = 140 + Math.random() * 3400;
    const wx = (Math.random() - 0.5) * 6400;
    const wy = (Math.random() - 0.5) * 5000;
    const scale = FOV / wz;
    const hasSpikes = i % 38 === 0;

    stars.push({
      wx,
      wy,
      wz,
      x: w / 2 + wx * scale,
      y: h / 2 + wy * scale,
      tx: null,
      ty: null,
      driftVx: (Math.random() - 0.5) * 0.16,
      driftVy: (Math.random() - 0.5) * 0.16,
      size: hasSpikes ? 1.5 + Math.random() * 1.1 : 0.7 + Math.random() * 1.35,
      alpha: 0,
      targetAlpha: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      color: STAR_PALETTES[i % STAR_PALETTES.length],
      hasSpikes,
      spikeSix: i % 76 === 0,
      inText: false,
      morphBlend: 0,
    });
  }

  let activeTextState = {
    lines: [],
    fontSize: 38,
    weight: 600,
    fontFamily: CURSIVE_FONT,
    opacity: 0,
    flash: 0,
    createdAt: 0,
    active: false,
  };

  function sampleTextPoints(lines, fontSize, weight, fontFamily, step) {
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");

    octx.fillStyle = "#ffffff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.font = `${weight} ${fontSize}px ${fontFamily}`;

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
        if (data[(y * w + x) * 4 + 3] > 120) {
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

  function setMorphText(lines, fontSize, weight, fontFamily, step, now) {
    const points = sampleTextPoints(lines, fontSize, weight, fontFamily, step);
    const usable = Math.min(points.length, 920);

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
    activeTextState.fontFamily = fontFamily;
    activeTextState.active = true;
    activeTextState.opacity = 0;
    activeTextState.flash = 0;
    activeTextState.createdAt = now;
  }

  function releaseText(scatterSpeed, camX, camY, camYaw, camPitch, camRoll) {
    activeTextState.active = false;
    const cosY = Math.cos(-camYaw);
    const sinY = Math.sin(-camYaw);
    const cosP = Math.cos(-camPitch);
    const sinP = Math.sin(-camPitch);
    const cosR = Math.cos(-camRoll);
    const sinR = Math.sin(-camRoll);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      if (s.inText) {
        const angle = Math.random() * Math.PI * 2;
        const spd = scatterSpeed * (0.4 + Math.random() * 0.9);
        s.driftVx = Math.cos(angle) * spd;
        s.driftVy = Math.sin(angle) * spd;

        const z = 520 + Math.random() * 1400;
        const invScale = z / FOV;
        const rx = (s.x - w / 2) * invScale;
        const ry = (s.y - h / 2) * invScale;

        const x1 = rx * cosR - ry * sinR;
        const y2 = rx * sinR + ry * cosR;

        const y1 = y2 * cosP - z * sinP;
        const z1 = y2 * sinP + z * cosP;

        const dx = x1 * cosY - z1 * sinY;
        const dz = x1 * sinY + z1 * cosY;

        s.wx = camX + dx;
        s.wy = camY + y1;
        s.wz = Math.max(240, dz);
      }
      s.tx = null;
      s.ty = null;
      s.inText = false;
    }
  }

  function updateAndDrawCrispText(now) {
    if (activeTextState.active) {
      const age = (now - activeTextState.createdAt) / 1000;

      if (age > 1.4 && age < 2.9) {
        const progress = (age - 1.4) / 1.5;
        activeTextState.flash = Math.sin(progress * Math.PI);
      } else {
        activeTextState.flash *= 0.9;
      }

      if (age > 1.7) {
        activeTextState.opacity = Math.min(1, activeTextState.opacity + 0.015);
      }
    } else {
      activeTextState.opacity = Math.max(0, activeTextState.opacity - 0.025);
      activeTextState.flash *= 0.86;
    }

    if (activeTextState.opacity <= 0.004 && activeTextState.flash <= 0.004) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${activeTextState.weight} ${activeTextState.fontSize}px ${activeTextState.fontFamily}`;

    const lineHeight = activeTextState.fontSize * 1.38;
    const totalHeight = activeTextState.lines.length * lineHeight;
    const startY = h / 2 - totalHeight / 2 + lineHeight / 2;

    if (activeTextState.flash > 0.01) {
      ctx.shadowColor = `rgba(233, 213, 255, ${(0.95 * activeTextState.flash).toFixed(3)})`;
      ctx.shadowBlur = 28 * activeTextState.flash;
      ctx.fillStyle = `rgba(243, 232, 255, ${(0.48 * activeTextState.flash).toFixed(3)})`;

      activeTextState.lines.forEach((line, idx) => {
        if (line !== "") {
          ctx.fillText(line, w / 2, startY + idx * lineHeight);
        }
      });
    }

    if (activeTextState.opacity > 0.004) {
      ctx.shadowColor = `rgba(192, 132, 252, ${(0.62 * activeTextState.opacity).toFixed(3)})`;
      ctx.shadowBlur = 16;
      ctx.fillStyle = `rgba(255, 255, 255, ${activeTextState.opacity.toFixed(3)})`;

      activeTextState.lines.forEach((line, idx) => {
        if (line !== "") {
          ctx.fillText(line, w / 2, startY + idx * lineHeight);
        }
      });
    }

    ctx.restore();
  }

  function drawDiffractionStar(x, y, radius, color, alpha, sixSpikes) {
    const spikeLen = radius * 7.5;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.4);
    glow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    glow.addColorStop(0.35, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${(alpha * 0.45).toFixed(3)})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${(alpha * 0.55).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.6, radius * 0.35);
    ctx.beginPath();
    ctx.moveTo(x - spikeLen, y);
    ctx.lineTo(x + spikeLen, y);
    ctx.moveTo(x, y - spikeLen);
    ctx.lineTo(x, y + spikeLen);

    if (sixSpikes) {
      const diag = spikeLen * 0.68;
      ctx.moveTo(x - diag, y - diag * 0.58);
      ctx.lineTo(x + diag, y + diag * 0.58);
      ctx.moveTo(x - diag, y + diag * 0.58);
      ctx.lineTo(x + diag, y - diag * 0.58);
    }
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  const shootingStars = [];

  function spawnShootingStar() {
    const bright = Math.random() > 0.55;
    const startX = Math.random() * w;
    const startY = Math.random() * h * 0.65;
    const angle = Math.PI * (0.15 + Math.random() * 0.25);
    const speed = bright ? 5.5 + Math.random() * 3 : 3.8 + Math.random() * 2;

    shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: bright ? 120 + Math.random() * 70 : 60 + Math.random() * 40,
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
          ? `rgba(216, 180, 254, ${st.alpha * 0.55})`
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

  const backdropClouds = [
    { nx: 0.22, ny: 0.28, r: 0.55, c1: "rgba(107, 33, 168, 0.26)", c2: "rgba(49, 16, 82, 0.12)" },
    { nx: 0.78, ny: 0.35, r: 0.52, c1: "rgba(67, 56, 202, 0.24)", c2: "rgba(30, 27, 75, 0.12)" },
    { nx: 0.48, ny: 0.55, r: 0.65, c1: "rgba(162, 28, 175, 0.22)", c2: "rgba(88, 28, 135, 0.12)" },
    { nx: 0.25, ny: 0.76, r: 0.5, c1: "rgba(88, 28, 135, 0.25)", c2: "rgba(30, 10, 60, 0.12)" },
    { nx: 0.76, ny: 0.74, r: 0.54, c1: "rgba(126, 34, 206, 0.24)", c2: "rgba(46, 16, 101, 0.12)" },
  ];

  function drawNebulaBackdrop(intensity, camRoll, time) {
    ctx.fillStyle = "#04010c";
    ctx.fillRect(0, 0, w, h);

    if (intensity <= 0.005) return;

    const maxDim = Math.max(w, h);
    ctx.save();
    ctx.globalAlpha = intensity;

    for (let i = 0; i < backdropClouds.length; i++) {
      const c = backdropClouds[i];
      const driftX = Math.sin(time * 0.00018 + i) * 35;
      const driftY = Math.cos(time * 0.00015 + i * 1.4) * 28;
      const cx = c.nx * w + driftX + Math.sin(camRoll) * 40;
      const cy = c.ny * h + driftY;
      const rad = c.r * maxDim;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, c.c1);
      grad.addColorStop(0.55, c.c2);
      grad.addColorStop(1, "rgba(4, 1, 12, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  const cosmicObjects = [];
  const SECTORS = [
    { sx: -1, sy: -1 },
    { sx: 1, sy: -1 },
    { sx: -1, sy: 1 },
    { sx: 1, sy: 1 },
  ];

  function findBalancedPosition(sectorIdx, z, camX, camY, ignoreObj) {
    const sector = SECTORS[sectorIdx % 4];
    let bestX = camX + sector.sx * (260 + Math.random() * 980);
    let bestY = camY + sector.sy * (200 + Math.random() * 780);

    for (let attempt = 0; attempt < 14; attempt++) {
      const candX = camX + sector.sx * (220 + Math.random() * 1050);
      const candY = camY + sector.sy * (170 + Math.random() * 820);
      let tooClose = false;

      for (let j = 0; j < cosmicObjects.length; j++) {
        const other = cosmicObjects[j];
        if (other === ignoreObj) continue;
        const dist = Math.hypot(candX - other.wx, candY - other.wy, (z - other.wz) * 0.65);
        if (dist < 540) {
          tooClose = true;
          break;
        }
      }

      bestX = candX;
      bestY = candY;
      if (!tooClose) break;
    }

    return { wx: bestX, wy: bestY };
  }

  function createGalaxy(sectorIdx, z, camX, camY) {
    const variant = Math.floor(Math.random() * 3);
    const pts = [];
    const count = variant === 1 ? 170 : 240;
    const arms = variant === 0 ? 2 : variant === 2 ? 4 : 2;
    const hueMode = Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const d = i / count;
      const arm = i % arms;
      const spread = variant === 1 ? 0.2 : 0.45;
      const angle = (arm * Math.PI * 2) / arms + d * 5.4 + (Math.random() - 0.5) * spread;
      const r = 4 + d * 145;

      let color;
      if (hueMode === 0) {
        color = d < 0.28 ? "rgba(255, 243, 214, 0.95)" : "rgba(192, 132, 252, 0.78)";
      } else if (hueMode === 1) {
        color = d < 0.28 ? "rgba(250, 232, 255, 0.95)" : "rgba(232, 121, 249, 0.75)";
      } else {
        color = d < 0.28 ? "rgba(254, 249, 195, 0.95)" : "rgba(129, 140, 248, 0.78)";
      }

      pts.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        color,
        size: 1.2 + Math.random() * 1.4,
      });
    }

    const pos = findBalancedPosition(sectorIdx, z, camX, camY, null);
    return {
      type: "galaxy",
      sectorIdx,
      wx: pos.wx,
      wy: pos.wy,
      wz: z,
      tilt: (Math.random() - 0.5) * 1.5,
      flatness: variant === 1 ? 0.24 : 0.46,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() < 0.5 ? 1 : -1) * (0.004 + Math.random() * 0.006),
      pts,
    };
  }

  function createPlanet(sectorIdx, z, camX, camY) {
    const styles = [
      {
        kind: "ringed",
        c1: "#f3e8ff",
        c2: "#7e22ce",
        c3: "#140726",
        ring1: "rgba(233, 213, 255, 0.6)",
        ring2: "rgba(168, 85, 247, 0.38)",
        hasMoon: true,
      },
      {
        kind: "ringed",
        c1: "#e9d5ff",
        c2: "#6b21a8",
        c3: "#0f051d",
        ring1: "rgba(243, 232, 255, 0.55)",
        ring2: "rgba(192, 132, 252, 0.35)",
        hasMoon: true,
      },
      {
        kind: "banded",
        c1: "#e0e7ff",
        c2: "#4f46e5",
        c3: "#0f0e29",
        bandColor: "rgba(255, 255, 255, 0.14)",
        hasMoon: true,
      },
      {
        kind: "mystic",
        c1: "#fae8ff",
        c2: "#a21caf",
        c3: "#1f0629",
        ring1: "rgba(245, 208, 254, 0.5)",
        ring2: "rgba(192, 132, 252, 0.3)",
        hasMoon: false,
      },
      {
        kind: "ice",
        c1: "#f8fafc",
        c2: "#6366f1",
        c3: "#090d1f",
        hasMoon: true,
      },
    ];

    const style = styles[Math.floor(Math.random() * styles.length)];
    const pos = findBalancedPosition(sectorIdx, z, camX, camY, null);
    return {
      type: "planet",
      sectorIdx,
      wx: pos.wx,
      wy: pos.wy,
      wz: z,
      radius: 36 + Math.random() * 44,
      tilt: -0.45 + Math.random() * 0.9,
      moonAngle: Math.random() * Math.PI * 2,
      moonSpeed: 0.015 + Math.random() * 0.015,
      style,
    };
  }

  function createBlackHole(sectorIdx, z, camX, camY) {
    const pos = findBalancedPosition(sectorIdx, z, camX, camY, null);
    return {
      type: "blackhole",
      sectorIdx,
      wx: pos.wx,
      wy: pos.wy,
      wz: z,
      radius: 38 + Math.random() * 22,
      tilt: (Math.random() - 0.5) * 0.75,
    };
  }

  function createNebula(sectorIdx, z, camX, camY) {
    const colors = [
      "rgba(168, 85, 247, 0.24)",
      "rgba(192, 38, 211, 0.2)",
      "rgba(109, 40, 217, 0.22)",
      "rgba(79, 70, 229, 0.2)",
    ];
    const pos = findBalancedPosition(sectorIdx, z, camX, camY, null);
    return {
      type: "nebula",
      sectorIdx,
      wx: pos.wx,
      wy: pos.wy,
      wz: z,
      radius: 340 + Math.random() * 240,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }

  function initCosmicField(camX, camY) {
    cosmicObjects.length = 0;
    for (let i = 0; i < 32; i++) {
      const z = 380 + i * 130;
      const sectorIdx = i % 4;
      const mod = i % 5;
      if (mod === 0) cosmicObjects.push(createNebula(sectorIdx, z, camX, camY));
      else if (mod === 1 || mod === 3) cosmicObjects.push(createPlanet(sectorIdx, z, camX, camY));
      else if (mod === 2) cosmicObjects.push(createGalaxy(sectorIdx, z, camX, camY));
      else cosmicObjects.push(createBlackHole(sectorIdx, z, camX, camY));
    }
  }

  function respawnCosmicObject(obj, camX, camY) {
    obj.wz = 4200 + Math.random() * 500;
    const pos = findBalancedPosition(obj.sectorIdx, obj.wz, camX, camY, obj);
    obj.wx = pos.wx;
    obj.wy = pos.wy;
  }

  function drawCosmicObject(obj, camX, camY, camYaw, camPitch, camRoll, dim) {
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

    const scale = FOV / z2;
    const cosR = Math.cos(camRoll);
    const sinR = Math.sin(camRoll);
    const rx = x1 * cosR - y2 * sinR;
    const ry = x1 * sinR + y2 * cosR;

    const sx = w / 2 + rx * scale;
    const sy = h / 2 + ry * scale;

    if (sx < -450 || sx > w + 450 || sy < -450 || sy > h + 450) return;

    const fadeIn = Math.min(1, (4200 - obj.wz) / 1000);
    const fadeOut = Math.min(1, z2 / 240);
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

      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 34 * scale);
      core.addColorStop(0, "rgba(255, 248, 231, 0.96)");
      core.addColorStop(0.4, "rgba(216, 180, 254, 0.45)");
      core.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 34 * scale, 0, Math.PI * 2);
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
      atmo.addColorStop(0, "rgba(192, 132, 252, 0.34)");
      atmo.addColorStop(1, "rgba(192, 132, 252, 0)");
      ctx.fillStyle = atmo;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.08, 0, 0, r);
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
        ctx.lineWidth = Math.max(1.2, 4.4 * scale);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.25, r * 0.48, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = obj.style.ring2;
        ctx.lineWidth = Math.max(0.8, 2.2 * scale);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.8, r * 0.36, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (obj.style.hasMoon) {
        obj.moonAngle += obj.moonSpeed;
        const mx = Math.cos(obj.moonAngle) * r * 1.68;
        const my = Math.sin(obj.moonAngle) * r * 0.42;
        ctx.fillStyle = "#f3e8ff";
        ctx.beginPath();
        ctx.arc(mx, my, Math.max(1.6, r * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obj.type === "blackhole") {
      const r = obj.radius * scale;
      ctx.rotate(obj.tilt);

      const lens = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 3.0);
      lens.addColorStop(0, "rgba(233, 213, 255, 0.9)");
      lens.addColorStop(0.32, "rgba(147, 51, 234, 0.42)");
      lens.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = lens;
      ctx.beginPath();
      ctx.arc(0, 0, r * 3.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(250, 232, 255, 0.78)";
      ctx.lineWidth = Math.max(1.4, 3.6 * scale);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.55, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();

      ctx.strokeStyle = "rgba(245, 208, 254, 0.88)";
      ctx.lineWidth = Math.max(1.6, 4.4 * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.65, r * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(192, 132, 252, 0.5)";
      ctx.lineWidth = Math.max(1, 2.2 * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 3.1, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#010003";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
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
  let cosmosFade = 0;

  let camX = 0;
  let camY = 0;
  let camYaw = 0;
  let camPitch = 0;
  let camRoll = 0;

  function triggerStage(stage, now) {
    if (currentStage === stage) return;
    currentStage = stage;

    const isMobile = w < 600;
    const phraseFont = isMobile ? Math.max(29, w * 0.082) : Math.max(46, w * 0.042);
    const step = isMobile ? 4 : 5;
    const countFont = isMobile ? Math.min(w * 0.34, 155) : Math.min(h * 0.28, 190);

    if (stage === 1) {
      const lines = isMobile
        ? ["¿Quieres saber", "cuánto he de amarte?..."]
        : ["¿Quieres saber cuánto he de amarte?..."];
      setMorphText(lines, phraseFont, 600, CURSIVE_FONT, step, now);
    } else if (stage === 2) {
      releaseText(1.15, camX, camY, camYaw, camPitch, camRoll);
    } else if (stage === 3) {
      setMorphText(["...Solo espera"], phraseFont * 1.08, 600, CURSIVE_FONT, step, now);
    } else if (stage === 4) {
      releaseText(1.15, camX, camY, camYaw, camPitch, camRoll);
    } else if (stage === 5) {
      setMorphText(["3"], countFont, 400, COUNT_FONT, step, now);
    } else if (stage === 6) {
      releaseText(1.0, camX, camY, camYaw, camPitch, camRoll);
    } else if (stage === 7) {
      setMorphText(["2"], countFont, 400, COUNT_FONT, step, now);
    } else if (stage === 8) {
      releaseText(1.0, camX, camY, camYaw, camPitch, camRoll);
    } else if (stage === 9) {
      setMorphText(["1"], countFont, 400, COUNT_FONT, step, now);
      initCosmicField(0, 0);
    } else if (stage === 10) {
      releaseText(0.4, camX, camY, camYaw, camPitch, camRoll);
    } else if (stage === 11) {
      const finalFont = isMobile ? Math.max(25, w * 0.068) : Math.max(38, w * 0.036);
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
      setMorphText(finalLines, finalFont, 600, CURSIVE_FONT, step, now);
    }
  }

  function render(now) {
    if (!started) {
      requestAnimationFrame(render);
      return;
    }

    const elapsed = (now - startTime) / 1000;

    if (elapsed < 4.5) triggerStage(0, now);
    else if (elapsed < 11.5) triggerStage(1, now);
    else if (elapsed < 14.5) triggerStage(2, now);
    else if (elapsed < 20.5) triggerStage(3, now);
    else if (elapsed < 23.5) triggerStage(4, now);
    else if (elapsed < 27.5) triggerStage(5, now);
    else if (elapsed < 29.5) triggerStage(6, now);
    else if (elapsed < 33.5) triggerStage(7, now);
    else if (elapsed < 35.5) triggerStage(8, now);
    else if (elapsed < 39.5) triggerStage(9, now);
    else if (elapsed < 129.5) triggerStage(10, now);
    else triggerStage(11, now);

    const isJourney = currentStage >= 10;
    const isFinalText = currentStage === 11;

    if (currentStage === 9) {
      cosmosFade = Math.min(0.42, cosmosFade + 0.0028);
      travelSpeed = Math.min(1.2, travelSpeed + 0.006);
    } else if (isJourney) {
      const targetFade = isFinalText ? 0.42 : 1.0;
      cosmosFade += (targetFade - cosmosFade) * 0.014;
      const targetSpeed = isFinalText ? 4.2 : 7.8;
      travelSpeed += (targetSpeed - travelSpeed) * 0.0065;
    }

    if (travelSpeed > 0.01) {
      const journeyTime = Math.max(0, elapsed - 35.5);
      const steerBlend = Math.min(1, journeyTime / 7.5);
      camX = (Math.sin(journeyTime * 0.13) * 420 + Math.cos(journeyTime * 0.07) * 210) * steerBlend;
      camY = (Math.cos(journeyTime * 0.1) * 340 + Math.sin(journeyTime * 0.08) * 170) * steerBlend;
      camYaw = Math.sin(journeyTime * 0.11) * 0.22 * steerBlend;
      camPitch = Math.cos(journeyTime * 0.09) * 0.16 * steerBlend;
      camRoll = Math.sin(journeyTime * 0.07) * 0.26 * steerBlend;
    }

    drawNebulaBackdrop(cosmosFade, camRoll, now);

    if (cosmosFade > 0.005 && cosmicObjects.length > 0) {
      cosmicObjects.sort((a, b) => b.wz - a.wz);
      for (let i = 0; i < cosmicObjects.length; i++) {
        const obj = cosmicObjects[i];
        obj.wz -= travelSpeed * 0.9;
        if (obj.wz < 60) {
          respawnCosmicObject(obj, camX, camY);
        }
        drawCosmicObject(obj, camX, camY, camYaw, camPitch, camRoll, cosmosFade);
      }
    }

    updateAndDrawShootingStars(isJourney ? (isFinalText ? 0.016 : 0.028) : 0.014);

    const cosY = Math.cos(camYaw);
    const sinY = Math.sin(camYaw);
    const cosP = Math.cos(camPitch);
    const sinP = Math.sin(camPitch);
    const cosR = Math.cos(camRoll);
    const sinR = Math.sin(camRoll);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      if (s.alpha < s.targetAlpha) {
        s.alpha = Math.min(s.targetAlpha, s.alpha + 0.006);
      }

      if (travelSpeed > 0.01 && !s.inText) {
        s.wz -= travelSpeed * (0.75 + (i % 5) * 0.14);
        if (s.wz <= 25) {
          s.wz = 3500;
          s.wx = camX + (Math.random() - 0.5) * 6400;
          s.wy = camY + (Math.random() - 0.5) * 5000;
        }
      } else if (!s.inText) {
        s.wx += s.driftVx;
        s.wy += s.driftVy;
        s.driftVx *= 0.995;
        s.driftVy *= 0.995;
      }

      const dx = s.wx - camX;
      const dy = s.wy - camY;
      const dz = s.wz;

      const x1 = dx * cosY - dz * sinY;
      const z1 = dx * sinY + dz * cosY;
      const y2 = dy * cosP - z1 * sinP;
      const z2 = dy * sinP + z1 * cosP;

      let projX = s.x;
      let projY = s.y;
      let scaleNow = 1;
      let visibleIn3D = false;

      if (z2 > 25) {
        scaleNow = FOV / z2;
        const rx = x1 * cosR - y2 * sinR;
        const ry = x1 * sinR + y2 * cosR;
        projX = w / 2 + rx * scaleNow;
        projY = h / 2 + ry * scaleNow;
        visibleIn3D = projX >= -80 && projX <= w + 80 && projY >= -80 && projY <= h + 80;
      }

      if (s.inText && s.tx !== null && s.ty !== null) {
        s.morphBlend = Math.min(1, s.morphBlend + 0.035);
        s.x += (s.tx - s.x) * 0.038;
        s.y += (s.ty - s.y) * 0.038;
      } else {
        s.morphBlend = Math.max(0, s.morphBlend - 0.03);
        if (visibleIn3D) {
          s.x = projX * (1 - s.morphBlend) + s.x * s.morphBlend;
          s.y = projY * (1 - s.morphBlend) + s.y * s.morphBlend;
        }
      }

      if (!s.inText && !visibleIn3D) continue;

      const twinkle = 0.75 + 0.25 * Math.sin(now * 0.0024 + s.phase);
      const distanceFade = Math.min(1, (3550 - s.wz) / 450);
      const condenseFade = s.inText
        ? Math.max(0.18, 1 - activeTextState.opacity * 0.78)
        : 1;
      const boost = s.inText ? 1 + activeTextState.flash * 0.65 : 1;

      const baseAlpha = s.inText
        ? 0.92
        : s.alpha * distanceFade * (isFinalText ? 0.55 : 0.96);
      const finalAlpha = Math.min(1, baseAlpha * twinkle * condenseFade * boost);

      const baseRadius = s.inText
        ? Math.max(0.95, s.size * 0.78)
        : Math.min(3.2, Math.max(0.7, s.size * scaleNow * 0.75));
      const radius = baseRadius * boost;

      if (s.hasSpikes && !s.inText && scaleNow > 0.35) {
        drawDiffractionStar(s.x, s.y, radius * 1.15, s.color, finalAlpha, s.spikeSix);
      } else {
        ctx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${finalAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    updateAndDrawCrispText(now);
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
