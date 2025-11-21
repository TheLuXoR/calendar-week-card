export const THEME_VARIABLES = {
    light: {
        "--cwc-primary-text": "#1f1f1f",
        "--cwc-secondary-text": "#5f6368",
        "--cwc-background": "#ffffff",
        "--cwc-surface": "#ffffff",
        "--cwc-surface-alt": "#f5f7fa",
        "--cwc-week-bg": "#ffffff",
        "--cwc-timebar-bg": "#f5f7fa",
        "--cwc-timebar-text": "#1f1f1f",
        "--cwc-border-color": "rgba(0, 0, 0, 0.08)",
        "--cwc-button-bg": "rgba(66, 135, 245, 0.08)",
        "--cwc-button-bg-hover": "rgba(66, 135, 245, 0.15)",
        "--cwc-settings-icon-hover": "rgba(0, 0, 0, 0.08)",
        "--cwc-event-shadow": "5px 3px 5px rgba(15, 15, 30, 0.7)",
        "--cwc-event-border": "rgba(255, 255, 255, 0.35)",
        "--cwc-time-line-glow": "rgba(255, 59, 48, 0.35)",
        "--cwc-time-line-dot-border": "rgba(255, 255, 255, 0.85)",
        "--cwc-overlay": "rgba(0, 0, 0, 0.5)",
        "--cwc-dialog-background": "#ffffff",
        "--cwc-dialog-text": "#333333",
        "--cwc-dialog-muted": "#555555",
        "--cwc-dialog-divider": "rgba(0, 0, 0, 0.08)",
        "--cwc-today-glow": "rgba(77, 150, 255, 0.18)"
    },
    dark: {
        "--cwc-primary-text": "#f5f7ff",
        "--cwc-secondary-text": "#c4c8d2",
        "--cwc-background": "#11151c",
        "--cwc-surface": "#181c24",
        "--cwc-surface-alt": "#1f2430",
        "--cwc-week-bg": "#181c24",
        "--cwc-timebar-bg": "#1f2430",
        "--cwc-timebar-text": "#f5f7ff",
        "--cwc-border-color": "rgba(255, 255, 255, 0.12)",
        "--cwc-button-bg": "rgba(77, 150, 255, 0.12)",
        "--cwc-button-bg-hover": "rgba(77, 150, 255, 0.2)",
        "--cwc-settings-icon-hover": "rgba(255, 255, 255, 0.08)",
        "--cwc-event-shadow": "3px 2px 8px rgba(0, 0, 0, 0.85)",
        "--cwc-event-border": "rgba(255, 255, 255, 0.25)",
        "--cwc-time-line-glow": "rgba(255, 92, 70, 0.55)",
        "--cwc-time-line-dot-border": "rgba(17, 21, 28, 0.95)",
        "--cwc-overlay": "rgba(0, 0, 0, 0.65)",
        "--cwc-dialog-background": "#1b1f2a",
        "--cwc-dialog-text": "#e3e8ff",
        "--cwc-dialog-muted": "#b0b6c9",
        "--cwc-dialog-divider": "rgba(255, 255, 255, 0.12)",
        "--cwc-today-glow": "rgba(77, 150, 255, 0.35)"
    }
};

export const THEME_ACCENT_FALLBACK = {
    light: "#ff3b30",
    dark: "#ff453a"
};

export function getThemePalette(theme) {
    return THEME_VARIABLES[theme] || THEME_VARIABLES.light;
}

export function resolveAccent(theme, readCssColor) {
    const fallback = THEME_ACCENT_FALLBACK[theme] || THEME_ACCENT_FALLBACK.light;
    if (typeof readCssColor === "function") {
        const cssAccent = readCssColor("--accent-color", fallback);
        return cssAccent || fallback;
    }
    return fallback;
}

export function applyThemeVariables(target, theme, readCssColor) {
    const palette = getThemePalette(theme);
    Object.entries(palette).forEach(([variable, value]) => {
        target.style.setProperty(variable, value);
    });
    target.style.setProperty("--cwc-time-line-color", resolveAccent(theme, readCssColor));
}
