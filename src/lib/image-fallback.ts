/**
 * Muestra un marcador de posición cuando una imagen externa no carga,
 * en lugar de dejar el ícono de imagen rota del navegador.
 *
 * Las imágenes diferidas pueden no tener src hasta que se acercan al
 * área visible del carrusel. En ese caso se registra el error antes de
 * asignar src, y se evita confundir la ausencia temporal de src con un fallo.
 */
export function guardExternalImage(image: HTMLImageElement, fallbackSelector: string): void {
  const showFallback = (): void => {
    image.classList.add('hidden');
    image.parentElement?.querySelector<HTMLElement>(fallbackSelector)?.classList.remove('hidden');
  };

  image.addEventListener('error', showFallback, { once: true });

  if (!image.hasAttribute('src')) return;

  // Los scripts de Astro pueden ejecutarse después de que una imagen ya falló.
  if (image.complete && image.naturalWidth === 0) {
    showFallback();
  }
}
