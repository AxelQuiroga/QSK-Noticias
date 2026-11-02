import { createHash } from "node:crypto";
import { rewriteDescription } from "./engine.ts";
import { isRewritable } from "./validation.ts";
import type { LlmProvider } from "./provider.ts";

export interface Gacetilla {
  titulo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  urlNoticia: string;
  fecha: string | null;
  volanta: string | null;
  fuente?: string;
  slug?: string;
  cuerpo?: string | null;
  [key: string]: unknown;
}

export interface EditorialStateItem {
  originalHash: string;
  processedAt: string;
}

export interface EditorialState {
  version: number;
  items: Record<string, EditorialStateItem>;
}

export interface ProcessSummary {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  errors: Array<{ urlNoticia: string; error: string }>;
}

export interface BatchResult {
  updated: Gacetilla[];
  state: EditorialState;
  summary: ProcessSummary;
  changed: boolean;
}

export const EMPTY_STATE: EditorialState = { version: 1, items: {} };

export function loadState(raw: unknown): EditorialState {
  if (raw === null || raw === undefined) return { version: 1, items: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Estado editorial inválido: debe ser un objeto.");
  }
  const obj = raw as Record<string, unknown>;
  const itemsRaw = obj.items;
  const items: Record<string, EditorialStateItem> = {};
  if (itemsRaw !== undefined) {
    if (typeof itemsRaw !== "object" || itemsRaw === null || Array.isArray(itemsRaw)) {
      throw new Error("Estado editorial inválido: 'items' debe ser un objeto.");
    }
    for (const [key, value] of Object.entries(itemsRaw as Record<string, unknown>)) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Estado editorial inválido para '${key}'.`);
      }
      const v = value as Record<string, unknown>;
      if (typeof v.originalHash !== "string" || typeof v.processedAt !== "string") {
        throw new Error(`Estado editorial inválido para '${key}': faltan campos.`);
      }
      items[key] = { originalHash: v.originalHash, processedAt: v.processedAt };
    }
  }
  return { version: typeof obj.version === "number" ? obj.version : 1, items };
}

export function validateGacetillas(input: unknown): Gacetilla[] {
  if (!Array.isArray(input)) {
    throw new Error("gacetillas.json debe ser un array.");
  }
  const seen = new Set<string>();
  const result: Gacetilla[] = [];
  for (const [index, item] of input.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`gacetillas[${index}] debe ser un objeto.`);
    }
    const rec = item as Record<string, unknown>;
    if (typeof rec.titulo !== "string" || rec.titulo.trim() === "") {
      throw new Error(`gacetillas[${index}].titulo debe ser un string no vacío.`);
    }
    if (rec.descripcion !== null && typeof rec.descripcion !== "string") {
      throw new Error(`gacetillas[${index}].descripcion debe ser string o null.`);
    }
    if (typeof rec.urlNoticia !== "string" || rec.urlNoticia.trim() === "") {
      throw new Error(`gacetillas[${index}].urlNoticia debe ser un string no vacío.`);
    }
    try {
      new URL(rec.urlNoticia as string);
    } catch {
      throw new Error(`gacetillas[${index}].urlNoticia no es una URL válida.`);
    }
    if (seen.has(rec.urlNoticia as string)) {
      throw new Error(`URL duplicada en gacetillas: ${rec.urlNoticia}`);
    }
    seen.add(rec.urlNoticia as string);
    // Preservar todos los campos tal cual.
    result.push({ ...(rec as Gacetilla) });
  }
  return result;
}

export function hashOriginal(item: Gacetilla): string {
  const payload = JSON.stringify({ titulo: item.titulo, descripcion: item.descripcion });
  return createHash("sha256").update(payload).digest("hex");
}

export interface DetectionResult {
  index: number;
  item: Gacetilla;
  reason: "new" | "modified";
}

export function detectItemsToProcess(
  current: Gacetilla[],
  base: Gacetilla[] | null,
  state: EditorialState,
): DetectionResult[] {
  const baseByUrl = new Map<string, Gacetilla>();
  if (base) {
    for (const item of base) baseByUrl.set(item.urlNoticia, item);
  }
  const result: DetectionResult[] = [];
  for (const [index, item] of current.entries()) {
    const baseItem = baseByUrl.get(item.urlNoticia);
    const hash = hashOriginal(item);
    const stateItem = state.items[item.urlNoticia];

    let reason: "new" | "modified" | null = null;
    if (!baseItem) {
      reason = "new";
    } else if (JSON.stringify(baseItem) !== JSON.stringify(item)) {
      reason = "modified";
    }

    // Si ya fue procesado con el mismo original, no reprocesar.
    if (stateItem && stateItem.originalHash === hash) {
      reason = null;
    }

    if (reason) {
      result.push({ index, item, reason });
    }
  }
  return result;
}

export async function processBatch(
  current: Gacetilla[],
  state: EditorialState,
  provider: LlmProvider,
  options: { maxDescriptionLength?: number; maxRetries?: number; base?: Gacetilla[] | null } = {},
): Promise<BatchResult> {
  const detected = new Set(detectItemsToProcess(current, options.base ?? null, state).map((d) => d.item.urlNoticia));
  const updated = current.map((item) => ({ ...item }));
  const newState: EditorialState = { version: state.version, items: { ...state.items } };
  const summary: ProcessSummary = { total: current.length, processed: 0, skipped: 0, failed: 0, errors: [] };

  for (let i = 0; i < current.length; i++) {
    const item = current[i]!;
    if (!isRewritable(item)) {
      summary.skipped++;
      continue;
    }
    const hash = hashOriginal(item);
    const stateItem = state.items[item.urlNoticia];
    if (stateItem && stateItem.originalHash === hash) {
      summary.skipped++;
      continue;
    }
    if (!detected.has(item.urlNoticia)) {
      summary.skipped++;
      continue;
    }

    try {
      const result = await rewriteDescription(item, {
        provider,
        maxDescriptionLength: options.maxDescriptionLength ?? 280,
        maxRetries: options.maxRetries ?? 2,
      });
      updated[i]!.descripcion = result.description;
      newState.items[item.urlNoticia] = { originalHash: hash, processedAt: new Date().toISOString() };
      summary.processed++;
    } catch (error) {
      summary.failed++;
      summary.errors.push({
        urlNoticia: item.urlNoticia,
        error: error instanceof Error ? error.message : String(error),
      });
      // Conservar descripción original.
    }
  }

  const changed = summary.processed > 0;
  return { updated, state: newState, summary, changed };
}
