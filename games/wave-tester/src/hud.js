import { beaufortLabel } from "./presets.js";

const HISTORY_SECONDS = 20;
const SAMPLE_INTERVAL = 1 / 30;

/**
 * Reads the ocean the way an instrumented buoy would: elevation over time,
 * observed peak-to-trough, and the theoretical numbers to compare against.
 */
export class Hud {
  constructor() {
    this.root = document.getElementById("overlay");
    this.seaState = document.getElementById("sea-state");
    this.fields = {
      elevation: document.getElementById("stat-elevation"),
      hs: document.getElementById("stat-hs"),
      range: document.getElementById("stat-range"),
      wavelength: document.getElementById("stat-wavelength"),
      speed: document.getElementById("stat-speed"),
    };

    this.canvas = document.getElementById("graph");
    this.ctx = this.canvas.getContext("2d");
    this.scaleCanvas();
    window.addEventListener("resize", () => this.scaleCanvas());

    this.history = [];
    this.sampleTimer = 0;
    this.textTimer = 0;
    this.visible = true;
  }

  scaleCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
  }

  toggle() {
    this.visible = !this.visible;
    this.root.classList.toggle("hidden", !this.visible);
  }

  reset() {
    this.history.length = 0;
  }

  update(waveField, elevation, delta, presetName) {
    if (!this.visible) return;

    this.sampleTimer += delta;
    if (this.sampleTimer >= SAMPLE_INTERVAL) {
      this.sampleTimer = 0;
      this.history.push(elevation);
      const maxSamples = Math.round(HISTORY_SECONDS / SAMPLE_INTERVAL);
      if (this.history.length > maxSamples) this.history.shift();
      this.drawGraph(waveField);
    }

    // Text updates several times a second are plenty and keep the DOM quiet.
    this.textTimer += delta;
    if (this.textTimer < 0.1) return;
    this.textTimer = 0;

    let min = Infinity;
    let max = -Infinity;
    for (const value of this.history) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const range = this.history.length ? max - min : 0;

    this.seaState.textContent = waveField.params.tsunami
      ? `${presetName} · wall approaching`
      : `${presetName} · ${beaufortLabel(waveField.params.windSpeed)}`;
    this.fields.elevation.textContent = `${elevation >= 0 ? "+" : ""}${elevation.toFixed(2)} m`;
    this.fields.hs.textContent = `${waveField.significantHeight.toFixed(2)} m`;
    this.fields.range.textContent = `${range.toFixed(2)} m`;
    this.fields.wavelength.textContent = `${waveField.dominantWavelength.toFixed(0)} m`;
    this.fields.speed.textContent = `${waveField.crestSpeed.toFixed(1)} m/s`;
  }

  drawGraph(waveField) {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    const amplitude = Math.max(0.4, waveField.significantHeight * 0.85);
    const mid = h / 2;
    const scale = mid / amplitude;

    ctx.strokeStyle = "rgba(170, 210, 235, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    if (this.history.length < 2) return;

    const step = w / (Math.round(HISTORY_SECONDS / SAMPLE_INTERVAL) - 1);
    const points = this.history.map((value, index) => [index * step, mid - value * scale]);

    ctx.beginPath();
    ctx.moveTo(points[0][0], mid);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.lineTo(points[points.length - 1][0], mid);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, "rgba(87, 215, 255, 0.28)");
    fill.addColorStop(1, "rgba(87, 215, 255, 0.02)");
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.strokeStyle = "#57d7ff";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const [lastX, lastY] = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = "#eaf4fb";
    ctx.fill();
  }
}
