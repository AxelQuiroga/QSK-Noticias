import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/noticias',
  }),
  schema: z.object({
    title: z.string().min(1, 'El titular es obligatorio'),
    description: z.string().min(1, 'La bajada es obligatoria'),
    slug: z
      .string()
      .min(1, 'El slug es obligatorio')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe ser URL-friendly'),
    section: z.string().min(1, 'La sección es obligatoria'),
    municipality: z.string().min(1, 'El municipio es obligatoria'),
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
  }),
});

export const collections = { news };
