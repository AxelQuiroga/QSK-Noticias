# Módulo meteorológico de QSK Noticias

El widget de portada muestra condiciones actuales para CABA y municipios de Zona Sur. Los datos se solicitan a una Cloudflare Pages Function para mantener la clave del proveedor fuera del navegador y del repositorio.

## Configuración en Cloudflare Pages

1. Crear una cuenta gratuita en WeatherAPI.com y obtener una API key.
2. En Cloudflare, abrir el proyecto Pages de QSK Noticias.
3. Ir a **Settings → Variables and Secrets** (el nombre puede variar según la interfaz).
4. Añadir `WEATHER_API_KEY` como secreto para producción y, si corresponde, para Preview.
5. Volver a desplegar el proyecto.

No colocar la clave en `src/`, en variables `PUBLIC_*` ni en archivos versionados.

## Funcionamiento

- La ruta `/api/weather?location=<id>` valida la localidad contra una lista permitida.
- La clave se utiliza exclusivamente desde `functions/api/weather.ts`.
- Las respuestas se pueden cachear en el edge durante 30 minutos.
- El widget consulta las localidades al cargar la portada y permite actualizar manualmente; reintenta cada 30 minutos mientras la página permanezca abierta.
- La probabilidad de lluvia representa el máximo informado para las próximas tres horas.
- Si falta la clave o el proveedor falla, el widget muestra un estado no disponible en lugar de inventar datos.

## Proveedor y atribución

Se utiliza WeatherAPI.com. El plan gratuito permite usos comerciales según sus términos publicados, requiere atribución visible y exige un aviso de que los datos son orientativos. Revisar periódicamente los términos y límites vigentes del proveedor:

- https://www.weatherapi.com/terms
- https://www.weatherapi.com/pricing.aspx

El widget incluye la atribución y un aviso de uso orientativo. No debe presentarse como una estación meteorológica local ni como fuente oficial de alertas.
