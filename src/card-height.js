export function normalizeCardHeight(value) {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "string") {
        throw new Error("Card height must be a CSS value with units, for example 500px.");
    }

    const normalized = value.trim();
    if (!normalized) {
        return null;
    }

    const isBareNumber = /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized);
    const supportsHeight = typeof globalThis.CSS !== "undefined"
        && typeof globalThis.CSS.supports === "function"
        && globalThis.CSS.supports("height", normalized);
    if (isBareNumber || !supportsHeight) {
        throw new Error(`Invalid card height "${normalized}". Use a valid CSS value with units, for example 500px.`);
    }

    return normalized;
}
