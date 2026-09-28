import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import ts from "typescript";

// Run after `npm run build`, then open /camera-check.html on the local preview.
// These QA-only files are not in public/ and disappear on the next build.
await mkdir("out/camera-qa", { recursive: true });
for (const name of ["camera", "camera-artwork", "camera-draw"]) {
  const code = await readFile(`lib/${name}.ts`, "utf8");
  const compiled = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 } }).outputText;
  await writeFile(`out/camera-qa/${name}.js`, compiled.replace('from "./camera"', 'from "./camera.js"'));
}
await copyFile("tests/camera-browser.html", "out/camera-check.html");
console.log("Open http://localhost:3001/camera-check.html to verify actual model output and all face effects.");
