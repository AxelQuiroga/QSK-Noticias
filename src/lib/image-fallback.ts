/**
 * Muestra un marcador de posición cuando una imagen externa no carga,
 * en lugar de dejar el ícono de imagen rota del navegador.
 *
 * Los <script> de Astro son módulos diferidos: una imagen lazy puede
 * fallar antes de que el script se ejecute, por eso también se revisa
 * el estado ya asentado (complete sin tamaño natural = fallo de carga).
 */
export function guardExternalImage(image: HTMLImageElement, fallbackSelector: string): void {
  const showFallback = (): void => {
    image.classList.add('hidden');
    image.parentElement?.querySelector<HTMLElement>(fallbackSelector)?.classList.remove('hidden');
  };

  if (image.complete && image.naturalWidth === 0) {
    showFallback();
    return;
  }

  image.addEventListener('error', showFallback, { once: true });
}
