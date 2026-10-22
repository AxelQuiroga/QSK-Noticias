import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

/**
 * Lee las dimensiones intrínsecas de una imagen local bajo `/images/noticias/`.
 *
 * Se usa en tiempo de compilación (componentes de Astro) para asignar
 * `width`/`height` y reservar espacio antes de que la imagen cargue, evitando
 * cambios de diseño (CLS). Devuelve `null` si el archivo no existe.
 */
export async function imageDimensions(src: string): Promise<{ width: number; height: number } | null> {
  const filePath = resolve(process.cwd(), 'public', src.slice(1));
  if (!existsSync(filePath)) return null;

  const metadata = await sharp(filePath).metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height) return null;
  return { width, height };
}
