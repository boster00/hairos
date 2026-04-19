/**
 * Custom CSS / "custom styles" mode for Content Magic — cookie is source of truth (same as editor).
 * No cookie or "0" => off; "1" or "true" => on.
 */

const CUSTOM_CSS_MODE_COOKIE = "cjgeo_custom_css_mode";
const CUSTOM_CSS_MODE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export function getCustomCssModeFromCookie() {
  if (typeof document === "undefined") {
    return false;
  }
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CUSTOM_CSS_MODE_COOKIE}=`))
    ?.split("=")[1];
  return value === "1" || value === "true";
}

export function setCustomCssModeCookie(enabled) {
  if (typeof document === "undefined") return;
  const value = enabled ? "1" : "0";
  document.cookie = `${CUSTOM_CSS_MODE_COOKIE}=${value}; path=/; max-age=${CUSTOM_CSS_MODE_MAX_AGE}; SameSite=Lax`;
}
