import { describe, expect, it, vi } from "vitest";
import { buildUserContent } from "../../src/editorial/prompt.ts";
import {
  rewriteDescription,
  rewriteNoticia,
  runEditorialEngine,
  CloudflareWorkersAiProvider,
  EditorialEngineError,
  ProviderError,
} from "../../src/editorial/index.ts";
import { isRewritable } from "../../src/editorial/validation.ts";

function mockProvider(response: string | Error) {
  return {
    name: "mock",
    complete: vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    }),
  };
}

describe("rewriteDescription - contrato y preservación", () => {
  it("reescribe solo 'descripcion' y preserva el resto", async () => {
    const input = {
      titulo: "La Provincia entregó premio",
      descripcion: "La ceremonia fue encabezada por el gobernador.",
      imagenUrl: "https://example.com/img.jpg",
      urlNoticia: "https://example.com/nota",
      fecha: null,
      volanta: "CULTURA",
      fuente: "gba",
      slug: "la-provincia-entrego-premio",
    };
    const provider = mockProvider("El gobernador encabezó la entrega del premio.");
    const result = await rewriteDescription(input, { provider });

    expect(result.field).toBe("descripcion");
    expect(result.description).toBe("El gobernador encabezó la entrega del premio.");
    expect(result.output.descripcion).toBe("El gobernador encabezó la entrega del premio.");
    for (const key of Object.keys(input)) {
      if (key !== "descripcion") {
        expect(result.output[key]).toEqual(input[key as keyof typeof input]);
      }
    }
    expect(Object.keys(result.output).sort()).toEqual(Object.keys(input).sort());
  });

  it("soporta campo 'description' (inglés) y lo preserva", async () => {
    const input = { title: "X", description: "Original desc.", url: "https://x" };
    const provider = mockProvider("Nueva desc.");
    const result = await rewriteDescription(input, { provider });
    expect(result.field).toBe("description");
    expect(result.output.description).toBe("Nueva desc.");
    expect(result.output.title).toBe("X");
    expect(result.output.url).toBe("https://x");
  });

  it("rechaza entrada no objeto", async () => {
    const provider = mockProvider("x");
    await expect(rewriteDescription("texto", { provider })).rejects.toBeInstanceOf(EditorialEngineError);
    await expect(rewriteDescription(null, { provider })).rejects.toBeInstanceOf(EditorialEngineError);
    await expect(rewriteDescription([1, 2], { provider })).rejects.toBeInstanceOf(EditorialEngineError);
  });

  it("rechaza entrada sin campo de descripción", async () => {
    const provider = mockProvider("x");
    await expect(rewriteDescription({ titulo: "X" }, { provider })).rejects.toMatchObject({ code: "MISSING_DESCRIPTION_FIELD" });
  });

  it("rechaza descripción vacía", async () => {
    const provider = mockProvider("x");
    await expect(rewriteDescription({ descripcion: "   " }, { provider })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rechaza salida vacía del proveedor", async () => {
    const provider = mockProvider("   ");
    await expect(rewriteDescription({ descripcion: "algo" }, { provider })).rejects.toMatchObject({ code: "RETRIES_EXHAUSTED" });
  });

  it("rechaza salida que supera el máximo", async () => {
    const long = "a".repeat(300);
    const provider = mockProvider(long);
    await expect(rewriteDescription({ descripcion: "algo" }, { provider, maxAdditionalDescriptionLength: 46 })).rejects.toMatchObject({ code: "RETRIES_EXHAUSTED" });
  });

  it("rechaza salida que es solo fence", async () => {
    const provider = mockProvider("```");
    await expect(rewriteDescription({ descripcion: "algo" }, { provider })).rejects.toBeInstanceOf(EditorialEngineError);
  });

  it("reintenta ante respuesta inválida y tiene éxito", async () => {
    const provider = {
      name: "mock",
      complete: vi.fn()
        .mockResolvedValueOnce("   ")
        .mockResolvedValueOnce("Descripción válida."),
    };
    const result = await rewriteDescription({ descripcion: "original" }, { provider, maxRetries: 2 });
    expect(result.description).toBe("Descripción válida.");
    expect(result.attempts).toBe(2);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it("agota reintentos y lanza RETRIES_EXHAUSTED", async () => {
    const provider = mockProvider("   ");
    await expect(rewriteDescription({ descripcion: "original" }, { provider, maxRetries: 1 })).rejects.toMatchObject({ code: "RETRIES_EXHAUSTED" });
  });

  it("no reintenta errores permanentes del proveedor", async () => {
    const provider = {
      name: "mock",
      complete: vi.fn(async () => {
        throw new ProviderError("credenciales inválidas", undefined, false);
      }),
    };
    await expect(rewriteDescription({ descripcion: "original" }, { provider, maxRetries: 2 })).rejects.toBeInstanceOf(ProviderError);
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("extrae descripción desde respuesta JSON del proveedor", async () => {
    const provider = mockProvider('{"descripcion":"Desde JSON."}');
    const result = await rewriteDescription({ descripcion: "orig" }, { provider });
    expect(result.description).toBe("Desde JSON.");
  });

  it("rechaza si el proveedor falta", async () => {
    // @ts-expect-error missing provider
    await expect(rewriteDescription({ descripcion: "x" }, {})).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("aliases exportados funcionan", async () => {
    const provider = mockProvider("ok");
    const r1 = await rewriteNoticia({ descripcion: "orig" }, { provider });
    const r2 = await runEditorialEngine({ descripcion: "orig" }, { provider });
    expect(r1.description).toBe("ok");
    expect(r2.description).toBe("ok");
  });

  it("rechaza si ambos campos de descripción aparecen simultáneamente", async () => {
    const provider = mockProvider("ok");
    await expect(
      rewriteDescription({ descripcion: "a", description: "b" }, { provider }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("no modifica título, slug, URL ni otros campos", async () => {
    const input = {
      titulo: "Título original",
      descripcion: "Descripción original.",
      slug: "titulo-original",
      urlNoticia: "https://example.com/nota",
      fuente: "gba",
      fecha: "2026-10-20",
    };
    const provider = mockProvider("Nueva descripción.");
    const result = await rewriteDescription(input, { provider });
    expect(result.output.titulo).toBe("Título original");
    expect(result.output.slug).toBe("titulo-original");
    expect(result.output.urlNoticia).toBe("https://example.com/nota");
    expect(result.output.fuente).toBe("gba");
    expect(result.output.fecha).toBe("2026-10-20");
    expect(result.output.descripcion).toBe("Nueva descripción.");
  });

  it("omitir descripciones nulas/vacías es decisión del caller (isRewritable)", async () => {
    expect(isRewritable({ descripcion: "algo" })).toBe(true);
    expect(isRewritable({ descripcion: "   " })).toBe(false);
    expect(isRewritable({ descripcion: null })).toBe(false);
    expect(isRewritable({ titulo: "X" })).toBe(false);
  });
});

describe("buildUserContent", () => {
  it("envía solo título y descripción", () => {
    const input = {
      titulo: "T",
      descripcion: "D",
      imagenUrl: "https://x",
      urlNoticia: "https://y",
      slug: "s",
    };
    const content = buildUserContent(input, "descripcion");
    expect(content).toContain("Título: T");
    expect(content).toContain("Descripción original: D");
    expect(content).not.toContain("imagenUrl");
    expect(content).not.toContain("urlNoticia");
    expect(content).not.toContain("slug");
  });

  it("soporta campos en inglés", () => {
    const input = { title: "T", description: "D" };
    const content = buildUserContent(input, "description");
    expect(content).toContain("Título: T");
    expect(content).toContain("Descripción original: D");
  });
});

describe("límite dinámico de descripción", () => {
  it("calcula el máximo como longitud original + 100", async () => {
    const original = "a".repeat(150);
    const rewritten = "b".repeat(250);
    const provider = mockProvider(rewritten);
    const result = await rewriteDescription({ descripcion: original }, { provider });
    expect(result.description).toBe(rewritten);
  });

  it("acepta una respuesta exactamente en el límite", async () => {
    const original = "a".repeat(150);
    const rewritten = "b".repeat(250);
    const provider = mockProvider(rewritten);
    const result = await rewriteDescription({ descripcion: original }, { provider, maxAdditionalDescriptionLength: 100 });
    expect(result.description).toBe(rewritten);
  });

  it("rechaza una respuesta que excede el límite por un carácter", async () => {
    const original = "a".repeat(150);
    const rewritten = "b".repeat(251);
    const provider = mockProvider(rewritten);
    await expect(rewriteDescription({ descripcion: original }, { provider, maxAdditionalDescriptionLength: 100 })).rejects.toMatchObject({ code: "RETRIES_EXHAUSTED" });
  });

  it("maneja distintas longitudes originales", async () => {
    for (const len of [150, 280, 350, 600]) {
      const original = "a".repeat(len);
      const rewritten = "b".repeat(len + 100);
      const provider = mockProvider(rewritten);
      const result = await rewriteDescription({ descripcion: original }, { provider });
      expect(result.description).toBe(rewritten);
    }
  });

  it("verifica que el prompt recibe el máximo dinámico", async () => {
    const original = "a".repeat(150);
    const provider = mockProvider("ok");
    await rewriteDescription({ descripcion: original }, { provider });
    const calls = (provider.complete as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const call = (calls[0]?.[0] ?? {}) as { user?: string };
    expect(call?.user).toContain("Máximo permitido: 250 caracteres");
  });

  it("verifica que el motor utiliza el mismo máximo para validar", async () => {
    const original = "a".repeat(150);
    const rewritten = "b".repeat(251);
    const provider = mockProvider(rewritten);
    await expect(rewriteDescription({ descripcion: original }, { provider })).rejects.toBeInstanceOf(EditorialEngineError);
  });

  it("preserva todos los metadatos originales con límite dinámico", async () => {
    const original = "a".repeat(150);
    const item = { titulo: "T", descripcion: original, slug: "s", urlNoticia: "https://x/1" };
    const rewritten = "b".repeat(200);
    const provider = mockProvider(rewritten);
    const result = await rewriteDescription(item, { provider });
    expect(result.output.titulo).toBe("T");
    expect(result.output.slug).toBe("s");
    expect(result.output.urlNoticia).toBe("https://x/1");
  });

  it("mantiene el límite de entrada de 4000 caracteres", async () => {
    const original = "a".repeat(4001);
    const provider = mockProvider("ok");
    await expect(rewriteDescription({ descripcion: original }, { provider })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("mantiene reintentos ante respuestas inválidas", async () => {
    const original = "a".repeat(150);
    const provider = {
      name: "mock",
      complete: vi.fn()
        .mockResolvedValueOnce("   ")
        .mockResolvedValueOnce("b".repeat(250)),
    };
    const result = await rewriteDescription({ descripcion: original }, { provider, maxAdditionalDescriptionLength: 100 });
    expect(result.attempts).toBe(2);
  });
});

describe("CloudflareWorkersAiProvider", () => {
  it("parsea respuesta estándar", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ success: true, result: { response: "Hola." } }), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = new CloudflareWorkersAiProvider({ token: "t", accountId: "a", fetchFn });
    const out = await provider.complete({ system: "s", user: "u" });
    expect(out).toBe("Hola.");
  });

  it("parsea choices", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ result: { choices: [{ message: { content: "Chau." } }] } }), { status: 200 }));
    const provider = new CloudflareWorkersAiProvider({ token: "t", accountId: "a", fetchFn });
    const out = await provider.complete({ system: "s", user: "u" });
    expect(out).toBe("Chau.");
  });

  it("lanza ProviderError en HTTP error", async () => {
    const fetchFn = vi.fn(async () => new Response("bad", { status: 401 }));
    const provider = new CloudflareWorkersAiProvider({ token: "t", accountId: "a", fetchFn });
    await expect(provider.complete({ system: "s", user: "u" })).rejects.toBeInstanceOf(ProviderError);
  });

  it("respeta timeout", async () => {
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const provider = new CloudflareWorkersAiProvider({ token: "t", accountId: "a", fetchFn, timeoutMs: 10 });
    await expect(provider.complete({ system: "s", user: "u" })).rejects.toMatchObject({ message: expect.stringContaining("Timeout") });
  });

  it("lanza ProviderError si faltan credenciales", () => {
    const prevToken = process.env.CLOUDFLARE_API_TOKEN;
    const prevAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    expect(() => new CloudflareWorkersAiProvider({})).toThrow(ProviderError);
    if (prevToken) process.env.CLOUDFLARE_API_TOKEN = prevToken;
    if (prevAccount) process.env.CLOUDFLARE_ACCOUNT_ID = prevAccount;
  });
});
