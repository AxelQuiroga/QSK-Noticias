// Declaración ambiente mínima para js-yaml.
// El paquete no incluye tipos y no queremos agregar @types/js-yaml como dependencia.
// Sólo se declara lo que usa el proyecto (load en los tests).
declare module 'js-yaml' {
  export function load(input: string, options?: unknown): unknown;
  export function dump(input: unknown, options?: unknown): string;
  const jsYaml: {
    load: (input: string, options?: unknown) => unknown;
    dump: (input: unknown, options?: unknown) => string;
  };
  export default jsYaml;
}
