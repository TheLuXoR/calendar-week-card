import { mkdir, readFile, writeFile, copyFile } from "fs/promises";
import { exec } from "child_process";
const copyToClipboard = text =>
    new Promise(res => exec(`printf "${text}" | pbcopy`, () => res()));

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");

// dist output (wie vorher)
const outputFile = path.join(distDir, "calendar-week-card.js");

// zusätzlich: Ziel für HACS (Repo-Root)
const hacsOutputFile = path.join(rootDir, "calendar-week-card.js");

async function getBuildNumber() {
    const file = path.join(rootDir, "scripts/build-number.txt");
    try {
        const current = parseInt(await readFile(file, "utf8"), 10);
        const next = (isNaN(current) ? 1 : current + 1);
        await writeFile(file, String(next));
        return next;
    } catch {
        // Datei existiert nicht → neu anlegen mit 1
        await writeFile(file, "1");
        return 1;
    }
}

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
    const [localizationSource, colorsSource, litShimSource, cardSource] = await Promise.all([
        readSource("localization.js"),
        readSource("colors.js"),
        readSource("lit-shim.js"),
        readSource("calendar-week-card.js")
    ]);

    const localization = stripExports(localizationSource);
    const colors = stripExports(colorsSource);
    const litShim = stripImports(stripExports(litShimSource));
    const card = stripImports(stripExports(cardSource));

    const banner = "// Calendar Week Card – generated bundle";

    const sections = [
        banner,
        wrapSection("Localization", localization),
        wrapSection("Color utilities", colors),
        wrapSection("Lit shim", litShim),
        wrapSection("Calendar week card", card)
    ].filter(Boolean);

    await mkdir(distDir, { recursive: true });
    await writeFile(outputFile, sections.join("\n\n") + "\n", "utf8");

    // *** HIER: Datei zusätzlich an HACS-Ziel kopieren ***
    await copyFile(outputFile, hacsOutputFile);

    console.log(`Built ${path.relative(rootDir, outputFile)}`);
    console.log(`Copied for HACS → ${path.relative(rootDir, hacsOutputFile)}`);

    const buildNumber = await getBuildNumber();
    const versionedPath = `/local/calendar-week-card/calendar-week-card.js?v=${buildNumber}`;
    await copyToClipboard(versionedPath);
    console.log("\nPath:");
    console.log(versionedPath);

}

build().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
