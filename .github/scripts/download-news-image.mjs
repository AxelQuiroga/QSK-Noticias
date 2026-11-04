import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve('public/images/noticias');
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export function validateFilename(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+){0,11}$/.test(value)) {
    throw new Error('El nombre debe ser un slug en minúsculas, con números y guiones (sin extensión).');
  }
  return value;
}

export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', extension: 'webp' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp' && /^(avif|avis)$/.test(buffer.toString('ascii', 8, 12))) {
    return { mime: 'image/avif', extension: 'avif' };
  }
  throw new Error('El archivo descargado no tiene una firma JPEG, PNG, WebP o AVIF válida.');
}

function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return normalized !== '::' && normalized !== '::1' &&
      !normalized.startsWith('fc') && !normalized.startsWith('fd') &&
      !normalized.startsWith('fe8') && !normalized.startsWith('fe9') &&
      !normalized.startsWith('fea') && !normalized.startsWith('feb') &&
      !normalized.startsWith('ff') && !normalized.startsWith('::ffff:');
  }
  return false;
}

export async function validateSourceUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('La URL de origen no es válida.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) {
    throw new Error('La imagen debe provenir de una URL HTTPS pública, sin credenciales.');
  }
  if (isIP(url.hostname)) {
    if (!isPublicAddress(url.hostname)) throw new Error('No se permiten direcciones IP privadas o reservadas.');
  } else {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      throw new Error('El dominio no resuelve exclusivamente a direcciones IP públicas.');
    }
  }
  url.hash = '';
  return url;
}

async function readLimitedBody(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
    throw new Error(`La imagen supera el límite de ${MAX_BYTES / 1024 / 1024} MiB.`);
  }
  if (!response.body) throw new Error('La respuesta no contiene un archivo.');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error(`La imagen supera el límite de ${MAX_BYTES / 1024 / 1024} MiB.`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function fetchImage(initialUrl) {
  let currentUrl = initialUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    // Revalidar cada destino evita que una redirección apunte a una red privada.
    currentUrl = await validateSourceUrl(currentUrl.href);
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: { 'user-agent': 'QSK-Noticias-image-import/1.0' },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirect === MAX_REDIRECTS) throw new Error('La descarga excedió el límite de redirecciones.');
      currentUrl = new URL(location, currentUrl);
      continue;
    }
    if (!response.ok) throw new Error(`El servidor de imágenes respondió HTTP ${response.status}.`);
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (contentType && contentType !== 'application/octet-stream' && !ALLOWED_TYPES.has(contentType)) {
      throw new Error(`Tipo de contenido no permitido: ${contentType}.`);
    }
    const bytes = await readLimitedBody(response);
    const image = detectImageType(bytes);
    if (contentType && contentType !== 'application/octet-stream' && contentType !== image.mime) {
      throw new Error('El tipo MIME declarado no coincide con el contenido real.');
    }
    return { bytes, image, sourceUrl: currentUrl };
  }
  throw new Error('No se pudo completar la descarga.');
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta el dato obligatorio: ${name}.`);
  return value;
}

async function main() {
  const filename = validateFilename(requiredEnv('IMAGE_FILENAME'));
  const attribution = requiredEnv('IMAGE_ATTRIBUTION');
  const alt = requiredEnv('IMAGE_ALT_TEXT');
  const licenseUrl = new URL(requiredEnv('IMAGE_LICENSE_URL'));
  if (licenseUrl.protocol !== 'https:') throw new Error('La URL de licencia/autorización debe usar HTTPS.');
  if (process.env.IMAGE_RIGHTS_CONFIRMED !== 'yes') {
    throw new Error('Debés confirmar que QSK tiene autorización o una licencia compatible para reutilizar la imagen.');
  }

  const sourceUrl = await validateSourceUrl(requiredEnv('IMAGE_URL'));
  const { bytes, image, sourceUrl: finalUrl } = await fetchImage(sourceUrl);
  const outputPath = path.join(ROOT, `${filename}.${image.extension}`);
  const metadataPath = path.join(ROOT, `${filename}.meta.json`);
  await mkdir(ROOT, { recursive: true });
  await writeFile(outputPath, bytes, { flag: 'wx' });
  const metadata = {
    sourceUrl: `${finalUrl.origin}${finalUrl.pathname}`,
    downloadedAt: new Date().toISOString(),
    mimeType: image.mime,
    sizeBytes: bytes.length,
    alt,
    attribution,
    licenseUrl: licenseUrl.href,
    rightsConfirmedByWorkflowInput: true,
  };
  try {
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
  } catch (error) {
    const { unlink } = await import('node:fs/promises');
    await unlink(outputPath).catch(() => {});
    throw error;
  }
  console.log(`Imagen guardada: ${outputPath}`);
  console.log(`Metadatos guardados: ${metadataPath}`);
  console.log(`Formato: ${image.mime}; tamaño: ${bytes.length} bytes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Error al importar imagen: ${error.message}`);
    process.exitCode = 1;
  });
}
