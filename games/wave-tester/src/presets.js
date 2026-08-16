/**
 * Sea states roughly following the Beaufort scale, plus two exaggerated
 * scenarios that are useful for stress-testing how objects behave.
 */
export const PRESETS = [
  {
    name: "Glassy Calm",
    description: "Beaufort 1 — barely a ripple",
    wave: { windSpeed: 2.4, directionSpread: 18, layerCount: 4, choppiness: 0.22, wavelengthScale: 1, heightScale: 1, speedScale: 1 },
    look: { foamAmount: 0.05, rippleStrength: 0.02, breakStrength: 0.05 },
  },
  {
    name: "Light Breeze",
    description: "Beaufort 3 — small wavelets, scattered crests",
    wave: { windSpeed: 5.2, directionSpread: 30, layerCount: 5, choppiness: 0.45, wavelengthScale: 1, heightScale: 1, speedScale: 1 },
    look: { foamAmount: 0.2, rippleStrength: 0.03, breakStrength: 0.2 },
  },
  {
    name: "Moderate Sea",
    description: "Beaufort 4 — regular swell, some whitecaps",
    wave: { windSpeed: 8.5, directionSpread: 40, layerCount: 6, choppiness: 0.72, wavelengthScale: 1, heightScale: 1, speedScale: 1 },
    look: { foamAmount: 0.45, rippleStrength: 0.035, breakStrength: 0.55 },
  },
  {
    name: "Choppy",
    description: "Beaufort 6 — short, steep, confused water",
    wave: { windSpeed: 12.5, directionSpread: 62, layerCount: 7, choppiness: 1.05, wavelengthScale: 0.6, heightScale: 1.05, speedScale: 1.08 },
    look: { foamAmount: 0.72, rippleStrength: 0.055, breakStrength: 0.95 },
  },
  {
    name: "Gale",
    description: "Beaufort 8 — long tumbling crests, dense foam",
    wave: { windSpeed: 18, directionSpread: 52, layerCount: 7, choppiness: 1.15, wavelengthScale: 0.9, heightScale: 1, speedScale: 1 },
    look: { foamAmount: 0.82, rippleStrength: 0.06, breakStrength: 1.15 },
  },
  {
    name: "Storm",
    description: "Beaufort 10 — very high waves, heavy tumbling",
    wave: { windSpeed: 25, directionSpread: 46, layerCount: 8, choppiness: 1.25, wavelengthScale: 1, heightScale: 1.15, speedScale: 1 },
    look: { foamAmount: 0.9, rippleStrength: 0.07, breakStrength: 1.35 },
  },
  {
    name: "Ground Swell",
    description: "Huge long-period swell — best for jumping",
    wave: { windSpeed: 18, directionSpread: 8, layerCount: 3, choppiness: 0.9, wavelengthScale: 3.2, heightScale: 3.4, speedScale: 0.75 },
    look: { foamAmount: 0.48, rippleStrength: 0.03, breakStrength: 0.85 },
  },
  {
    name: "Rogue",
    description: "Freak sea — crashing walls and big air",
    wave: {
      windSpeed: 28,
      directionSpread: 34,
      layerCount: 6,
      choppiness: 1.3,
      wavelengthScale: 1.6,
      heightScale: 1.6,
      speedScale: 0.9,
      tsunami: false,
    },
    look: { foamAmount: 0.95, rippleStrength: 0.08, breakStrength: 1.45 },
  },
  {
    name: "Tsunami",
    description: "A wall of water — solitary pulse rolling through a quiet sea",
    wave: {
      windSpeed: 3.5,
      windDirection: 90,
      directionSpread: 4,
      layerCount: 2,
      choppiness: 0.2,
      wavelengthScale: 2.4,
      heightScale: 0.25,
      speedScale: 1,
      tsunami: true,
      tsunamiAmplitude: 42,
      tsunamiWidth: 55,
      tsunamiSpeed: 30,
      tsunamiOrigin: -200,
    },
    look: { foamAmount: 0.75, rippleStrength: 0.035, breakStrength: 1.25 },
  },
];

/** Descriptive label for an arbitrary wind speed, in metres per second. */
export function beaufortLabel(windSpeed) {
  const scale = [
    [0.3, "Calm"],
    [1.6, "Light air"],
    [3.4, "Light breeze"],
    [5.5, "Gentle breeze"],
    [8.0, "Moderate breeze"],
    [10.8, "Fresh breeze"],
    [13.9, "Strong breeze"],
    [17.2, "Near gale"],
    [20.8, "Gale"],
    [24.5, "Strong gale"],
    [28.5, "Storm"],
    [32.7, "Violent storm"],
  ];
  for (const [limit, label] of scale) {
    if (windSpeed < limit) return label;
  }
  return "Hurricane / Tsunami";
}
