export const IMPACT_WEIGHTS = {
  populationDensity: 0.35,
  vulnerableShare: 0.3,
  servicePressure: 0.2,
  mobilitySensitivity: 0.15,
} as const;

export const IMPACT_DENSITY_MIN = 0;
export const IMPACT_DENSITY_MAX = 15000;
export const IMPACT_PRIORITY_FACTOR = 0.2;
