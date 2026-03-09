const canvas = document.getElementById("solarCanvas");
const ctx = canvas.getContext("2d");
const viewportCard = canvas.parentElement;

const panelEmpty = document.getElementById("panelEmpty");
const panelContent = document.getElementById("panelContent");
const closePanelBtn = document.getElementById("closePanelBtn");
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const loadingScreen = document.getElementById("loadingScreen");
const loadingProgress = document.getElementById("loadingProgress");
const appShell = document.getElementById("appShell");
const floatingTip = document.getElementById("floatingTip");
const toggleLabelsBtn = document.getElementById("toggleLabelsBtn");
const toggleControlsBtn = document.getElementById("toggleControlsBtn");
const controlsBar = document.getElementById("controlsBar");
const controlsWrap = document.querySelector(".controls-wrap");
const tourToggleBtn = document.getElementById("tourToggleBtn");
const introTourModal = document.getElementById("introTourModal");
const startIntroTourBtn = document.getElementById("startIntroTourBtn");
const notNowIntroTourBtn = document.getElementById("notNowIntroTourBtn");
const tourCard = document.getElementById("tourCard");
const isMobileViewport = () => window.matchMedia("(max-width: 760px)").matches;

const details = {
  mark: document.getElementById("planetMark"),
  type: document.getElementById("planetType"),
  name: document.getElementById("planetName"),
  description: document.getElementById("planetDescription"),
  diameter: document.getElementById("planetDiameter"),
  distance: document.getElementById("planetDistance"),
  moons: document.getElementById("planetMoons"),
  atmosphere: document.getElementById("planetAtmosphere"),
  composition: document.getElementById("planetComposition"),
  temperature: document.getElementById("planetTemperature"),
  orbit: document.getElementById("planetOrbit"),
  fact: document.getElementById("planetFact")
};

const SUN_DATA = {
  name: "Sun",
  kind: "star",
  type: "G-Type Main-Sequence Star",
  color: "#ffbd59",
  glow: "rgba(255, 191, 102, 0.55)",
  radius: 26,
  description: "The Sun is the blazing star at the heart of our solar system, supplying the light, warmth, and energy that make life on Earth possible.",
  diameter: "1.39 million km",
  distanceFromSun: "0 km",
  moons: "0",
  atmosphere: "Photosphere, chromosphere, and corona made of superheated plasma",
  composition: "Mostly hydrogen and helium, with energy produced by nuclear fusion in its core.",
  temperature: "Surface about 5,500 C, core about 15 million C",
  orbitalPeriod: "The solar system orbits the Milky Way in about 225 million years",
  funFact: "More than 99.8% of the total mass of the solar system is contained in the Sun."
};

const panelMarkCtx = details.mark.getContext("2d");

const state = {
  scale: 0.8,
  targetScale: 0.8,
  minScale: 0.46,
  maxScale: 2.8,
  offsetX: 0,
  offsetY: 0,
  targetOffsetX: 0,
  targetOffsetY: 0,
  wobbleX: 0,
  wobbleY: 0,
  targetWobbleX: 0,
  targetWobbleY: 0,
  dragging: false,
  activePointerId: null,
  touchPoints: {},
  pinching: false,
  pinchDistance: 0,
  pinchCenterX: 0,
  pinchCenterY: 0,
  dragMoved: false,
  lastPointerX: 0,
  lastPointerY: 0,
  hoverBody: null,
  selectedBody: null,
  width: 0,
  height: 0,
  starField: [],
  asteroidBelt: [],
  showLabels: true,
  controlsCollapsed: false,
  tourActive: false,
  tourIndex: -1,
  tourTimer: null,
  hasStartedTour: false,
  hasDismissedTip: false
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function resizeCanvas(preserveView = true) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const nextWidth = Math.round(rect.width);
  const nextHeight = Math.round(rect.height);

  if (!nextWidth || !nextHeight) {
    return;
  }

  if (state.width === nextWidth && state.height === nextHeight && canvas.width === Math.round(rect.width * dpr) && canvas.height === Math.round(rect.height * dpr)) {
    return;
  }

  const previousWidth = state.width;
  const previousHeight = state.height;

  state.width = nextWidth;
  state.height = nextHeight;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  createStarField();
  createAsteroidBelt();

  if (!preserveView || !previousWidth || !previousHeight) {
    resetView(false);
    return;
  }

  const widthRatio = state.width / previousWidth;
  const heightRatio = state.height / previousHeight;
  state.offsetX *= widthRatio;
  state.targetOffsetX *= widthRatio;
  state.offsetY *= heightRatio;
  state.targetOffsetY *= heightRatio;
}

function createStarField() {
  const count = Math.max(160, Math.floor((state.width * state.height) / 7000));
  state.starField = Array.from({ length: count }, () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    size: Math.random() * 1.8 + 0.4,
    alpha: Math.random() * 0.55 + 0.2,
    drift: Math.random() * 0.18 + 0.02
  }));
}

function createAsteroidBelt() {
  const count = Math.max(220, Math.floor(state.width * 0.14));
  state.asteroidBelt = Array.from({ length: count }, () => ({
    orbitRadius: 248 + Math.random() * 42,
    angle: Math.random() * Math.PI * 2,
    size: Math.random() * 2.2 + 0.7,
    alpha: Math.random() * 0.28 + 0.18,
    speed: Math.random() * 0.00008 + 0.00003,
    tint: Math.random() > 0.55 ? "rgba(206, 188, 158, 1)" : "rgba(154, 164, 182, 1)",
    tilt: 0.24 + Math.random() * 0.16
  }));
}
function getDefaultView() {
  const maxOrbit = Math.max(...SOLAR_SYSTEM_PLANETS.map((planet) => planet.orbitRadius + planet.radius + 24));
  const horizontalPadding = 72;
  const verticalPadding = 96;
  const fitWidth = (state.width - horizontalPadding * 2) / (maxOrbit * 2);
  const fitHeight = (state.height - verticalPadding * 2) / (maxOrbit * 0.68 * 2);
  const baseScale = clamp(Math.min(fitWidth, fitHeight), state.minScale, 0.95);

  return {
    scale: baseScale,
    offsetX: state.width * 0.5,
    offsetY: state.height * 0.5
  };
}

function resetView(smooth = true) {
  const defaultView = getDefaultView();
  state.targetScale = defaultView.scale;
  state.targetOffsetX = defaultView.offsetX;
  state.targetOffsetY = defaultView.offsetY;

  if (!smooth) {
    state.scale = defaultView.scale;
    state.offsetX = defaultView.offsetX;
    state.offsetY = defaultView.offsetY;
  }
}

