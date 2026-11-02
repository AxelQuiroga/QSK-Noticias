import { describe, expect, it, vi } from "vitest";
import {
  validateGacetillas,
  hashOriginal,
  detectItemsToProcess,
  processBatch,
  loadState,
  EMPTY_STATE,
} from "../../src/editorial/gacetillas.ts";
import { ProviderError } from "../../src/editorial/errors.ts";

function mockProvider(response: string | Error) {
  return {
    name: "mock",
    complete: vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    }),
  };
}

describe("validateGacetillas", () => {
  it("acepta un listado válido", () => {
    const input = [
      { titulo: "T", descripcion: "D", urlNoticia: "https://example.com/1", imagenUrl: null, fecha: null, volanta: null },
    ];
    const out = validateGacetillas(input);
    expect(out).toHaveLength(1);
    expect(out[0]!.titulo).toBe("T");
  });

  it("rechaza no-array", () => {
    expect(() => validateGacetillas({})).toThrow();
  });

  it("rechaza título vacío", () => {
    expect(() => validateGacetillas([{ titulo: " ", descripcion: "D", urlNoticia: "https://x/1" }])).toThrow();
  });

  it("rechaza descripcion no string/null", () => {
    expect(() => validateGacetillas([{ titulo: "T", descripcion: 5, urlNoticia: "https://x/1" }])).toThrow();
  });

  it("rechaza URL inválida", () => {
    expect(() => validateGacetillas([{ titulo: "T", descripcion: "D", urlNoticia: "no-url" }])).toThrow();
  });

  it("rechaza URL duplicada", () => {
    const item = { titulo: "T", descripcion: "D", urlNoticia: "https://x/1" };
    expect(() => validateGacetillas([item, { ...item, titulo: "T2" }])).toThrow(/duplicada/i);
  });

  it("permite descripcion null", () => {
    const out = validateGacetillas([{ titulo: "T", descripcion: null, urlNoticia: "https://x/1" }]);
    expect(out[0]!.descripcion).toBeNull();
  });
});

describe("detectItemsToProcess", () => {
  const item = { titulo: "T", descripcion: "D", urlNoticia: "https://x/1", imagenUrl: null, fecha: null, volanta: null };

  it("detecta noticia nueva", () => {
    const res = detectItemsToProcess([item], [], EMPTY_STATE);
    expect(res).toHaveLength(1);
    expect(res[0]!.reason).toBe("new");
  });

  it("detecta noticia modificada", () => {
    const base = [{ ...item, descripcion: "otra" }];
    const res = detectItemsToProcess([item], base, EMPTY_STATE);
    expect(res).toHaveLength(1);
    expect(res[0]!.reason).toBe("modified");
  });

  it("no detecta sin cambios", () => {
    const base = [{ ...item }];
    const res = detectItemsToProcess([item], base, EMPTY_STATE);
    expect(res).toHaveLength(0);
  });

  it("omite si ya fue procesada con el mismo original", () => {
    const state = loadState({ version: 1, items: { "https://x/1": { originalHash: hashOriginal(item), processedAt: "2026-01-01" } } });
    const base = [{ ...item, descripcion: "otra" }]; // modified vs base
    const res = detectItemsToProcess([item], base, state);
    expect(res).toHaveLength(0);
  });
});

describe("processBatch", () => {
  const item = { titulo: "T", descripcion: "D original", urlNoticia: "https://x/1", imagenUrl: "https://img", fecha: "2026-10-01", volanta: "V", fuente: "gba", slug: "t" };

  it("reescribe solo descripcion y preserva metadatos", async () => {
    const provider = mockProvider("Nueva desc.");
    const { updated, summary, changed } = await processBatch([item], EMPTY_STATE, provider);
    expect(changed).toBe(true);
    expect(summary.processed).toBe(1);
    expect(updated[0]!.descripcion).toBe("Nueva desc.");
    expect(updated[0]!.titulo).toBe(item.titulo);
    expect(updated[0]!.urlNoticia).toBe(item.urlNoticia);
    expect(updated[0]!.imagenUrl).toBe(item.imagenUrl);
    expect(updated[0]!.fecha).toBe(item.fecha);
    expect(updated[0]!.volanta).toBe(item.volanta);
    expect(updated[0]!.fuente).toBe(item.fuente);
    expect(updated[0]!.slug).toBe(item.slug);
  });

  it("omite descripciones nulas o vacías sin fallar", async () => {
    const nullItem = { ...item, descripcion: null, urlNoticia: "https://x/2" };
    const emptyItem = { ...item, descripcion: "   ", urlNoticia: "https://x/3" };
    const provider = mockProvider("ok");
    const { summary } = await processBatch([nullItem, emptyItem], EMPTY_STATE, provider);
    expect(summary.processed).toBe(0);
    expect(summary.skipped).toBe(2);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("un error individual no corrompe el resto del lote", async () => {
    const item2 = { ...item, urlNoticia: "https://x/2", descripcion: "D2" };
    const provider = {
      name: "mock",
      complete: vi.fn()
        .mockRejectedValueOnce(new ProviderError("boom", undefined, false))
        .mockResolvedValueOnce("OK2"),
    };
    const { updated, summary } = await processBatch([item, item2], EMPTY_STATE, provider);
    expect(summary.failed).toBe(1);
    expect(summary.processed).toBe(1);
    expect(updated[0]!.descripcion).toBe(item.descripcion); // conservado
    expect(updated[1]!.descripcion).toBe("OK2");
  });

  it("idempotencia: segundo procesamiento con estado guardado no llama al proveedor", async () => {
    const provider = mockProvider("Nueva desc.");
    const first = await processBatch([item], EMPTY_STATE, provider);
    const savedState = first.state;
    const provider2 = mockProvider("no debería llamarse");
    const second = await processBatch([item], savedState, provider2);
    expect(second.summary.processed).toBe(0);
    expect(second.summary.skipped).toBe(1);
    expect(second.changed).toBe(false);
    expect(provider2.complete).not.toHaveBeenCalled();
  });

  it("no reprocesa si el estado coincide", async () => {
    const state = loadState({ version: 1, items: { [item.urlNoticia]: { originalHash: hashOriginal(item), processedAt: "2026-01-01" } } });
    const provider = mockProvider("no debería llamarse");
    const { summary, changed } = await processBatch([item], state, provider);
    expect(summary.skipped).toBe(1);
    expect(summary.processed).toBe(0);
    expect(changed).toBe(false);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("no cambia campos ajenos a descripcion", async () => {
    const provider = mockProvider("Nueva.");
    const original = { ...item };
    const { updated } = await processBatch([item], EMPTY_STATE, provider);
    const restOriginal = { ...original } as Record<string, unknown>;
    delete restOriginal.descripcion;
    const restUpdated = { ...updated[0]! } as Record<string, unknown>;
    delete restUpdated.descripcion;
    expect(restUpdated).toEqual(restOriginal);
    expect(restUpdated).toEqual(restOriginal);
  });
});

describe("loadState", () => {
  it("carga estado válido", () => {
    const s = loadState({ version: 1, items: { "u": { originalHash: "h", processedAt: "t" } } });
    expect(s.items["u"]!.originalHash).toBe("h");
  });

  it("estado null/vacío devuelve vacío", () => {
    expect(loadState(null).items).toEqual({});
    expect(loadState(undefined).items).toEqual({});
  });

  it("rechaza estado inválido", () => {
    expect(() => loadState("x")).toThrow();
    expect(() => loadState({ items: "x" })).toThrow();
  });
});

