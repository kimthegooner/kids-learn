import { mkdir, copyFile, readdir, stat, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const vendor = path.join(root, "public/camera/mediapipe");
const source = path.join(root, "node_modules/@mediapipe/tasks-vision");
await mkdir(path.join(vendor, "wasm"), { recursive: true });
await copyFile(path.join(source, "vision_bundle.js"), path.join(vendor, "vision_bundle.js"));
for (const file of await readdir(path.join(source, "wasm"))) {
  if (/\.(js|wasm)$/.test(file)) await copyFile(path.join(source, "wasm", file), path.join(vendor, "wasm", file));
}
const models = [
  ["face_landmarker.task", "face_landmarker/face_landmarker/float16/1/face_landmarker.task"],
  ["pose_landmarker_lite.task", "pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"],
];
await mkdir(path.join(root, "public/camera/models"), { recursive: true });
for (const [name, remote] of models) {
  const target = path.join(root, "public/camera/models", name);
  if ((await stat(target).catch(() => null))?.size > 1000000) { console.log(`${name}: ready`); continue; }
  const response = await fetch(`https://storage.googleapis.com/mediapipe-models/${remote}`, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000000) throw new Error(`${name}: incomplete model`);
  await writeFile(`${target}.part`, bytes); await rename(`${target}.part`, target);
  console.log(`${name}: ${(bytes.length / 1048576).toFixed(1)} MB`);
}
console.log("Camera assets ready. All inference assets are served locally.");
