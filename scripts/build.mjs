import { mkdir, readFile, writeFile, copyFile } from "fs/promises";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const copyToClipboard = text =>
    new Promise(res => exec(`printf "${text}" | pbcopy`, () => res()));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const outputFile = path.join(distDir, "calendar-week-card.js");
const hacsOutputFile = path.join(rootDir, "calendar-week-card.js");

const IMPORT_PATTERN = /import\s+(?:[^'";]+?from\s+)?["']([^"']+)["'];?|import\s+["']([^"']+)["'];?/g;
const EXPORT_DECL_PATTERN = /export\s+(?=class|function|const|let|var)/g;
const EXPORT_DEFAULT_PATTERN = /export\s+default\s+/g;
const EXPORT_LIST_PATTERN = /export\s+\{[^}]+\};?/g;

async function getBuildNumber() {
    const file = path.join(rootDir, "scripts/build-number.txt");
    try {
        const current = parseInt(await readFile(file, "utf8"), 10);
        const next = (isNaN(current) ? 1 : current + 1);
        await writeFile(file, String(next));
        return next;
    } catch {
        await writeFile(file, "1");
        return 1;
    }
}

function resolveDependency(currentFile, specifier) {
    if (!specifier || !specifier.startsWith(".")) {
        return null;
    }

    const currentDir = path.dirname(currentFile);
    const withExtension = specifier.endsWith(".js") ? specifier : `${specifier}.js`;
    const resolved = path.normalize(path.join(currentDir, withExtension));
    return resolved;
}

function transformSource(source) {
    const dependencies = [];
    const withoutImports = source.replace(IMPORT_PATTERN, (match, fromA, fromB) => {
        const specifier = fromA || fromB;
        dependencies.push(specifier);
        return "";
    });

    const withoutExports = withoutImports
        .replace(EXPORT_DEFAULT_PATTERN, "")
        .replace(EXPORT_DECL_PATTERN, "")
        .replace(EXPORT_LIST_PATTERN, "");

    return {
        code: withoutExports.trimStart(),
        dependencies
    };
}

async function bundleFile(entry) {
    const visited = new Set();
    const sections = [];

    async function visit(relativePath) {
        if (visited.has(relativePath)) {
            return;
        }
        visited.add(relativePath);

        const absolutePath = path.join(srcDir, relativePath);
        const source = await readFile(absolutePath, "utf8");
        const { code, dependencies } = transformSource(source);

        for (const rawDependency of dependencies) {
            const resolved = resolveDependency(relativePath, rawDependency);
            if (resolved) {
                await visit(resolved);
            }
        }

        sections.push(`// File: ${relativePath}\n${code.trim()}\n`);
    }

    await visit(entry);
    return sections.join("\n");
}

async function build() {
    await mkdir(distDir, { recursive: true });
    const bundle = await bundleFile("index.js");

    const banner = "// Calendar Week Card – generated bundle";
    const output = [banner, bundle].filter(Boolean).join("\n\n");

    await writeFile(outputFile, `${output}\n`, "utf8");
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
