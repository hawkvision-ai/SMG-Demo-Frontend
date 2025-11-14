// utils/chartColors.ts

export const CHART_COLORS = [
  { bg: "rgba(220, 20, 20, 0.85)", border: "rgba(220, 20, 20, 1)" }, // Strong Red
  { bg: "rgba(34, 139, 34, 0.8)", border: "rgba(34, 139, 34, 1)" }, // Green Grass (#228B22)
  { bg: "rgba(255, 193, 7, 0.8)", border: "rgba(255, 193, 7, 1)" }, // Vibrant Yellow (#FFC107)
  { bg: "rgba(59, 130, 246, 0.8)", border: "rgba(59, 130, 246, 1)" }, // Blue
  { bg: "rgba(182, 109, 146, 0.85)", border: "rgba(182, 109, 146, 1)" }, // Pink
  { bg: "rgba(204, 85, 0, 0.85)", border: "rgba(204, 85, 0, 1)" }, // Burnt Orange
  { bg: "rgba(36, 109, 203, 0.85)", border: "rgba(36, 109, 203, 1)" }, // Royal Blue
  { bg: "rgba(46, 139, 87, 0.85)", border: "rgba(46, 139, 87, 1)" }, // Sea Green
  { bg: "rgba(255, 69, 0, 0.85)", border: "rgba(255, 69, 0, 1)" }, // Orange Red
  { bg: "rgba(148, 0, 211, 0.85)", border: "rgba(148, 0, 211, 1)" }, // Dark Violet
  { bg: "rgba(199, 21, 133, 0.85)", border: "rgba(199, 21, 133, 1)" }, // Medium Violet Red
  { bg: "rgba(255, 99, 71, 0.85)", border: "rgba(255, 99, 71, 1)" }, // Tomato
  { bg: "rgba(65, 105, 225, 0.85)", border: "rgba(65, 105, 225, 1)" }, // Royal Blue
  { bg: "rgba(220, 20, 20, 0.85)", border: "rgba(220, 20, 20, 1)" }, // Strong Red
  { bg: "rgba(255, 165, 0, 0.85)", border: "rgba(255, 165, 0, 1)" }, // Orange
  { bg: "rgba(255, 193, 7, 0.85)", border: "rgba(255, 193, 7, 1)" }, // Amber
  { bg: "rgba(76, 175, 80, 0.85)", border: "rgba(76, 175, 80, 1)" }, // Material Green
  { bg: "rgba(33, 150, 243, 0.85)", border: "rgba(33, 150, 243, 1)" }, // Material Blue
  { bg: "rgba(156, 39, 176, 0.85)", border: "rgba(156, 39, 176, 1)" }, // Purple
  { bg: "rgba(220, 20, 60, 0.8)", border: "rgba(220, 20, 60, 1)" }, // Apple Red (#DC143C)
  { bg: "rgba(233, 30, 99, 0.85)", border: "rgba(233, 30, 99, 1)" }, // Pink
  { bg: "rgba(0, 188, 212, 0.85)", border: "rgba(0, 188, 212, 1)" }, // Cyan
  { bg: "rgba(230, 81, 0, 0.85)", border: "rgba(230, 81, 0, 1)" }, // Orange 800
  { bg: "rgba(249, 168, 37, 0.85)", border: "rgba(249, 168, 37, 1)" }, // Amber 600
  { bg: "rgba(56, 142, 60, 0.85)", border: "rgba(56, 142, 60, 1)" }, // Green 700
  { bg: "rgba(30, 136, 229, 0.85)", border: "rgba(30, 136, 229, 1)" }, 
];

// Create a color map that ensures consistent colors for the same keys
const colorMap = new Map<string, { bg: string; border: string }>();

export const getColorForKey = (key: string): { bg: string; border: string } => {
  if (!colorMap.has(key)) {
    // Assign color based on current map size to ensure consistency
    const colorIndex = colorMap.size % CHART_COLORS.length;
    colorMap.set(key, CHART_COLORS[colorIndex]);
  }
  return colorMap.get(key)!;
};

// Function to reset color assignments (useful if you want to start fresh)
export const resetColorMap = () => {
  colorMap.clear();
};

// Function to pre-populate colors for a set of keys (ensures deterministic order)
export const initializeColorsForKeys = (keys: string[]) => {
  // Sort keys to ensure consistent ordering
  const sortedKeys = [...keys].sort();

  sortedKeys.forEach((key, index) => {
    if (!colorMap.has(key)) {
      const colorIndex = index % CHART_COLORS.length;
      colorMap.set(key, CHART_COLORS[colorIndex]);
    }
  });
};

// Function to get all current color assignments (useful for debugging)
export const getCurrentColorAssignments = () => {
  return Object.fromEntries(colorMap.entries());
};