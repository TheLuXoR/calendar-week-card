import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCardHeight } from "../src/card-height.js";

function withCssSupport(supportedValues, callback) {
    const previousCss = globalThis.CSS;
    globalThis.CSS = {
        supports(property, value) {
            return property === "height" && supportedValues.has(value);
        }
    };

    try {
        callback();
    } finally {
        if (previousCss === undefined) {
            delete globalThis.CSS;
        } else {
            globalThis.CSS = previousCss;
        }
    }
}

test("empty height values keep parent-controlled sizing", () => {
    assert.equal(normalizeCardHeight(undefined), null);
    assert.equal(normalizeCardHeight(null), null);
    assert.equal(normalizeCardHeight("   "), null);
});

test("valid CSS height values are trimmed and returned", () => {
    const supported = new Set(["500px", "70vh", "calc(100vh - 64px)"]);
    withCssSupport(supported, () => {
        assert.equal(normalizeCardHeight(" 500px "), "500px");
        assert.equal(normalizeCardHeight("70vh"), "70vh");
        assert.equal(normalizeCardHeight("calc(100vh - 64px)"), "calc(100vh - 64px)");
    });
});

test("numbers without CSS units are rejected", () => {
    withCssSupport(new Set(["0"]), () => {
        assert.throws(() => normalizeCardHeight(500), /CSS value with units/);
        assert.throws(() => normalizeCardHeight("500"), /Invalid card height/);
        assert.throws(() => normalizeCardHeight("0"), /Invalid card height/);
    });
});

test("unsupported CSS height values are rejected", () => {
    withCssSupport(new Set(), () => {
        assert.throws(() => normalizeCardHeight("tall"), /Invalid card height/);
        assert.throws(() => normalizeCardHeight("500px; color: red"), /Invalid card height/);
    });
});
