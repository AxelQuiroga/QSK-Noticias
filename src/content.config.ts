import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { newsSchema } from "./schemas/news";

const news = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/noticias",
  }),
  schema: newsSchema,
});

export const collections = { news };