function getRenderOffsetX() {
  return state.offsetX + state.wobbleX;
}

function getRenderOffsetY() {
  return state.offsetY + state.wobbleY;
}
function getTouchPointList() {
  return Object.values(state.touchPoints);
}

function getPinchMetrics() {
  const points = getTouchPointList();
  if (points.length < 2) {
    return null;
  }

  const [a, b] = points;
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    centerX: (a.x + b.x) * 0.5,
    centerY: (a.y + b.y) * 0.5
  };
}

function beginPinchGesture() {
  const metrics = getPinchMetrics();
  if (!metrics) {
    return;
  }

  state.pinching = true;
  state.dragging = false;
  state.activePointerId = null;
  state.dragMoved = true;
  state.pinchDistance = metrics.distance;
  state.pinchCenterX = metrics.centerX;
  state.pinchCenterY = metrics.centerY;
}

function updatePinchGesture() {
  const metrics = getPinchMetrics();
  if (!metrics) {
    return;
  }

  if (!state.pinching) {
    beginPinchGesture();
    return;
  }

  if (state.pinchDistance > 0 && metrics.distance > 0) {
    zoomAtPoint(metrics.distance / state.pinchDistance, metrics.centerX, metrics.centerY);
  }

  state.targetOffsetX += metrics.centerX - state.pinchCenterX;
  state.targetOffsetY += metrics.centerY - state.pinchCenterY;
  state.targetWobbleX = clamp(state.targetWobbleX + (metrics.centerX - state.pinchCenterX) * 0.12, -18, 18);
  state.targetWobbleY = clamp(state.targetWobbleY + (metrics.centerY - state.pinchCenterY) * 0.12, -12, 12);
  state.pinchDistance = metrics.distance;
  state.pinchCenterX = metrics.centerX;
  state.pinchCenterY = metrics.centerY;
}

function endTouchPointer(pointerId) {
  delete state.touchPoints[pointerId];

  const remainingTouches = getTouchPointList();
  if (remainingTouches.length >= 2) {
    beginPinchGesture();
    return;
  }

  state.pinching = false;
  state.pinchDistance = 0;

  if (remainingTouches.length === 1) {
    const [touch] = remainingTouches;
    state.activePointerId = touch.pointerId;
    state.lastPointerX = touch.x;
    state.lastPointerY = touch.y;
    state.dragging = true;
    state.dragMoved = true;
    return;
  }

  state.activePointerId = null;
  state.dragging = false;
}
function worldToScreen(x, y) {
  return { x: x * state.scale + state.offsetX, y: y * state.scale + state.offsetY };
}

function getPlanetPosition(planet, elapsed) {
  const wobble = Math.sin(elapsed * 0.0012 + planet.orbitRadius * 0.05) * 4;
  const angle = elapsed * planet.orbitSpeed * 0.0002 + planet.orbitRadius * 0.035;
  return {
    x: Math.cos(angle) * planet.orbitRadius,
    y: Math.sin(angle) * (planet.orbitRadius * 0.34) + wobble
  };
}

function getMoonPosition(planet, moon, elapsed) {
  const angle = elapsed * moon.orbitSpeed * 0.0014 + moon.orbitRadius * 0.24;
  const tilt = moon.orbitRadius * 0.6;
  return {
    x: planet.currentPosition.x + Math.cos(angle) * moon.orbitRadius,
    y: planet.currentPosition.y + Math.sin(angle) * tilt
  };
}

