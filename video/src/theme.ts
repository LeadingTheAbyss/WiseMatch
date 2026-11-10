import { Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

export const { fontFamily } = loadFont("normal", { weights: ["300", "500", "700", "800"], subsets: ["latin"] });

/** One place for every colour, size and spring so scenes stay consistent. */
export const theme = {
  fps: 60,
  width: 1920,
  height: 1080,
  unit: 8, // spacing grid
  margin: 120, // safe margin
  bg: "#ffffff",
  ink: "#1a1030",
  muted: "#6b6485",
  line: "#e6e0f3",
  tint: "#f6f3fd",
  brand: "#6d28d9",
  brand2: "#8b5cf6",
  light: "#a78bfa",
  deep: "#3b0b6f",
  gradient: "linear-gradient(135deg, #5b21b6 0%, #8b5cf6 55%, #c4b5fd 100%)",
  font: fontFamily,
} as const;

/** ease-out-expo, used for entrances */
export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);

/** spring presets: snappy for UI, soft for hero elements, gentle for camera-like moves */
export const springs = {
  snappy: { damping: 18, stiffness: 190, mass: 0.8 },
  soft: { damping: 24, stiffness: 95, mass: 1 },
  gentle: { damping: 200, stiffness: 60, mass: 1 },
} as const;
