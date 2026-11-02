import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  validateGacetillas,
  loadState,
  processBatch,
  EMPTY_STATE,
} from "../src/editorial/gacetillas.ts";

const gacetillasPath = process.env.GACETILLAS_PATH || "/tmp/qsk-pr/src/data/gacetillas.json";
const statePath = process.env.STATE_PATH || "/tmp/qsk-pr/data/editorial-state.json";
const basePath = process.env.BASE_GACETILLAS_PATH || new URL("../src/data/gacetillas.json", import.meta.url).pathname;

async function readJson(path) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

const currentRaw = await readJson(gacetillasPath);
if (currentRaw === null) {
  console.error(`No se encontró ${gacetillasPath}`);
  process.exit(1);
}
const current = validateGacetillas(currentRaw);

const baseRaw = await readJson(basePath);
const base = baseRaw === null ? null : validateGacetillas(baseRaw);

const stateRaw = await readJson(statePath);
const state = loadState(stateRaw ?? EMPTY_STATE);

// Proveedor Cloudflare.
const { CloudflareWorkersAiProvider } = await import("../src/editorial/provider.ts");
const provider = new CloudflareWorkersAiProvider();

const { updated, state: newState, summary, changed } = await processBatch(current, state, provider, {
  maxDescriptionLength: 280,
  maxRetries: 2,
  base,
});

console.log(JSON.stringify({ summary, changed }, null, 2));

if (changed) {
  await writeJson(gacetillasPath, updated);
  await writeJson(statePath, newState);
  console.log(`Actualizado: ${gacetillasPath}`);
  console.log(`Estado: ${statePath}`);
} else {
  console.log("Sin cambios que procesar.");
}

if (summary.failed > 0) {
  console.error(`Procesamiento con ${summary.failed} fallo(s) de ${summary.total}.`);
  process.exit(1);
}
