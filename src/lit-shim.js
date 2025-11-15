const globalScope = typeof globalThis !== "undefined"
    ? globalThis
    : (typeof window !== "undefined" ? window : undefined);

function resolveLitExports() {
    if (!globalScope) {
        throw new Error("LitElement is not available in the current environment.");
    }

    const direct = {
        LitElement: globalScope.LitElement,
        html: globalScope.html,
        css: globalScope.css,
        nothing: globalScope.nothing
    };

    if (direct.LitElement && direct.html && direct.css) {
        return {
            LitElement: direct.LitElement,
            html: direct.html,
            css: direct.css,
            nothing: direct.nothing ?? globalScope.litHtml?.nothing ?? undefined
        };
    }

    const lit = globalScope.litHtml || globalScope.lit;
    if (lit && lit.LitElement && lit.html && lit.css) {
        return {
            LitElement: lit.LitElement,
            html: lit.html,
            css: lit.css,
            nothing: lit.nothing ?? undefined
        };
    }

    throw new Error("Unable to locate LitElement. Please ensure Home Assistant exposes Lit on the window object.");
}

const { LitElement, html, css, nothing } = resolveLitExports();

export { LitElement, html, css, nothing };
