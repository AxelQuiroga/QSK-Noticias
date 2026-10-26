/**
 * Configuración de navegación
 * Mantiene las rutas existentes y agrega Internacional
 */

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

/**
 * Items de navegación principal
 * - Las rutas existentes permanecen intactas
 * - Se agrega `/internacional/` como nueva sección
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Inicio',
    href: '/',
    description: 'Página principal',
  },
  {
    label: 'Noticias Locales',
    href: '/noticias/',
    description: 'Cobertura de Zona Sur',
  },
  {
    label: 'Internacional',
    href: '/internacional/',
    description: 'Noticias del mundo',
  },
  // Agrega aquí otras secciones si existen (Política, Deportes, etc)
  // sin modificar sus URLs
];

/**
 * Rutas protegidas
 * Si necesitas validar que las rutas no cambien
 */
export const PROTECTED_ROUTES = [
  '/',
  '/noticias/',
  // Agrega aquí otras rutas existentes que no deben cambiar
] as const;

/**
 * Nueva ruta internacional
 */
export const INTERNATIONAL_ROUTE = '/internacional/' as const;

/**
 * Metadata para la página de Internacional
 */
export const INTERNATIONAL_PAGE_META = {
  title: 'Internacional | QSK Noticias',
  description: 'Noticias internacionales: cobertura global de actualidad',
  slug: 'internacional',
} as const;