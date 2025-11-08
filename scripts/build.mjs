import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const outputFile = path.join(distDir, "calendar-week-card.js");

function stripExports(source) {
    return source
        .replace(/export\s+default\s+/g, "")
        .replace(/export\s+class\s+/g, "class ")
        .replace(/export\s+const\s+/g, "const ")
        .replace(/export\s+function\s+/g, "function ")
        .replace(/export\s+\{[^}]+\};?/g, "");
}

function stripImports(source) {
    return source.replace(/^import[^;]+;\n?/gm, "").trimStart();
}

async function readSource(relativePath) {
    const filePath = path.join(srcDir, relativePath);
    return readFile(filePath, "utf8");
}

function wrapSection(title, content) {
    const trimmed = content.trim();
    return trimmed ? `// ${title}\n${trimmed}` : "";
}

async function build() {
    const [localizationSource, colorsSource, cardSource] = await Promise.all([
        readSource("localization.js"),
        readSource("colors.js"),
        readSource("calendar-week-card.js")
    ]);

    const localization = stripExports(localizationSource);
    const colors = stripExports(colorsSource);
    const card = stripImports(stripExports(cardSource));

    const banner = "// Calendar Week Card – generated bundle";
    const registration = [
        "if (!customElements.get(\"calendar-week-card\")) {",
        "    customElements.define(\"calendar-week-card\", CalendarWeekCard);",
        "}",
        "",
        "export { CalendarWeekCard };"
    ].join("\n");

    const sections = [
        banner,
        wrapSection("Localization", localization),
        wrapSection("Color utilities", colors),
        wrapSection("Calendar week card", card),
        registration
    ].filter(Boolean);

    await mkdir(distDir, { recursive: true });
    await writeFile(outputFile, sections.join("\n\n") + "\n", "utf8");

    console.log(`Built ${path.relative(rootDir, outputFile)}`);
}

build().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
