import { mkdir, writeFile } from "node:fs/promises";
import { rewriteDescription, CloudflareWorkersAiProvider } from "../src/editorial/index.ts";

const dataset = [
  {
    titulo: "La Provincia entregó el premio Hebe Uhart de Novela 2026",
    descripcion: "La ceremonia fue encabezada por el gobernador. El concurso promueve la creatividad artística y fomenta la escritura y la producción cultural.",
  },
  {
    titulo: "Kicillof encabezó la presentación del programa “Empleo Verde Joven”",
    descripcion: "La iniciativa está destinada a promover la formación técnica y la inserción laboral de jóvenes en el sector de las energías renovables.",
  },
  {
    titulo: "Se entregó el crédito N°500.000 de Provincia Microcréditos",
    descripcion: "Fue en un encuentro encabezado por el gobernador. La empresa del Banco Provincia alcanzó este hito tras haber otorgado más de 260.000 préstamos en los últimos seis años.",
  },
];

function validateResult(original, result) {
  if (!result || typeof result !== "object") return "Resultado inválido.";
  const output = result.output;
  if (!output || typeof output !== "object") return "Falta output.";
  // Mismas claves.
  const originalKeys = Object.keys(original).sort();
  const outputKeys = Object.keys(output).sort();
  if (JSON.stringify(originalKeys) !== JSON.stringify(outputKeys)) {
    return `Las claves cambiaron: ${originalKeys.join(",")} vs ${outputKeys.join(",")}`;
  }
  // Solo descripcion puede cambiar.
  for (const key of originalKeys) {
    if (key === "descripcion" || key === "description") continue;
    if (JSON.stringify(original[key]) !== JSON.stringify(output[key])) {
      return `El campo '${key}' fue alterado.`;
    }
  }
  const field = Object.prototype.hasOwnProperty.call(original, "descripcion") ? "descripcion" : "description";
  const nueva = output[field];
  if (typeof nueva !== "string" || nueva.trim().length === 0) {
    return "La descripción reescrita está vacía.";
  }
  if (nueva.length > 280) {
    return `La descripción reescrita supera 280 caracteres (${nueva.length}).`;
  }
  if (nueva === original[field]) {
    return "La descripción no cambió (posible fallo del motor).";
  }
  return null;
}

const provider = new CloudflareWorkersAiProvider();
const outDir = new URL("../examples/prueba-real/", import.meta.url);
await mkdir(outDir, { recursive: true });

const resultados = [];
let fallos = 0;

for (const [i, item] of dataset.entries()) {
  const registro = { indice: i + 1, original: item };
  try {
    const result = await rewriteDescription(item, { provider });
    const errorValidacion = validateResult(item, result);
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }
    registro.respuestaModelo = result.description;
    registro.final = result.output;
    registro.intentos = result.attempts;
    registro.estado = "ok";
  } catch (error) {
    registro.estado = "error";
    registro.error = error instanceof Error ? error.message : String(error);
    fallos++;
    console.error(`Caso ${i + 1} falló: ${registro.error}`);
  }
  resultados.push(registro);
  await writeFile(new URL(`caso-${i + 1}.json`, outDir), JSON.stringify(registro, null, 2) + "\n", "utf8");
}

await writeFile(new URL("resumen.json", outDir), JSON.stringify({ total: dataset.length, exitosos: dataset.length - fallos, fallidos: fallos, resultados }, null, 2) + "\n", "utf8");

console.log(JSON.stringify({ total: dataset.length, exitosos: dataset.length - fallos, fallidos: fallos }, null, 2));

if (fallos > 0) {
  console.error(`La prueba real falló en ${fallos} de ${dataset.length} casos.`);
  process.exit(1);
}
console.log("Prueba real completada correctamente en los 3 casos.");
