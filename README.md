# OpolCod - Codificador de Infracciones

Este repositorio contiene una aplicación web para la consulta rápida y codificada de infracciones de diversas normativas (Estatal, Autonómica y Local). Está diseñado para ser utilizado por fuerzas de seguridad u operadores que necesiten acceso rápido a la legislación actualizada.

## Estructura del Proyecto

*   **index.html**: Página de inicio (Landing Page). Permite seleccionar el área temática o la localidad.
*   **buscador.html**: La aplicación principal. Contiene el buscador, filtros (Área, Rango, Ámbito, Localidad) y el listado de infracciones.
*   **infraccion.html**: *Sandbox / Entorno de pruebas* para el diseño de las tarjetas de infracción.
*   **config.json**: Archivo de configuración principal. Contiene:
    *   Definición de Grandes Áreas (Urbanismo, Tráfico, etc.).
    *   Configuraciones generales (orden de rangos, colores).
    *   Metadatos de localidades disponibles.
    *   **Normas Globales**: Lista de infracciones de ámbito Estatal y Autonómico.
*   **data/**: Carpeta que contiene las ordenanzas específicas de cada localidad (ej. `ordenanzas_daimiel.json`).
*   **assets/**: (Si existe) Imágenes e iconos.
*   **styles.css**: Hoja de estilos principal.
*   **script.js**: Lógica principal para `buscador.html`.
*   **index_script.js**: Lógica para `index.html`.

## Cómo Usar

1.  **Abrir**: Simplemente abre el archivo `index.html` en cualquier navegador web moderno (Chrome, Firefox, Edge).
2.  **Navegación**:
    *   Desde el inicio, puedes seleccionar un Área Temática para ir directamente al buscador filtrado por esa área.
    *   O utilizar el botón "Ir al Buscador" para acceder a la herramienta completa.
3.  **Buscador**:
    *   Escribe palabras clave (ej. "animales", "ruido", "obras").
    *   Usa los filtros desplegables para refinar por Área, Rango (Ley, Ordenanza...), o Ámbito.
    *   **Localidad**: Selecciona una localidad en la barra lateral para cargar sus ordenanzas específicas.
4.  **Detalles**: Haz clic en el encabezado de una norma para desplegar sus infracciones. Usa los filtros de gravedad (Muy Grave, Grave, Leve) dentro de cada tarjeta.

## Personalización

Para agregar nuevas normas o localidades:
1.  **Normas Globales**: Edita `config.json` y añade la norma en el array `normas`.
2.  **Nueva Localidad**:
    *   Crea un archivo JSON en `data/` (ej. `mi_ciudad.json`) siguiendo la estructura de `ordenanzas_daimiel.json`.
    *   Registra la localidad en `config.json` dentro del array `localidadesMeta`.
