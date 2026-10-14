import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { isKnownLocationName, type LocationType } from './data/locations';

/**
 * Campos geográficos del frontmatter y el tipo de ubicación que deben
 * referenciar dentro del catálogo (`src/data/locations.ts`). Evita cadenas
 * libres: un `municipality: "AMBA"` (que es una región) o un municipio
 * inexistente rompen el build en vez de generar enlaces rotos en silencio.
 */
const GEO_FIELDS: ReadonlyArray<{ field: 'municipality' | 'localidad' | 'region'; type: LocationType }> = [
  { field: 'municipality', type: 'municipio' },
  { field: 'localidad', type: 'localidad' },
  { field: 'region', type: 'region' },
];

const news = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/noticias',
  }),
  schema: z
    .object({
      title: z.string().min(1, 'El titular es obligatorio'),
      description: z.string().min(1, 'La bajada es obligatoria'),
      slug: z
        .string()
        .min(1, 'El slug es obligatorio')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe ser URL-friendly'),
      section: z.string().min(1, 'La sección es obligatoria'),
      municipality: z.string().optional(),
      localidad: z.string().optional(),
      region: z.string().optional(),
      scope: z.enum(['local', 'regional', 'provincial', 'nacional']).optional(),
      author: z.string().min(1, 'El autor es obligatorio'),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      status: z.enum(['draft', 'review', 'published']),
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
          src: z.string(),
          alt: z.string().min(1, 'El alt text es obligatorio si hay imagen'),
          attribution: z.string().optional(),
        })
        .optional(),
    })
    .superRefine((data, ctx) => {
      for (const { field, type } of GEO_FIELDS) {
        const value = data[field];
        if (value === undefined) continue;
        if (!isKnownLocationName(value, type)) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `"${value}" no es un ${type} del catálogo de ubicaciones (src/data/locations.ts).`,
          });
        }
      }
    }),
});

export const collections = { news };
