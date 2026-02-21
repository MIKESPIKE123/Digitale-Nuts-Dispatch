type EnvValue = string | boolean | undefined;
type EnvBag = Record<string, EnvValue>;

function toBoolean(value: EnvValue, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

const env = (import.meta as ImportMeta & { env: EnvBag }).env;

export interface IntegrationFlags {
  useMockWorks: boolean;
  useMockGipod: boolean;
  useMockASign: boolean;
  useMockKlm: boolean;
}

export const INTEGRATION_FLAGS: IntegrationFlags = Object.freeze({
  useMockWorks: toBoolean(env.VITE_USE_MOCK_WORKS, false),
  useMockGipod: toBoolean(env.VITE_USE_MOCK_GIPOD, false),
  useMockASign: toBoolean(env.VITE_USE_MOCK_ASIGN, false),
  useMockKlm: toBoolean(env.VITE_USE_MOCK_KLM, false),
});
