import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { isKnownLocationName, type LocationType } from "./data/locations";
import { isKnownSection, isKnownTopic } from "./data/sections";
import { isValidNewsImageSrc, newsImageFileExists } from "./lib/news-image";
import { COUNTRY_CODES } from "./lib/international";
/**
 * Campos geográficos del frontmatter y el tipo de ubicación que deben
 * referenciar dentro del catálogo (`src/data/locations.ts`). Evita cadenas
 * libres: un `municipality: "AMBA"` (que es una región) o un municipio
 * inexistente rompen el build en vez de generar enlaces rotos en silencio.
 *
 * Lo mismo vale para `section`: se valida contra el catálogo editorial
 * (`src/data/sections.ts`), que es la fuente de verdad de las rutas
 * `/secciones/*`. Una sección fuera del catálogo generaría tarjetas que
 * enlazan a una ruta que no existe.
 */
const GEO_FIELDS: ReadonlyArray<{
  field: "municipality" | "localidad" | "region" | "provincia";
  type: LocationType;
}> = [
  { field: "municipality", type: "municipio" },
  { field: "localidad", type: "localidad" },
  { field: "region", type: "region" },
  { field: "provincia", type: "provincia" },
];

const news = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/noticias",
  }),
  schema: z
    .object({
      title: z.string().min(1, "El titular es obligatorio"),
      description: z.string().min(1, "La bajada es obligatoria"),
      slug: z
        .string()
        .min(1, "El slug es obligatorio")
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug debe ser URL-friendly"),
      primaryTopic: z.string().optional(),
      secondaryTopics: z
        .array(z.string())
        .optional()
        .default([])
        .refine((topics) => topics.length === 0 || topics.every(isKnownTopic), {
          message:
            "Los topics secundarios deben ser topics del catálogo editorial.",
        }),
      section: z.string().min(1, "La sección es obligatoria").optional(),
      municipality: z.string().optional(),
      localidad: z.string().optional(),
      region: z.string().optional(),
      provincia: z.string().optional(),
      country: z
        .string()
        .refine(
          (code) => Object.hasOwn(COUNTRY_CODES, code),
          "El código de país no existe en COUNTRY_CODES",
        )
        .optional(),
      scope: z.enum(["local", "regional", "provincial", "nacional", "internacional"]).optional(),
      author: z.string().min(1, "El autor es obligatorio"),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      status: z.enum(["draft", "review", "published"]),
      featured: z.boolean().default(false),
      sources: z
        .array(
          z.object({
            name: z.string().min(1),
            url: z.url(),
            description: z.string().optional(),
          }),
        )
        .default([]),
      image: z
        .object({
          src: z
            .string()
            .trim()
            .min(1, "La ruta de la imagen es obligatoria")
            .refine(isValidNewsImageSrc, "Ruta no válida")
            .refine(
              (src) => newsImageFileExists(src),
              "El archivo debe existir",
            ),
          alt: z.string().trim().min(1, "El alt text es obligatorio"),
          attribution: z.string().optional(),
        })
        .optional(), // ← Nota: .optional() a secas, NO es un array

      // ✅ 2. GALERÍA: Debe ser un ARRAY (.optional().default([]))
      gallery: z
        .array(
          z.object({
            src: z
              .string()
              .trim()
              .min(1, "La ruta de la imagen es obligatoria")
              .refine(isValidNewsImageSrc, "Ruta no válida")
              .refine(
                (src) => newsImageFileExists(src),
                "El archivo debe existir",
              ),
            alt: z.string().trim().min(1, "El alt text es obligatorio"),
            attribution: z.string().optional(),
          }),
        )
        .optional()
        .default([]),
    })
    .superRefine((data, ctx) => {
      // Validate primaryTopic is a known topic (if present)
      if (data.primaryTopic && !isKnownTopic(data.primaryTopic)) {
        ctx.addIssue({
          code: "custom",
          path: ["primaryTopic"],
          message: `"${data.primaryTopic}" no es un topic del catálogo editorial (src/data/sections.ts).`,
        });
      }

      // Validate secondaryTopics are known topics and don't duplicate primaryTopic
      if (data.secondaryTopics && data.secondaryTopics.length > 0) {
        if (!data.secondaryTopics.every(isKnownTopic)) {
          ctx.addIssue({
            code: "custom",
            path: ["secondaryTopics"],
            message:
              "Los topics secundarios deben ser topics del catálogo editorial.",
          });
        }
        // Check that secondary topics don't duplicate the primary topic
        const primaryTopicIsInSecondaries = data.secondaryTopics?.includes(
          data.primaryTopic as string,
        );
        if (primaryTopicIsInSecondaries) {
          ctx.addIssue({
            code: "custom",
            path: ["secondaryTopics"],
            message:
              "Un topic no puede ser tanto primary como secondary. Elige uno como primary y los otros como secundarios.",
          });
        }
      }

      // International is a geographic scope, not an editorial topic.
      if (data.scope === "internacional" && !data.country) {
        ctx.addIssue({
          code: "custom",
          path: ["country"],
          message: "Las noticias de alcance internacional deben indicar el país principal (country).",
        });
      }
      if (data.country && data.scope !== "internacional") {
        ctx.addIssue({
          code: "custom",
          path: ["scope"],
          message: "El campo country solo puede usarse con scope: internacional.",
        });
      }

      // Validate section is required for published articles
      if (data.status === "published" && !data.section) {
        ctx.addIssue({
          code: "custom",
          path: ["section"],
          message: "La sección es obligatoria para artículos publicados.",
        });
      }

      // Validate section against known sections (for backward compatibility during migration)
      if (data.section && !isKnownSection(data.section)) {
        ctx.addIssue({
          code: "custom",
          path: ["section"],
          message: `"${data.section}" no es una sección del catálogo editorial (src/data/sections.ts).`,
        });
      }

      for (const { field, type } of GEO_FIELDS) {
        const value = data[field];
        if (value === undefined) continue;
        if (!isKnownLocationName(value, type)) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `"${value}" no es un ${type} del catálogo de ubicaciones (src/data/locations.ts).`,
          });
        }
      }
    }),
});

export const collections = { news };
