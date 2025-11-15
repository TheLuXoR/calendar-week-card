const nothing = Symbol("cwc-lit-nothing");

class TemplateResult {
    constructor(strings, values) {
        this.strings = strings;
        this.values = values;
    }
}

class CSSResult {
    constructor(strings, values) {
        this.cssText = strings.reduce((acc, chunk, index) => {
            const value = index < values.length ? values[index] : "";
            return acc + chunk + (value ?? "");
        }, "");
    }
}

const html = (strings, ...values) => new TemplateResult(strings, values);
const css = (strings, ...values) => new CSSResult(strings, values);

function resolveValue(value) {
    if (value === nothing || value === null || value === undefined || value === false) {
        return [];
    }

    if (value instanceof TemplateResult) {
        return Array.from(renderTemplate(value).childNodes);
    }

    if (Array.isArray(value)) {
        return value.flatMap(resolveValue);
    }

    if (value instanceof Node) {
        return [value.cloneNode(true)];
    }

    return [document.createTextNode(String(value))];
}

function buildInstruction(strings, values) {
    const instructions = [];
    let markup = "";

    for (let i = 0; i < values.length; i += 1) {
        let chunk = strings[i];
        const bindingMatch = chunk.match(/([@\.]?)([a-zA-Z0-9:_-]+)=$/);
        if (bindingMatch) {
            const [match, prefix, name] = bindingMatch;
            chunk = chunk.slice(0, chunk.length - match.length);
            markup += chunk;
            let attrName = "";
            if (prefix === ".") {
                attrName = `data-lit-prop-${i}`;
                instructions.push({ type: "property", name, index: i });
            } else if (prefix === "@") {
                attrName = `data-lit-event-${i}`;
                instructions.push({ type: "event", name, index: i });
            } else {
                attrName = `data-lit-attr-${i}`;
                instructions.push({ type: "attribute", name, index: i });
            }
            markup += ` ${attrName}="1"`;
            continue;
        }

        markup += chunk;
        markup += `<!--lit:${i}-->`;
        instructions.push({ type: "node", index: i });
    }

    markup += strings[strings.length - 1];
    return { markup, instructions };
}

function renderTemplate(result) {
    if (!(result instanceof TemplateResult)) {
        throw new Error("Template rendering expects a TemplateResult.");
    }

    const { markup, instructions } = buildInstruction(result.strings, result.values);
    const templateEl = document.createElement("template");
    templateEl.innerHTML = markup;
    const fragment = templateEl.content;

    const commentMap = new Map();
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_COMMENT, null);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const match = node.data.match(/^lit:(\d+)$/);
        if (match) {
            commentMap.set(Number(match[1]), node);
        }
    }

    const findElement = (attr) => fragment.querySelector(`[${attr}]`);

    for (const instruction of instructions) {
        const value = result.values[instruction.index];
        if (instruction.type === "node") {
            const comment = commentMap.get(instruction.index);
            if (!comment || !comment.parentNode) continue;
            const nodes = resolveValue(value);
            if (!nodes.length) {
                comment.parentNode.removeChild(comment);
            } else {
                nodes.forEach((node) => comment.parentNode.insertBefore(node, comment));
                comment.parentNode.removeChild(comment);
            }
            continue;
        }

        if (instruction.type === "attribute") {
            const attr = `data-lit-attr-${instruction.index}`;
            const element = findElement(attr);
            if (!element) continue;
            element.removeAttribute(attr);
            if (value === nothing || value === null || value === undefined || value === false) {
                element.removeAttribute(instruction.name);
            } else {
                element.setAttribute(instruction.name, String(value));
            }
            continue;
        }

        if (instruction.type === "property") {
            const attr = `data-lit-prop-${instruction.index}`;
            const element = findElement(attr);
            if (!element) continue;
            element.removeAttribute(attr);
            element[instruction.name] = value;
            continue;
        }

        if (instruction.type === "event") {
            const attr = `data-lit-event-${instruction.index}`;
            const element = findElement(attr);
            if (!element) continue;
            element.removeAttribute(attr);
            if (typeof value === "function") {
                element.addEventListener(instruction.name, value);
            }
        }
    }

    return fragment;
}

class LitElement extends HTMLElement {
    constructor() {
        super();
        this.renderRoot = this.attachShadow({ mode: "open" });
        this.__updateScheduled = false;
    }

    connectedCallback() {
        this.requestUpdate();
    }

    requestUpdate() {
        if (this.__updateScheduled) {
            return;
        }
        this.__updateScheduled = true;
        Promise.resolve().then(() => {
            this.__updateScheduled = false;
            this.update();
        });
    }

    update() {
        if (!this.renderRoot) {
            this.renderRoot = this.attachShadow({ mode: "open" });
        }
        const result = typeof this.render === "function" ? this.render() : nothing;
        this.renderRoot.innerHTML = "";
        this.__applyStyles();
        if (result === nothing || result === null || result === undefined) {
            return;
        }
        if (result instanceof TemplateResult) {
            this.renderRoot.appendChild(renderTemplate(result));
        } else if (result instanceof Node) {
            this.renderRoot.appendChild(result);
        } else if (Array.isArray(result)) {
            const fragment = document.createDocumentFragment();
            result.forEach((value) => {
                resolveValue(value).forEach((node) => fragment.appendChild(node));
            });
            this.renderRoot.appendChild(fragment);
        } else {
            this.renderRoot.textContent = String(result);
        }
    }

    __applyStyles() {
        const styles = this.constructor?.styles;
        if (!styles) {
            return;
        }
        const toCssText = (style) => {
            if (style instanceof CSSResult) {
                return style.cssText;
            }
            if (Array.isArray(style)) {
                return style.map(toCssText).join("\n");
            }
            return style ?? "";
        };
        const cssText = Array.isArray(styles)
            ? styles.map(toCssText).join("\n")
            : toCssText(styles);
        if (!cssText) {
            return;
        }
        const styleEl = document.createElement("style");
        styleEl.textContent = cssText;
        this.renderRoot.appendChild(styleEl);
    }
}

export { LitElement, html, css, nothing };
