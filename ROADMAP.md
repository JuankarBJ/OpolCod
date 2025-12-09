# Roadmap del Proyecto OpolCod

Este documento detalla los planes de mejora y evolución para el Codificador de Infracciones.

## 🚀 Corto Plazo (Optimizaciones Inmediatas)

- [ ] **Refactorización de Código JS**: Unificar la lógica de carga de datos (fetch de `config.json`) que actualmente se duplica en `script.js` e `index_script.js`.
- [ ] **Limpieza de Archivos**: Evaluar la necesidad de `infraccion.html` en producción o moverlo a una carpeta de `dev/` o `tests/`.
- [ ] **Mejora de Rendimiento**: Implementar caché local (localStorage) para evitar descargas repetitivas de `config.json` si no ha cambiado.
- [ ] **Validación de Datos**: Scripts para validar que los JSONs de normas cumplan con el esquema esperado y evitar errores en tiempo de ejecución.

## 🌟 Medio Plazo (Nuevas Funcionalidades)

- [ ] **Modo Offline (PWA)**: Convertir la web en una Progressive Web App (PWA) para que pueda instalarse en móviles/tablets y funcionar sin internet (muy útil para patrullas).
- [ ] **Favoritos/Marcadores**: Permitir al usuario marcar infracciones frecuentes para acceso rápido.
- [ ] **Búsqueda Avanzada**: Implementar "fuzzy search" (búsqueda difusa) para tolerar errores tipográficos en las búsquedas.
- [ ] **Historial de Búsquedas**: Guardar las últimas búsquedas realizadas.
- [ ] **Modo Oscuro/Claro**: Aunque el diseño actual es oscuro, ofrecer un toggle para modo claro (mejor visibilidad bajo luz solar directa).

## 🔭 Largo Plazo (Evolución)

- [ ] **Panel de Administración**: Crear una interfaz gráfica (Admin Dashboard) para gestionar `config.json` y las ordenanzas sin tocar código JSON manualmente.
- [ ] **Backend Real**: Si el proyecto crece, migrar de archivos JSON estáticos a una base de datos real (Firebase, Supabase o SQL) con una API.
- [ ] **Login de Usuarios**: Si se requiere gestionar permisos o configuraciones por usuario.
