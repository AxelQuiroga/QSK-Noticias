// Declaración ambiente mínima para js-yaml.
// El paquete no incluye tipos y no queremos agregar @types/js-yaml.
declare module 'js-yaml' {
  export function load(input: string, options?: unknown): unknown;
  export function dump(input: unknown, options?: unknown): string;
  export function safeDump(input: unknown, options?: unknown): string;

  const jsYaml: {
    load: (input: string, options?: unknown) => unknown;
    dump: (input: unknown, options?: unknown) => string;
    safeDump: (input: unknown, options?: unknown) => string;
  };

  export default jsYaml;
}