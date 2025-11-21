import { copyFile, mkdir, readFile, writeFile } from "fs/promises";
import { exec, spawn } from "child_process";
import path from "path";
import vm from "vm";
import { fileURLToPath, pathToFileURL } from "url";

const copyToClipboard = text =>
    new Promise(res => exec(`printf "${text}" | pbcopy`, () => res()));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const outputFile = path.join(distDir, "calendar-week-card.js");
const hacsOutputFile = path.join(rootDir, "calendar-week-card.js");

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

function stripModuleSyntax(source) {
    return source
        .replace(/^\s*import[^;]*;\s*/gm, "")
        .replace(/export\s+default\s+/g, "")
        .replace(/export\s+(?=class|function|const|let|var)/g, "")
        .replace(/export\s+\{[^}]+\};?/g, "");
}

async function collectModule(relativePath, visited, sections) {
    const absolutePath = path.join(srcDir, relativePath);
    if (visited.has(absolutePath)) {
        return;
    }

    visited.add(absolutePath);
    const source = await readFile(absolutePath, "utf8");
    const module = new vm.SourceTextModule(source, {
        identifier: pathToFileURL(absolutePath).href
    });

    for (const specifier of module.dependencySpecifiers) {
        if (!specifier.startsWith(".")) {
            continue;
        }

        const resolvedUrl = new URL(specifier, module.identifier);
        const resolvedPath = path.relative(srcDir, fileURLToPath(resolvedUrl));
        await collectModule(resolvedPath, visited, sections);
    }

    sections.push(`// File: ${relativePath}\n${stripModuleSyntax(source).trim()}\n`);
}

async function createBundle() {
    const visited = new Set();
    const sections = [];
    await collectModule("index.js", visited, sections);
    return sections.join("\n");
}

async function ensureVmModules() {
    if (process.execArgv.includes("--experimental-vm-modules")) {
        return null;
    }

    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [
            "--experimental-vm-modules",
            fileURLToPath(import.meta.url)
        ], {
            stdio: "inherit",
            env: process.env
        });

        child.on("exit", code => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(new Error(`Build failed with exit code ${code}`));
            }
        });
    });
}

async function build() {
    const delegated = await ensureVmModules();
    if (delegated !== null) {
        return;
    }

    await mkdir(distDir, { recursive: true });

    const banner = "// Calendar Week Card – generated bundle";
    const footer = "export { CalendarWeekCard };";
    const bundle = await createBundle();
    const output = [banner, bundle, footer].filter(Boolean).join("\n\n");

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
