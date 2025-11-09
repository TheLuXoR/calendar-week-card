const HEX_PATTERN = /^#([0-9a-fA-F]{3,8})$/;

function clampColorValue(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

export function resolveColorValue(color, resolverElement) {
    if (color === undefined || color === null) {
        return null;
    }

    if (typeof color === "number" && Number.isFinite(color)) {
        return `#${Math.round(color).toString(16).padStart(6, "0")}`;
    }

    if (typeof color !== "string") {
        return null;
    }

    const trimmed = color.trim();
    if (!trimmed) {
        return null;
    }

    if (HEX_PATTERN.test(trimmed) || trimmed.startsWith("rgb")) {
        return trimmed;
    }

    if (!resolverElement) {
        return trimmed;
    }

    resolverElement.style.backgroundColor = trimmed;
    const computed = getComputedStyle(resolverElement).backgroundColor;
    resolverElement.style.backgroundColor = "";

    if (computed && computed !== "rgba(0, 0, 0, 0)") {
        return computed;
    }

    return trimmed;
}

export function parseRGB(color, resolverElement) {
    const resolved = resolveColorValue(color, resolverElement);
    if (!resolved) {
        return null;
    }

    const hexMatch = resolved.match(HEX_PATTERN);
    if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split("").map(ch => ch + ch).join("");
        }

        if (hex.length >= 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return { r, g, b };
        }
    }

    const rgbMatch = resolved.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
        const parts = rgbMatch[1]
            .split(",")
            .map(part => part.trim())
            .slice(0, 3)
            .map(part => {
                if (part.endsWith("%")) {
                    const percent = parseFloat(part);
                    return clampColorValue((Number.isFinite(percent) ? percent : 0) * 2.55);
                }
                const numeric = parseFloat(part);
                return clampColorValue(Number.isFinite(numeric) ? numeric : 0);
            });

        if (parts.length === 3 && parts.every(Number.isFinite)) {
            const [r, g, b] = parts;
            return { r, g, b };
        }
    }

    return null;
}

export function rgbToString(rgb) {
    if (!rgb) {
        return null;
    }

    const { r, g, b } = rgb;
    return `rgb(${clampColorValue(r)}, ${clampColorValue(g)}, ${clampColorValue(b)})`;
}

export function rgbToHex(rgb) {
    if (!rgb) {
        return null;
    }

    const { r, g, b } = rgb;
    const toHex = value => clampColorValue(value).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mixColors(colorA, colorB, weight = 0.5, resolverElement) {
    const rgbA = parseRGB(colorA, resolverElement);
    const rgbB = parseRGB(colorB, resolverElement);

    if (!rgbA && !rgbB) {
        return null;
    }
    if (!rgbA) {
        return rgbToString(rgbB);
    }
    if (!rgbB) {
        return rgbToString(rgbA);
    }

    const w = Math.max(0, Math.min(1, Number(weight)));
    const r = rgbA.r * (1 - w) + rgbB.r * w;
    const g = rgbA.g * (1 - w) + rgbB.g * w;
    const b = rgbA.b * (1 - w) + rgbB.b * w;
    return rgbToString({ r, g, b });
}

export function getRelativeLuminance({ r, g, b }) {
    const toLinear = value => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getReadableTextColor(color, fallback = "#ffffff", resolverElement) {
    const rgb = parseRGB(color, resolverElement);
    if (!rgb) {
        return fallback;
    }

    const luminance = getRelativeLuminance(rgb);
    return luminance > 0.57 ? "#1f1f1f" : "#ffffff";
}

export function getHexColor(color, fallback = "#4287f5", resolverElement) {
    const rgb = parseRGB(color, resolverElement);
    if (rgb) {
        return rgbToHex(rgb);
    }

    const fallbackRgb = parseRGB(fallback, resolverElement);
    if (fallbackRgb) {
        return rgbToHex(fallbackRgb);
    }

    return "#4287f5";
}