function drawBackground(elapsed) {
  const gradient = ctx.createRadialGradient(state.width * 0.5, state.height * 0.45, 30, state.width * 0.5, state.height * 0.45, state.width * 0.8);
  gradient.addColorStop(0, "rgba(30, 50, 110, 0.16)");
  gradient.addColorStop(1, "rgba(3, 5, 14, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  for (const star of state.starField) {
    const twinkle = (Math.sin(elapsed * 0.001 * star.drift * 8 + star.x) + 1) * 0.18;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${star.alpha + twinkle})`;
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function isSameBody(a, b) {
  return !!a && !!b && a.name === b.name && a.kind === b.kind;
}

function hasFocusedSelection() {
  return !!state.selectedBody;
}

function updateBodyPositions(elapsed) {
  const sunScreen = worldToScreen(0, 0);
  SUN_DATA.currentPosition = { x: 0, y: 0 };
  SUN_DATA.screenX = sunScreen.x;
  SUN_DATA.screenY = sunScreen.y;

  SOLAR_SYSTEM_PLANETS.forEach((planet) => {
    planet.kind = "planet";
    const position = getPlanetPosition(planet, elapsed);
    const screen = worldToScreen(position.x, position.y);
    planet.currentPosition = position;
    planet.screenX = screen.x;
    planet.screenY = screen.y;

    (planet.moonsData || []).forEach((moon) => {
      moon.kind = "moon";
      moon.hostPlanet = planet.name;
      const moonPosition = getMoonPosition(planet, moon, elapsed);
      const moonScreen = worldToScreen(moonPosition.x, moonPosition.y);
      moon.currentPosition = moonPosition;
      moon.screenX = moonScreen.x;
      moon.screenY = moonScreen.y;
    });
  });
}

function drawSun(mode = "all") {
  const sunScreen = { x: SUN_DATA.screenX, y: SUN_DATA.screenY };
  const radius = SUN_DATA.radius * state.scale;
  const isHovered = isSameBody(state.hoverBody, SUN_DATA);
  const isSelected = isSameBody(state.selectedBody, SUN_DATA);
  const hasFocus = hasFocusedSelection();
  const shouldDraw = mode === "all" || (mode === "background" && (!isSelected || !hasFocus)) || (mode === "selected" && isSelected);

  if (!shouldDraw) {
    return;
  }

  ctx.save();
  if (hasFocus && !isSelected) {
    ctx.globalAlpha = 0.22;
  }

  const glowRadius = radius * (isSelected ? 4.2 : 3.3);
  const glow = ctx.createRadialGradient(sunScreen.x, sunScreen.y, radius * 0.3, sunScreen.x, sunScreen.y, glowRadius);
  glow.addColorStop(0, "rgba(255, 231, 150, 0.96)");
  glow.addColorStop(0.4, "rgba(255, 180, 72, 0.48)");
  glow.addColorStop(1, "rgba(255, 140, 43, 0)");
  ctx.beginPath();
  ctx.fillStyle = glow;
  ctx.arc(sunScreen.x, sunScreen.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  const core = ctx.createRadialGradient(sunScreen.x - radius * 0.25, sunScreen.y - radius * 0.35, radius * 0.2, sunScreen.x, sunScreen.y, radius);
  core.addColorStop(0, "#fff8d4");
  core.addColorStop(0.5, "#ffcd67");
  core.addColorStop(1, "#e67f25");
  ctx.beginPath();
  ctx.fillStyle = core;
  ctx.arc(sunScreen.x, sunScreen.y, radius * (isHovered ? 1.04 : 1), 0, Math.PI * 2);
  ctx.fill();

  if (isSelected) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 231, 150, 0.95)";
    ctx.lineWidth = 2.4;
    ctx.arc(sunScreen.x, sunScreen.y, radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.showLabels && (state.scale > 0.52 || isHovered || isSelected)) {
    ctx.font = `700 ${clamp(12 * state.scale, 12, 16)}px Space Grotesk`;
    ctx.textAlign = "center";
    ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 248, 214, 0.94)";
    ctx.fillText("Sun", sunScreen.x, sunScreen.y + radius + 22);
  }

  ctx.restore();
}

function drawOrbits(mode = "all") {
  const hasFocus = hasFocusedSelection();
  ctx.save();
  if (mode === "background" && hasFocus) {
    ctx.globalAlpha = 0.22;
  }
  if (mode === "selected" && hasFocus) {
    ctx.globalAlpha = 0;
  }
  ctx.translate(getRenderOffsetX(), getRenderOffsetY());
  ctx.scale(state.scale, state.scale);

  SOLAR_SYSTEM_PLANETS.forEach((planet, index) => {
    ctx.beginPath();
    ctx.strokeStyle = index % 2 === 0 ? "rgba(141, 216, 255, 0.12)" : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1 / state.scale;
    ctx.ellipse(0, 0, planet.orbitRadius, planet.orbitRadius * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();
}

function drawAsteroidBelt(elapsed, mode = "all") {
  const hasFocus = hasFocusedSelection();
  ctx.save();
  if (mode === "background" && hasFocus) {
    ctx.globalAlpha = 0.18;
  }
  if (mode === "selected" && hasFocus) {
    ctx.globalAlpha = 0;
  }
  ctx.translate(getRenderOffsetX(), getRenderOffsetY());
  ctx.scale(state.scale, state.scale);

  for (const asteroid of state.asteroidBelt) {
    const angle = asteroid.angle + elapsed * asteroid.speed;
    const x = Math.cos(angle) * asteroid.orbitRadius;
    const y = Math.sin(angle) * (asteroid.orbitRadius * asteroid.tilt);
    const size = asteroid.size / state.scale;

    ctx.beginPath();
    ctx.fillStyle = rgbaWithAlpha(asteroid.tint, asteroid.alpha);
    ctx.ellipse(x, y, size, size * (0.72 + Math.sin(angle * 3.1) * 0.08), angle * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = clamp((num >> 16) + amt, 0, 255);
  const g = clamp(((num >> 8) & 255) + amt, 0, 255);
  const b = clamp((num & 255) + amt, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}
function rgbaWithAlpha(color, alpha) {
  const match = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    return color;
  }

  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length < 3) {
    return color;
  }

  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

function drawDetailBlob(drawCtx, screen, radius, xFactor, yFactor, widthFactor, heightFactor, rotation, color, alpha) {
  drawCtx.save();
  drawCtx.translate(screen.x + radius * xFactor, screen.y + radius * yFactor);
  drawCtx.rotate(rotation);
  drawCtx.fillStyle = rgbaWithAlpha(color, alpha);
  drawCtx.beginPath();
  drawCtx.ellipse(0, 0, radius * widthFactor, radius * heightFactor, 0, 0, Math.PI * 2);
  drawCtx.fill();
  drawCtx.restore();
}

function drawDetailBand(drawCtx, screen, radius, yFactor, widthFactor, heightFactor, color, alpha) {
  drawCtx.fillStyle = rgbaWithAlpha(color, alpha);
  drawCtx.beginPath();
  drawCtx.ellipse(screen.x, screen.y + radius * yFactor, radius * widthFactor, radius * heightFactor, 0, 0, Math.PI * 2);
  drawCtx.fill();
}

function drawDetailStroke(drawCtx, screen, radius, xFactor, yFactor, widthFactor, heightFactor, rotation, color, alpha, lineWidthFactor = 0.08) {
  drawCtx.save();
  drawCtx.translate(screen.x + radius * xFactor, screen.y + radius * yFactor);
  drawCtx.rotate(rotation);
  drawCtx.strokeStyle = rgbaWithAlpha(color, alpha);
  drawCtx.lineWidth = Math.max(1, radius * lineWidthFactor);
  drawCtx.beginPath();
  drawCtx.ellipse(0, 0, radius * widthFactor, radius * heightFactor, 0, 0, Math.PI * 2);
  drawCtx.stroke();
  drawCtx.restore();
}

function drawSurfaceDetails(body, screen, radius, drawCtx = ctx) {
  drawCtx.save();
  drawCtx.beginPath();
  drawCtx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  drawCtx.clip();

  switch (body.name) {
    case "Mercury":
      drawDetailBlob(drawCtx, screen, radius, -0.22, -0.08, 0.22, 0.18, 0.4, "rgb(132, 126, 119)", 0.28);
      drawDetailBlob(drawCtx, screen, radius, 0.18, 0.2, 0.15, 0.11, -0.2, "rgb(202, 194, 182)", 0.18);
      drawDetailBlob(drawCtx, screen, radius, 0.06, -0.28, 0.14, 0.1, 0, "rgb(116, 110, 103)", 0.22);
      drawDetailStroke(drawCtx, screen, radius, -0.1, 0.05, 0.3, 0.16, -0.25, "rgb(240, 230, 214)", 0.12, 0.05);
      break;
    case "Venus":
      drawDetailBand(drawCtx, screen, radius, -0.24, 0.98, 0.16, "rgb(248, 221, 176)", 0.26);
      drawDetailBand(drawCtx, screen, radius, -0.02, 0.9, 0.13, "rgb(214, 162, 111)", 0.2);
      drawDetailBand(drawCtx, screen, radius, 0.18, 0.84, 0.11, "rgb(241, 197, 144)", 0.18);
      drawDetailStroke(drawCtx, screen, radius, -0.08, 0.04, 0.48, 0.16, 0.18, "rgb(255, 239, 205)", 0.12, 0.045);
      break;
    case "Earth":
      drawDetailBlob(drawCtx, screen, radius, -0.2, -0.04, 0.3, 0.22, -0.45, "rgb(95, 178, 93)", 0.95);
      drawDetailBlob(drawCtx, screen, radius, 0.1, 0.06, 0.13, 0.08, 0.15, "rgb(78, 154, 78)", 0.88);
      drawDetailBlob(drawCtx, screen, radius, 0.18, 0.2, 0.24, 0.13, 0.42, "rgb(94, 170, 90)", 0.9);
      drawDetailBlob(drawCtx, screen, radius, 0.32, -0.1, 0.11, 0.08, -0.55, "rgb(125, 196, 122)", 0.78);
      drawDetailStroke(drawCtx, screen, radius, -0.14, -0.02, 0.34, 0.18, -0.35, "rgb(61, 124, 61)", 0.22, 0.04);
      drawDetailBand(drawCtx, screen, radius, -0.32, 0.92, 0.08, "rgb(255, 255, 255)", 0.18);
      drawDetailBand(drawCtx, screen, radius, 0.24, 0.78, 0.06, "rgb(255, 255, 255)", 0.14);
      drawDetailBlob(drawCtx, screen, radius, -0.28, -0.16, 0.26, 0.11, -0.2, "rgb(255, 255, 255)", 0.11);
      drawDetailBlob(drawCtx, screen, radius, 0.08, 0.28, 0.22, 0.08, 0.1, "rgb(255, 255, 255)", 0.09);
      break;
    case "Mars":
      drawDetailBlob(drawCtx, screen, radius, -0.12, -0.04, 0.42, 0.23, -0.2, "rgb(171, 90, 64)", 0.32);
      drawDetailBlob(drawCtx, screen, radius, 0.22, 0.18, 0.18, 0.11, 0.3, "rgb(235, 196, 170)", 0.2);
      drawDetailBand(drawCtx, screen, radius, -0.38, 0.46, 0.08, "rgb(247, 236, 227)", 0.34);
      drawDetailStroke(drawCtx, screen, radius, 0.06, 0.04, 0.42, 0.16, 0.12, "rgb(122, 62, 42)", 0.18, 0.04);
      break;
    case "Jupiter":
      drawDetailBand(drawCtx, screen, radius, -0.42, 1.04, 0.11, "rgb(245, 224, 199)", 0.66);
      drawDetailBand(drawCtx, screen, radius, -0.22, 1.08, 0.12, "rgb(196, 144, 106)", 0.48);
      drawDetailBand(drawCtx, screen, radius, -0.02, 1.1, 0.11, "rgb(230, 205, 178)", 0.58);
      drawDetailBand(drawCtx, screen, radius, 0.18, 1.06, 0.12, "rgb(176, 119, 88)", 0.42);
      drawDetailBand(drawCtx, screen, radius, 0.38, 0.98, 0.1, "rgb(228, 190, 151)", 0.42);
      drawDetailStroke(drawCtx, screen, radius, -0.04, 0.08, 0.94, 0.18, 0.04, "rgb(255, 240, 221)", 0.1, 0.03);
      drawDetailBlob(drawCtx, screen, radius, 0.28, 0.08, 0.18, 0.1, -0.12, "rgb(194, 107, 74)", 0.8);
      break;
    case "Saturn":
      drawDetailBand(drawCtx, screen, radius, -0.32, 1.02, 0.1, "rgb(246, 234, 190)", 0.5);
      drawDetailBand(drawCtx, screen, radius, -0.12, 1.02, 0.09, "rgb(211, 187, 123)", 0.34);
      drawDetailBand(drawCtx, screen, radius, 0.08, 0.98, 0.09, "rgb(240, 218, 156)", 0.4);
      drawDetailBand(drawCtx, screen, radius, 0.28, 0.94, 0.08, "rgb(190, 162, 101)", 0.26);
      drawDetailStroke(drawCtx, screen, radius, 0, 0.02, 0.84, 0.2, 0, "rgb(255, 245, 214)", 0.08, 0.03);
      break;
    case "Uranus":
      drawDetailBand(drawCtx, screen, radius, -0.16, 0.96, 0.08, "rgb(204, 247, 249)", 0.24);
      drawDetailBand(drawCtx, screen, radius, 0.08, 0.92, 0.07, "rgb(128, 212, 223)", 0.16);
      drawDetailBand(drawCtx, screen, radius, 0.28, 0.84, 0.05, "rgb(223, 252, 255)", 0.1);
      break;
    case "Neptune":
      drawDetailBand(drawCtx, screen, radius, -0.18, 0.98, 0.09, "rgb(98, 136, 255)", 0.3);
      drawDetailBand(drawCtx, screen, radius, 0.08, 0.94, 0.08, "rgb(60, 96, 226)", 0.24);
      drawDetailBand(drawCtx, screen, radius, 0.28, 0.86, 0.05, "rgb(126, 161, 255)", 0.14);
      drawDetailBlob(drawCtx, screen, radius, 0.26, 0.04, 0.16, 0.08, -0.2, "rgb(83, 114, 236)", 0.22);
      break;
    case "Moon":
    case "Phobos":
    case "Deimos":
    case "Callisto":
    case "Rhea":
    case "Iapetus":
    case "Titania":
    case "Oberon":
    case "Proteus":
    case "Nereid":
      drawDetailBlob(drawCtx, screen, radius, -0.18, -0.08, 0.18, 0.16, 0.2, "rgb(118, 118, 118)", 0.18);
      drawDetailBlob(drawCtx, screen, radius, 0.16, 0.2, 0.11, 0.09, -0.1, "rgb(240, 240, 240)", 0.08);
      drawDetailStroke(drawCtx, screen, radius, -0.04, 0.04, 0.34, 0.18, -0.2, "rgb(90, 90, 90)", 0.08, 0.03);
      break;
    case "Europa":
    case "Enceladus":
      drawDetailBand(drawCtx, screen, radius, -0.08, 0.88, 0.05, "rgb(162, 188, 222)", 0.16);
      drawDetailBand(drawCtx, screen, radius, 0.12, 0.82, 0.04, "rgb(222, 234, 246)", 0.14);
      break;
    case "Ganymede":
    case "Titan":
    case "Triton":
      drawDetailBand(drawCtx, screen, radius, -0.1, 0.86, 0.06, shadeColor(body.color, -12), 0.18);
      drawDetailBlob(drawCtx, screen, radius, 0.1, 0.14, 0.18, 0.1, 0.2, shadeColor(body.color, 14), 0.14);
      break;
    case "Io":
      drawDetailBlob(drawCtx, screen, radius, -0.18, -0.02, 0.22, 0.14, 0.2, "rgb(201, 130, 48)", 0.24);
      drawDetailBlob(drawCtx, screen, radius, 0.18, 0.14, 0.18, 0.12, -0.3, "rgb(247, 224, 122)", 0.18);
      break;
    default:
      if (body.kind === "moon") {
        drawDetailBlob(drawCtx, screen, radius, -0.12, -0.08, 0.18, 0.14, 0.2, shadeColor(body.color, -16), 0.12);
      }
      break;
  }

  drawCtx.restore();
}

function renderPanelPreview(body) {
  const previewSize = details.mark.width;
  const center = { x: previewSize * 0.5, y: previewSize * 0.5 };
  const radius = body.kind === "moon" ? previewSize * 0.21 : body.kind === "star" ? previewSize * 0.31 : previewSize * 0.28;

  panelMarkCtx.clearRect(0, 0, previewSize, previewSize);

  const halo = panelMarkCtx.createRadialGradient(center.x, center.y, radius * 0.2, center.x, center.y, radius * 1.95);
  halo.addColorStop(0, rgbaWithAlpha(body.glow, 0.42));
  halo.addColorStop(0.52, rgbaWithAlpha(body.glow, 0.16));
  halo.addColorStop(1, rgbaWithAlpha(body.glow, 0));
  panelMarkCtx.fillStyle = halo;
  panelMarkCtx.beginPath();
  panelMarkCtx.arc(center.x, center.y, radius * 1.95, 0, Math.PI * 2);
  panelMarkCtx.fill();

  if (body.hasRings) {
    panelMarkCtx.save();
    panelMarkCtx.translate(center.x, center.y);
    panelMarkCtx.rotate(-0.25);
    panelMarkCtx.strokeStyle = "rgb(242, 223, 187)";
    panelMarkCtx.lineWidth = Math.max(2, previewSize * 0.06);
    panelMarkCtx.lineCap = "round";
    panelMarkCtx.beginPath();
    panelMarkCtx.ellipse(0, 0, radius * 1.72, radius * 0.68, 0, Math.PI - 0.05, Math.PI * 2 + 0.05);
    panelMarkCtx.stroke();
    panelMarkCtx.restore();
  }

  const fill = panelMarkCtx.createRadialGradient(center.x - radius * 0.34, center.y - radius * 0.38, radius * 0.1, center.x, center.y, radius * 1.04);
  fill.addColorStop(0, shadeColor(body.color, 28));
  fill.addColorStop(0.54, body.color);
  fill.addColorStop(1, shadeColor(body.color, -22));
  panelMarkCtx.fillStyle = fill;
  panelMarkCtx.beginPath();
  panelMarkCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  panelMarkCtx.fill();

  drawSurfaceDetails(body, center, radius, panelMarkCtx);

  const shadow = panelMarkCtx.createRadialGradient(center.x + radius * 0.34, center.y + radius * 0.4, radius * 0.08, center.x + radius * 0.18, center.y + radius * 0.24, radius * 1.02);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0)");
  shadow.addColorStop(0.68, "rgba(0, 0, 0, 0.06)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0.18)");
  panelMarkCtx.fillStyle = shadow;
  panelMarkCtx.beginPath();
  panelMarkCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  panelMarkCtx.fill();

  const highlight = panelMarkCtx.createRadialGradient(center.x - radius * 0.42, center.y - radius * 0.42, 0, center.x - radius * 0.42, center.y - radius * 0.42, radius * 0.72);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.6)");
  highlight.addColorStop(0.24, "rgba(255, 255, 255, 0.24)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  panelMarkCtx.fillStyle = highlight;
  panelMarkCtx.beginPath();
  panelMarkCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  panelMarkCtx.fill();

  panelMarkCtx.beginPath();
  panelMarkCtx.strokeStyle = rgbaWithAlpha(body.glow, body.kind === "moon" ? 0.18 : 0.24);
  panelMarkCtx.lineWidth = Math.max(1.4, previewSize * 0.022);
  panelMarkCtx.arc(center.x, center.y, radius - panelMarkCtx.lineWidth * 0.5, 0, Math.PI * 2);
  panelMarkCtx.stroke();

  if (body.hasRings) {
    panelMarkCtx.save();
    panelMarkCtx.translate(center.x, center.y);
    panelMarkCtx.rotate(-0.25);
    panelMarkCtx.strokeStyle = "rgb(242, 223, 187)";
    panelMarkCtx.lineWidth = Math.max(2, previewSize * 0.06);
    panelMarkCtx.lineCap = "round";
    panelMarkCtx.beginPath();
    panelMarkCtx.ellipse(0, 0, radius * 1.72, radius * 0.68, 0, -0.05, Math.PI + 0.05);
    panelMarkCtx.stroke();
    panelMarkCtx.restore();
  }
}
function drawBody(body, screen, radius, isHovered, isSelected, showLabel) {
  const glowRadius = radius * (isSelected ? 2.9 : isHovered ? 2.35 : 2.1);
  const glow = ctx.createRadialGradient(screen.x, screen.y, radius * 0.2, screen.x, screen.y, glowRadius);
  glow.addColorStop(0, rgbaWithAlpha(body.glow, isSelected ? 0.42 : isHovered ? 0.32 : 0.24));
  glow.addColorStop(0.45, rgbaWithAlpha(body.glow, isSelected ? 0.18 : isHovered ? 0.12 : 0.09));
  glow.addColorStop(1, rgbaWithAlpha(body.glow, 0));
  ctx.beginPath();
  ctx.fillStyle = glow;
  ctx.arc(screen.x, screen.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  const fill = ctx.createRadialGradient(
    screen.x - radius * 0.32,
    screen.y - radius * 0.36,
    radius * 0.12,
    screen.x,
    screen.y,
    radius * 1.02
  );
  fill.addColorStop(0, shadeColor(body.color, 24));
  fill.addColorStop(0.52, body.color);
  fill.addColorStop(1, shadeColor(body.color, -20));
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();

  const highlight = ctx.createRadialGradient(
    screen.x - radius * 0.34,
    screen.y - radius * 0.38,
    0,
    screen.x - radius * 0.34,
    screen.y - radius * 0.38,
    radius * 0.58
  );
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.56)");
  highlight.addColorStop(0.26, "rgba(255, 255, 255, 0.2)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.beginPath();
  ctx.fillStyle = highlight;
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();

  drawSurfaceDetails(body, screen, radius);

  const shadow = ctx.createRadialGradient(
    screen.x + radius * 0.34,
    screen.y + radius * 0.4,
    radius * 0.12,
    screen.x + radius * 0.18,
    screen.y + radius * 0.24,
    radius * 1.02
  );
  shadow.addColorStop(0, "rgba(0, 0, 0, 0)");
  shadow.addColorStop(0.68, "rgba(0, 0, 0, 0.06)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0.2)");
  ctx.beginPath();
  ctx.fillStyle = shadow;
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = rgbaWithAlpha(body.glow, body.kind === "moon" ? 0.16 : 0.22);
  ctx.lineWidth = Math.max(1, radius * 0.06);
  ctx.arc(screen.x, screen.y, radius - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  if (isSelected) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(141, 216, 255, 0.9)";
    ctx.lineWidth = body.kind === "moon" ? 1.5 : 2;
    ctx.arc(screen.x, screen.y, radius + (body.kind === "moon" ? 4 : 7), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (showLabel) {
    ctx.font = `600 ${clamp((body.kind === "moon" ? 9 : 11) * state.scale, body.kind === "moon" ? 9 : 11, body.kind === "moon" ? 12 : 15)}px Space Grotesk`;
    ctx.textAlign = "center";
    ctx.fillStyle = isSelected ? "#ffffff" : isHovered ? "rgba(255,255,255,0.96)" : "rgba(237, 244, 255, 0.78)";
    ctx.fillText(body.name, screen.x, screen.y + radius + (body.kind === "moon" ? 12 : 18));
  }
}

function drawMoonOrbits(planet, mode = "all") {
  if (!planet.moonsData || !planet.moonsData.length) {
    return;
  }

  const hasFocus = hasFocusedSelection();
  const hostSelected = isSameBody(state.selectedBody, planet);
  const shouldDraw = mode === "all" || (mode === "background" && (!hostSelected || !hasFocus)) || (mode === "selected" && hostSelected);
  if (!shouldDraw) {
    return;
  }

  ctx.save();
  if (hasFocus && !hostSelected) {
    ctx.globalAlpha = 0.2;
  }
  ctx.translate(getRenderOffsetX(), getRenderOffsetY());
  ctx.scale(state.scale, state.scale);
  ctx.translate(planet.currentPosition.x, planet.currentPosition.y);

  planet.moonsData.forEach((moon, index) => {
    ctx.beginPath();
    ctx.strokeStyle = index % 2 === 0 ? "rgba(255, 255, 255, 0.09)" : "rgba(141, 216, 255, 0.08)";
    ctx.lineWidth = 0.8 / state.scale;
    ctx.ellipse(0, 0, moon.orbitRadius, moon.orbitRadius * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();
}

function drawPlanetRing(planet, screen, radius, isSelected, layer = "front") {
  if (!planet.hasRings) {
    return;
  }

  const hasFocus = hasFocusedSelection();
  ctx.save();
  if (hasFocus && !isSelected) {
    ctx.globalAlpha = 0.22;
  }
  ctx.translate(screen.x, screen.y);
  ctx.rotate(-0.25);
  ctx.strokeStyle = "rgb(242, 223, 187)";
  ctx.lineWidth = Math.max(1.3, 3 * state.scale);
  ctx.lineCap = "round";
  const seamOverlap = 0.06;
  ctx.beginPath();
  if (layer === "back") {
    ctx.ellipse(0, 0, radius * 1.8, radius * 0.75, 0, Math.PI - seamOverlap, Math.PI * 2 + seamOverlap);
  } else {
    ctx.ellipse(0, 0, radius * 1.8, radius * 0.75, 0, -seamOverlap, Math.PI + seamOverlap);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBodies(mode = "all") {
  const hasFocus = hasFocusedSelection();

  SOLAR_SYSTEM_PLANETS.forEach((planet) => {
    const isHovered = isSameBody(state.hoverBody, planet);
    const isSelected = isSameBody(state.selectedBody, planet);
    const radius = planet.radius * state.scale * (isHovered ? 1.08 : 1);
    const shouldDrawPlanet = mode === "all" || (mode === "background" && (!isSelected || !hasFocus)) || (mode === "selected" && isSelected);

    if (shouldDrawPlanet) {
      drawPlanetRing(planet, { x: planet.screenX, y: planet.screenY }, radius, isSelected, "back");
      ctx.save();
      if (hasFocus && !isSelected) {
        ctx.globalAlpha = 0.22;
      }
      drawBody(planet, { x: planet.screenX, y: planet.screenY }, radius, isHovered, isSelected, state.showLabels && (state.scale > 0.58 || isHovered || isSelected));
      ctx.restore();
      drawPlanetRing(planet, { x: planet.screenX, y: planet.screenY }, radius, isSelected, "front");
    }

    drawMoonOrbits(planet, mode);

    (planet.moonsData || []).forEach((moon) => {
      const isMoonHovered = isSameBody(state.hoverBody, moon);
      const isMoonSelected = isSameBody(state.selectedBody, moon);
      const moonRadius = Math.max(moon.radius * state.scale, 2.2) * (isMoonHovered ? 1.15 : 1);
      const shouldDrawMoon = mode === "all" || (mode === "background" && (!isMoonSelected || !hasFocus)) || (mode === "selected" && isMoonSelected);

      if (!shouldDrawMoon) {
        return;
      }

      ctx.save();
      if (hasFocus && !isMoonSelected) {
        ctx.globalAlpha = 0.18;
      }
      drawBody(moon, { x: moon.screenX, y: moon.screenY }, moonRadius, isMoonHovered, isMoonSelected, state.showLabels && (state.scale > 1.05 || isMoonHovered || isMoonSelected));
      ctx.restore();
    });
  });
}

function findBodyAtPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const sunRadius = SUN_DATA.radius * state.scale;
  if (Math.hypot(x - SUN_DATA.screenX, y - SUN_DATA.screenY) <= sunRadius + 10) {
    return SUN_DATA;
  }

  for (let planetIndex = SOLAR_SYSTEM_PLANETS.length - 1; planetIndex >= 0; planetIndex -= 1) {
    const planet = SOLAR_SYSTEM_PLANETS[planetIndex];
    const moons = planet.moonsData || [];

    for (let moonIndex = moons.length - 1; moonIndex >= 0; moonIndex -= 1) {
      const moon = moons[moonIndex];
      const radius = Math.max(moon.radius * state.scale, 8);
      const distance = Math.hypot(x - moon.screenX, y - moon.screenY);
      if (distance <= radius + 3) {
        return moon;
      }
    }
  }

  for (let index = SOLAR_SYSTEM_PLANETS.length - 1; index >= 0; index -= 1) {
    const planet = SOLAR_SYSTEM_PLANETS[index];
    const radius = Math.max(planet.radius * state.scale, 10);
    const distance = Math.hypot(x - planet.screenX, y - planet.screenY);
    if (distance <= radius + 4) {
      return planet;
    }
  }

  return null;
}

function hideTourCard() {
  tourCard.classList.add("hidden");
}

function showTourCard() {
  if (!state.hasStartedTour) {
    tourCard.classList.remove("hidden");
  }
}
function closeIntroTourModal() {
  introTourModal.classList.add("hidden");
}

function openIntroTourModal() {
  introTourModal.classList.remove("hidden");
}
const TOUR_SEQUENCE = [SUN_DATA, ...SOLAR_SYSTEM_PLANETS];
const TOUR_STEP_MS = 3000;

function syncTourButton() {
  tourToggleBtn.textContent = state.tourActive ? "Stop Tour" : "Start Tour";
  tourToggleBtn.classList.toggle("is-active", state.tourActive);
  tourToggleBtn.setAttribute("aria-pressed", String(state.tourActive));
}

function stopTour(clearSelection = false) {
  if (state.tourTimer) {
    clearTimeout(state.tourTimer);
    state.tourTimer = null;
  }
  state.tourActive = false;
  state.tourIndex = -1;
  if (clearSelection) {
    state.selectedBody = null;
    updateInfoPanel(null);
  }
  syncTourButton();
}

function queueNextTourStep() {
  if (!state.tourActive) {
    return;
  }

  state.tourTimer = setTimeout(() => {
    if (!state.tourActive) {
      return;
    }

    state.tourIndex += 1;
    if (state.tourIndex >= TOUR_SEQUENCE.length) {
      stopTour(true);
      return;
    }

    focusBody(TOUR_SEQUENCE[state.tourIndex]);
    queueNextTourStep();
  }, TOUR_STEP_MS);
}

function startTour() {
  closeIntroTourModal();
  state.hasStartedTour = true;
  hideTourCard();
  stopTour();
  state.tourActive = true;
  state.tourIndex = 0;
  syncTourButton();
  focusBody(TOUR_SEQUENCE[0]);
  queueNextTourStep();
}

function cancelTourOnInteraction() {
  if (state.tourActive) {
    stopTour();
  }
}
function updateInfoPanel(body) {
  if (!body) {
    closePanelBtn.classList.add("hidden");
    panelContent.classList.add("hidden");
    panelEmpty.classList.remove("hidden");
    floatingTip.classList.toggle("hidden", state.hasDismissedTip);
    return;
  }

  closePanelBtn.classList.remove("hidden");
  panelEmpty.classList.add("hidden");
  panelContent.classList.remove("hidden");
  state.hasDismissedTip = true;
  floatingTip.classList.add("hidden");
  renderPanelPreview(body);
  details.type.textContent = body.type;
  details.name.textContent = body.name;
  details.description.textContent = body.description;
  details.diameter.textContent = body.diameter;
  details.distance.textContent = body.distanceFromSun;
  details.moons.textContent = body.moons;
  details.atmosphere.textContent = body.atmosphere;
  details.composition.textContent = body.composition;
  details.temperature.textContent = body.temperature;
  details.orbit.textContent = body.orbitalPeriod;
  details.fact.textContent = body.funFact;
}

function focusBody(body) {
  if (!body || !body.currentPosition) {
    return;
  }

  state.selectedBody = body;
  const minimumScale = body.kind === "moon" ? 1.45 : body.kind === "star" ? 0.9 : 1.18;
  state.targetScale = clamp(Math.max(state.targetScale, minimumScale), state.minScale, state.maxScale);
  state.targetOffsetX = state.width * 0.5 - body.currentPosition.x * state.targetScale;
  state.targetOffsetY = state.height * 0.5 - body.currentPosition.y * state.targetScale;
  updateInfoPanel(body);
}

function zoomAtPoint(delta, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const pointerX = clientX - rect.left;
  const pointerY = clientY - rect.top;
  const worldBefore = {
    x: (pointerX - state.targetOffsetX) / state.targetScale,
    y: (pointerY - state.targetOffsetY) / state.targetScale
  };
  const nextScale = clamp(state.targetScale * delta, state.minScale, state.maxScale);
  state.targetScale = nextScale;
  state.targetOffsetX = pointerX - worldBefore.x * nextScale;
  state.targetOffsetY = pointerY - worldBefore.y * nextScale;
}

function drawFocusOverlay() {
  if (!hasFocusedSelection()) {
    return;
  }

  const gradient = ctx.createRadialGradient(
    state.selectedBody.screenX,
    state.selectedBody.screenY,
    18,
    state.selectedBody.screenX,
    state.selectedBody.screenY,
    Math.max(state.width, state.height) * 0.52
  );
  gradient.addColorStop(0, "rgba(3, 7, 22, 0)");
  gradient.addColorStop(0.55, "rgba(3, 7, 22, 0.05)");
  gradient.addColorStop(1, "rgba(3, 7, 22, 0.18)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);
}

function animate(timestamp) {
  ctx.clearRect(0, 0, state.width, state.height);
  drawBackground(timestamp);
  state.scale = lerp(state.scale, state.targetScale, 0.08);
  state.offsetX = lerp(state.offsetX, state.targetOffsetX, 0.08);
  state.offsetY = lerp(state.offsetY, state.targetOffsetY, 0.08);
  state.wobbleX = lerp(state.wobbleX, state.targetWobbleX, 0.14);
  state.wobbleY = lerp(state.wobbleY, state.targetWobbleY, 0.14);
  state.targetWobbleX = lerp(state.targetWobbleX, 0, state.dragging ? 0.08 : 0.18);
  state.targetWobbleY = lerp(state.targetWobbleY, 0, state.dragging ? 0.08 : 0.18);
  updateBodyPositions(timestamp);

  if (hasFocusedSelection()) {
    drawOrbits("background");
    drawAsteroidBelt(timestamp, "background");
    drawSun("background");
    drawBodies("background");
    drawFocusOverlay();
    drawSun("selected");
    drawBodies("selected");
  } else {
    drawOrbits("all");
    drawAsteroidBelt(timestamp, "all");
    drawSun("all");
    drawBodies("all");
  }

  requestAnimationFrame(animate);
}

function simulateLoading() {
  const checkpoints = [14, 29, 48, 67, 82, 96, 100];
  let index = 0;
  const step = () => {
    loadingProgress.style.width = `${checkpoints[index]}%`;
    index += 1;
    if (index < checkpoints.length) {
      setTimeout(step, index === checkpoints.length - 1 ? 280 : 220);
      return;
    }
    loadingScreen.classList.add("fade-out");
    appShell.classList.add("ready");
    requestAnimationFrame(() => resizeCanvas(true));
    setTimeout(() => openIntroTourModal(), 420);
  };
  step();
}

function bindEvents() {
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    cancelTourOnInteraction();
    zoomAtPoint(event.deltaY < 0 ? 1.12 : 0.9, event.clientX, event.clientY);
  }, { passive: false });

  canvas.addEventListener("pointerdown", (event) => {
    cancelTourOnInteraction();

    if (isMobileViewport() && event.pointerType === "touch") {
      state.touchPoints[event.pointerId] = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture?.(event.pointerId);

      if (getTouchPointList().length >= 2) {
        beginPinchGesture();
        return;
      }

      state.pinching = false;
      state.dragging = true;
      state.activePointerId = event.pointerId;
      state.dragMoved = false;
      state.lastPointerX = event.clientX;
      state.lastPointerY = event.clientY;
      return;
    }

    if (!event.isPrimary) {
      return;
    }

    state.pinching = false;
    state.dragging = true;
    state.activePointerId = event.pointerId;
    state.dragMoved = false;
    state.lastPointerX = event.clientX;
    state.lastPointerY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  });

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" && state.touchPoints[event.pointerId]) {
      state.touchPoints[event.pointerId] = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      if (getTouchPointList().length >= 2) {
        updatePinchGesture();
        state.hoverBody = null;
        canvas.style.cursor = "grabbing";
        return;
      }
    }

    if (state.dragging && event.pointerId === state.activePointerId && !state.pinching) {
      const dx = event.clientX - state.lastPointerX;
      const dy = event.clientY - state.lastPointerY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        state.dragMoved = true;
      }
      state.targetOffsetX += dx;
      state.targetOffsetY += dy;
      state.targetWobbleX = clamp(state.targetWobbleX + dx * 0.16, -18, 18);
      state.targetWobbleY = clamp(state.targetWobbleY + dy * 0.16, -12, 12);
      state.lastPointerX = event.clientX;
      state.lastPointerY = event.clientY;
    }
    if (!isMobileViewport() && event.pointerType !== "touch") {
      state.hoverBody = findBodyAtPoint(event.clientX, event.clientY);
    } else if (!state.dragging && !state.pinching) {
      state.hoverBody = null;
    }
    canvas.style.cursor = state.dragging || state.pinching ? "grabbing" : state.hoverBody ? "pointer" : "grab";
  });

  window.addEventListener("pointerup", (event) => {
    const wasPinching = state.pinching;
    const wasDragging = state.dragging;
    const wasDragMoved = state.dragMoved;
    const releasedActivePointerId = state.activePointerId;

    if (event.pointerType === "touch") {
      endTouchPointer(event.pointerId);
      if (wasPinching) {
        canvas.style.cursor = "grabbing";
        return;
      }
    }

    if (releasedActivePointerId !== null && event.pointerId !== releasedActivePointerId) {
      return;
    }
    const clickedBody = findBodyAtPoint(event.clientX, event.clientY);
    if (wasDragging && !wasDragMoved && clickedBody) {
      cancelTourOnInteraction();
      focusBody(clickedBody);
    } else if (wasDragging && !wasDragMoved && !clickedBody) {
      state.selectedBody = null;
      updateInfoPanel(null);
    }
    state.dragging = false;
    state.activePointerId = null;
    canvas.style.cursor = state.hoverBody ? "pointer" : "grab";
  });

  window.addEventListener("pointercancel", (event) => {
    if (event.pointerType === "touch") {
      endTouchPointer(event.pointerId);
      if (state.pinching) {
        canvas.style.cursor = "grabbing";
        return;
      }
    }
    if (state.activePointerId !== null && event.pointerId !== state.activePointerId) {
      return;
    }
    state.dragging = false;
    state.activePointerId = null;
    state.hoverBody = null;
    canvas.style.cursor = "grab";
  });

  window.addEventListener("resize", () => resizeCanvas(true));

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => resizeCanvas(true));
    observer.observe(viewportCard);
  }

  document.getElementById("zoomInBtn").addEventListener("click", () => {
    cancelTourOnInteraction();
    zoomAtPoint(1.18, state.width * 0.5, state.height * 0.5);
  });
  document.getElementById("zoomOutBtn").addEventListener("click", () => {
    cancelTourOnInteraction();
    zoomAtPoint(0.84, state.width * 0.5, state.height * 0.5);
  });
  document.getElementById("resetViewBtn").addEventListener("click", () => {
    cancelTourOnInteraction();
    state.selectedBody = null;
    resetView(true);
    updateInfoPanel(null);
  });
  tourToggleBtn.addEventListener("click", () => {
    if (state.tourActive) {
      stopTour(true);
      return;
    }
    startTour();
  });
  toggleLabelsBtn.addEventListener("click", () => {
    state.showLabels = !state.showLabels;
    toggleLabelsBtn.classList.toggle("is-active", state.showLabels);
    toggleLabelsBtn.textContent = state.showLabels ? "Labels On" : "Labels Off";
    toggleLabelsBtn.setAttribute("aria-pressed", String(state.showLabels));
  });
  toggleControlsBtn.addEventListener("click", () => {
    state.controlsCollapsed = !state.controlsCollapsed;
    controlsBar.classList.toggle("is-collapsed", state.controlsCollapsed);
    controlsWrap.classList.toggle("is-collapsed", state.controlsCollapsed);
    toggleControlsBtn.classList.toggle("is-collapsed", state.controlsCollapsed);
    toggleControlsBtn.innerHTML = state.controlsCollapsed ? '&#10095;' : '&#10094;';
    toggleControlsBtn.setAttribute("aria-expanded", String(!state.controlsCollapsed));
    toggleControlsBtn.setAttribute("aria-label", state.controlsCollapsed ? "Expand controls" : "Collapse controls");
  });
  closePanelBtn.addEventListener("click", () => {
    cancelTourOnInteraction();
    state.selectedBody = null;
    updateInfoPanel(null);
  });
  startIntroTourBtn.addEventListener("click", () => startTour());
  notNowIntroTourBtn.addEventListener("click", () => {
    closeIntroTourModal();
    showTourCard();
  });
  introTourModal.addEventListener("click", (event) => {
    if (event.target === introTourModal) {
      closeIntroTourModal();
      showTourCard();
    }
  });
  helpBtn.addEventListener("click", () => {
    cancelTourOnInteraction();
    helpModal.classList.remove("hidden");
  });
  closeHelpBtn.addEventListener("click", () => helpModal.classList.add("hidden"));
  helpModal.addEventListener("click", (event) => {
    if (event.target === helpModal) {
      helpModal.classList.add("hidden");
    }
  });
}

function init() {
  resizeCanvas(false);
  bindEvents();
  syncTourButton();
  updateInfoPanel(null);
  requestAnimationFrame(animate);

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(() => resizeCanvas(true));
  }

  simulateLoading();
}

window.addEventListener("load", init);








































































