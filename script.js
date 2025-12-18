document.addEventListener('DOMContentLoaded', () => {

    let allInfraccionesData = []; // Contendrá todas las infracciones (globales + locales seleccionadas)
    let globalNorms = []; // Solo las normas no locales, cargadas de config.json
    let localidadesMeta = []; // Metadata de todas las localidades, de config.json
    let allGrandesAreas = {};
    let allSettings = {};
    let originalGroupedInfraccionesData = {}; // Para el contador: total de infracciones por grupo sin filtrar (de normas globales + de la localidad activa)
    let localOrdinancesCache = {}; // Caché para almacenar las ordenanzas locales ya cargadas

    let currentFilters = {
        searchTerm: '',
        areaId: '',
        rango: '',
        ambito: ''
    };
    let currentSelectedLocalityId = ''; // Almacena la ID de la localidad seleccionada actualmente

    // Mapeo de colores para los ámbitos (valores directos para asignación inline en JS)
    const ambitoColorsMap = {
        'Estatal': '#8B4513',
        'Autonómico': '#483D8B',
        'Local': '#20B2AA'
    };

    // --- FASE 1: Cargar la configuración y luego las normas individuales ---
    fetch('config.json')
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar config.json');
            return response.json();
        })
        .then(async data => { // Nota el async aquí
            localidadesMeta = data.localidadesMeta;
            allGrandesAreas = data.grandesAreas;
            allSettings = data.settings;
            // FASE 2: Cargar cada archivo de norma definido en data.normas
            // Creamos un array de promesas de fetch
            const promises = data.normas.map(metaNorma =>
                fetch(metaNorma.filePath)
                    .then(res => {
                        if (!res.ok) throw new Error(`Error cargando norma: ${metaNorma.filePath}`);
                        return res.json();
                    })
                    .then(normaData => {
                        // Procesamos la norma individualmente tal como se hacía antes
                        // Aquí transformamos sus infracciones para añadirles los metadatos necesarios
                        return normaData.infracciones.map(infraccion => ({
                            ...infraccion,
                            normagris_identificador: normaData.identificador,
                            normagris_tematica: normaData.tematica,
                            rango: normaData.rango,
                            ambito: normaData.ambito,
                            areaId: normaData.areaId,
                            modelo_sancion: normaData.modelo_sancion,
                            fecha_actualizacion: normaData.fecha_actualizacion,
                            norma: infraccion.norma || normaData.identificador
                        }));
                    })
            );
            // Esperamos a que TODAS las normas se carguen
            const results = await Promise.all(promises);

            // "Aplanamos" el resultado (porque results es un array de arrays de infracciones)
            globalNorms = results.flat();
            // Ocultar mensaje de carga
            const loadingMessage = document.querySelector('.loading-message');
            if (loadingMessage) loadingMessage.style.display = 'none';
            // Iniciar la app
            iniciarApp(allSettings, allGrandesAreas);
        })
        .catch(error => {
            console.error('Error fatal:', error);
            // ... manejo de errores
        });


    function iniciarApp(settings, grandesAreas) {

        // Selectores DOM
        const searchInput = document.querySelector('.buscador');
        const groupedInfraccionesContainer = document.querySelector('.infracciones-agrupadas');
        const areaFilterSelect = document.getElementById('area-filter');
        const rangoFilterSelect = document.getElementById('rango-filter');
        const ambitoFilterSelect = document.getElementById('ambito-filter');
        const activeFiltersContainer = document.querySelector('.active-filters-container');

        const sidebar = document.querySelector('.sidebar');
        const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        const closeSidebarBtn = document.getElementById('closeSidebarBtn');
        const scrollTopBtn = document.getElementById('scrollTopBtn');
        const showSearchBtn = document.getElementById('showSearchBtn'); // Botón de búsqueda (actualmente sin función)

        const currentLocalityDisplay = document.getElementById('current-locality-display'); // Selector del display de localidad actual
        const sidebarLocalitySelect = document.getElementById('sidebar-locality-select'); // Selector del select de localidad en sidebar


        // Mapeo de iconos para mostrar en las opciones de filtro (si aplica)
        const iconEmojiMap = {
            'building': '🏗️',
            'car': '🚗',
            'dog': '🐶',
            'handcuffs': '⛓️',
            'circus': '🎪'
        };


        // Rellenar el select de áreas
        function populateAreaFilter() {
            areaFilterSelect.innerHTML = '<option value="">Todas las Áreas</option>';
            for (const areaId in grandesAreas) {
                const areaInfo = grandesAreas[areaId];
                const option = document.createElement('option');
                option.value = areaId;

                let optionText = areaInfo.nombre;
                if (areaInfo.icon && iconEmojiMap[areaInfo.icon]) {
                    optionText = `${iconEmojiMap[areaInfo.icon]} ${areaInfo.nombre}`;
                }
                option.textContent = optionText;
                option.classList.add('area-option');
                option.style.setProperty('--area-color-option', areaInfo.color);

                areaFilterSelect.appendChild(option);
            }
        }
        populateAreaFilter();

        // Rellenar el select de rangos
        function populateRangoFilter() {
            rangoFilterSelect.innerHTML = '<option value="">Todos los Rangos</option>';
            settings.rangoOrder.forEach(rango => {
                const option = document.createElement('option');
                option.value = rango;
                option.textContent = rango;
                rangoFilterSelect.appendChild(option);
            });
        }
        populateRangoFilter();

        // Rellenar el select de ámbitos
        function populateAmbitoFilter() {
            if (ambitoFilterSelect) {
                ambitoFilterSelect.innerHTML = '<option value="">Todos los Ámbitos</option>';
                settings.ambitoOrder.forEach(ambito => {
                    const option = document.createElement('option');
                    option.value = ambito;
                    option.textContent = ambito;
                    option.classList.add('ambito-option');
                    option.style.setProperty('--ambito-color-option', `var(--color-ambito-${ambito.toLowerCase()})`);
                    ambitoFilterSelect.appendChild(option);
                });
            } else {
                console.error("Error: Elemento con ID 'ambito-filter' no encontrado.");
            }
        }
        populateAmbitoFilter();

        // Rellenar el selector de localidades en el sidebar
        function populateSidebarLocalitySelect() {
            if (sidebarLocalitySelect) {
                sidebarLocalitySelect.innerHTML = '<option value="">Todas las Localidades</option>';
                localidadesMeta.forEach(loc => {
                    const option = document.createElement('option');
                    option.value = loc.id;
                    option.textContent = loc.nombre;
                    sidebarLocalitySelect.appendChild(option);
                });
            } else {
                console.error("Error: Elemento con ID 'sidebar-locality-select' no encontrado.");
            }
        }
        populateSidebarLocalitySelect();


        // Renderizar los badges de filtros activos
        function renderActiveFilters() {
            activeFiltersContainer.innerHTML = '';

            // Badge de búsqueda por texto
            if (currentFilters.searchTerm) {
                const badge = document.createElement('span');
                badge.classList.add('filter-badge', 'text-filter-badge');
                badge.innerHTML = `Texto: "${currentFilters.searchTerm}" <button class="clear-filter-btn" data-filter-type="searchTerm">❌</button>`;
                activeFiltersContainer.appendChild(badge);
            }

            // Badge de filtro por área
            if (currentFilters.areaId) {
                const areaInfo = grandesAreas[currentFilters.areaId];
                if (areaInfo) {
                    const badge = document.createElement('span');
                    badge.classList.add('filter-badge', 'area-filter-badge');
                    badge.style.setProperty('--area-color-active-filter', areaInfo.color);
                    let badgeText = areaInfo.nombre;
                    if (areaInfo.icon && iconEmojiMap[areaInfo.icon]) {
                        badgeText = `${iconEmojiMap[areaInfo.icon]} ${areaInfo.nombre}`;
                    }
                    badge.innerHTML = `Área: ${badgeText} <button class="clear-filter-btn" data-filter-type="areaId">❌</button>`;
                    activeFiltersContainer.appendChild(badge);
                }
            }

            // Badge de filtro por rango
            if (currentFilters.rango) {
                const badge = document.createElement('span');
                badge.classList.add('filter-badge', 'rango-filter-badge');
                badge.innerHTML = `Rango: "${currentFilters.rango}" <button class="clear-filter-btn" data-filter-type="rango">❌</button>`;
                activeFiltersContainer.appendChild(badge);
            }

            // Badge de filtro por ámbito
            if (currentFilters.ambito) {
                const badge = document.createElement('span');
                badge.classList.add('filter-badge', 'ambito-filter-badge');
                badge.style.backgroundColor = ambitoColorsMap[currentFilters.ambito];
                badge.style.color = 'white';
                badge.innerHTML = `Ámbito: ${currentFilters.ambito} <button class="clear-filter-btn" data-filter-type="ambito">❌</button>`;
                activeFiltersContainer.appendChild(badge);
            }

            // Badge de localidad seleccionada
            if (currentSelectedLocalityId && currentSelectedLocalityId !== "todas_localidades") { // Asumiendo "todas_localidades" es el ID para deseleccionar
                const localityInfo = localidadesMeta.find(loc => loc.id === currentSelectedLocalityId);
                if (localityInfo) {
                    const badge = document.createElement('span');
                    badge.classList.add('filter-badge', 'locality-filter-badge'); // Clase específica para localidad
                    badge.style.backgroundColor = 'var(--color-mid-blue)'; // Puedes usar un color específico para el badge de localidad
                    badge.style.color = 'white';
                    badge.innerHTML = `Localidad: ${localityInfo.nombre}`; // CAMBIADO: Eliminado el botón "❌"
                    activeFiltersContainer.appendChild(badge);
                }
            }


            // Añadir listener a los botones de borrar filtro en los badges (delegación)
            activeFiltersContainer.querySelectorAll('.clear-filter-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const filterType = event.target.dataset.filterType;
                    if (filterType === 'searchTerm') {
                        searchInput.value = '';
                    } else if (filterType === 'areaId') {
                        areaFilterSelect.value = '';
                    } else if (filterType === 'rango') {
                        rangoFilterSelect.value = '';
                    } else if (filterType === 'ambito') {
                        ambitoFilterSelect.value = '';
                    } else if (filterType === 'localityId') { // Nuevo: limpiar filtro de localidad
                        sidebarLocalitySelect.value = ''; // Resetear el select de localidad
                        loadAndCombineNorms(''); // Recargar con "Todas las Localidades"
                        return; // Salir para que applyFilters no se llame dos veces
                    }
                    applyFilters();
                });
            });
        }


        // Crea el elemento HTML para una infracción individual
        function createInfraccionElement(data) {
            const infraccionDiv = document.createElement('div');
            const tipoClase = data.tipo === 'grave' ? 'grave' : (data.tipo === 'media' ? 'media' : 'leve');
            const modeloSancionClase = data.modelo_sancion ? `modelo-${data.modelo_sancion}` : 'modelo-estandar';

            infraccionDiv.classList.add('infraccion', tipoClase, modeloSancionClase);

            // Construcción de las píldoras de Artículo, Apartado y Opción
            let artAptoOpcHtml = '';
            let articuloAptoContent = `Art. <strong class="value">${data.articulo}</strong>`;
            if (data.apartado && data.apartado.trim() !== '') {
                articuloAptoContent += ` Apdo. <strong class="value">${data.apartado}</strong>`;
            }
            artAptoOpcHtml += `<span class="articulo-apartado-pill">${articuloAptoContent}</span>`;

            if (data.opc && data.opc.trim() !== '') {
                artAptoOpcHtml += `<span class="opcion-pill">Opc. <strong class="value">${data.opc}</strong></span>`;
            }

            const tagsHtml = data.tags && data.tags.length > 0 ? `<div class="infraccion-tags">${data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : '';

            // Construcción de las filas de importes
            let importeRowsHtml = '';
            if (data.importe) {
                importeRowsHtml += `
                    <div class="importe-row importe-principal">
                        <span class="label">Importe:</span>
                        <span class="importe">${data.importe}</span>
                    </div>
                `;
            }
            if (data.importe_reducido) {
                importeRowsHtml += `
                    <div class="importe-row reducido">
                        <span class="label">Reducida:</span>
                        <span class="importe-reducido">${data.importe_reducido}</span>
                    </div>
                `;
            }
            if (data.puntos) {
                importeRowsHtml += `
                    <div class="importe-row puntos">
                        <span class="label">Puntos:</span>
                        <span class="puntos">${data.puntos}</span>
                    </div>
                `;
            }
            const importeContainerHtml = importeRowsHtml ? `<div class="importe-container">${importeRowsHtml}</div>` : '';

            // Renderizado de la descripción con Marked.js para Markdown
            const descriptionRenderedHtml = marked.parse(data.descripcion || '');

            // Estructura final de la tarjeta de infracción
            infraccionDiv.innerHTML = `
                <div class="infraccion-header">
                    <div class="circulo">${data.circulo}</div>
                    <div class="header-info">
                        <div class="norma-display">Norma: <strong>${data.norma}</strong></div>
                        <div class="art-apto-opc-group">
                            ${artAptoOpcHtml}
                        </div>
                    </div>
                </div>
                <div class="descripcion">${descriptionRenderedHtml}</div>
                ${importeContainerHtml}
                ${tagsHtml}
            `;
            return infraccionDiv;
        }

        // Renderiza los grupos de infracciones (ya filtradas globalmente)
        function renderGroupedInfracciones(infraccionesToDisplay) {
            groupedInfraccionesContainer.innerHTML = ''; // Limpiar el contenedor principal

            // Agrupa las infracciones filtradas por norma para la visualización
            const groupedData = infraccionesToDisplay.reduce((acc, infraccion) => {
                const normaGrisKey = `${infraccion.normagris_identificador.trim()} - ${infraccion.normagris_tematica.trim()}`;
                if (!acc[normaGrisKey]) {
                    acc[normaGrisKey] = {
                        infracciones: [] // Estas son las infracciones *filtradas globalmente* para este grupo
                    };
                }
                acc[normaGrisKey].infracciones.push(infraccion);
                return acc;
            }, {});

            // Ordena los grupos por ámbito y rango
            const sortedNormaGrisKeys = Object.keys(groupedData).sort((keyA, keyB) => {
                // Obtenemos un elemento de infracción de cada grupo para acceder a ambito y rango para ordenar
                const normaInfoA = groupedData[keyA].infracciones[0];
                const normaInfoB = groupedData[keyB].infracciones[0];

                const indexA_ambito = settings.ambitoOrder.indexOf(normaInfoA.ambito);
                const indexB_ambito = settings.ambitoOrder.indexOf(normaInfoB.ambito);
                if (indexA_ambito !== indexB_ambito) return indexA_ambito - indexB_ambito;

                const indexA_rango = settings.rangoOrder.indexOf(normaInfoA.rango);
                const indexB_rango = settings.rangoOrder.indexOf(normaInfoB.rango);
                return indexA_rango - indexB_rango;
            });

            // Renderiza cada grupo de infracciones
            sortedNormaGrisKeys.forEach(normaGrisKey => {
                const groupInfo = groupedData[normaGrisKey]; // Contiene las infracciones *filtradas globalmente*
                // Obtener total original sin filtrar para el contador del grupo
                const totalInfraccionesGrupoOriginal = originalGroupedInfraccionesData[normaGrisKey]?.totalInfracciones || 0;
                const infraccionesVisiblesGlobalmenteEnGrupo = groupInfo.infracciones.length; // Coincidencias tras filtros globales

                const groupDiv = document.createElement('div');
                groupDiv.classList.add('infraccion-group');

                const groupHeader = document.createElement('div');
                groupHeader.classList.add('infraccion-group-header');

                const expandIcon = document.createElement('span');
                expandIcon.classList.add('icon');
                expandIcon.textContent = '▶';
                groupHeader.appendChild(expandIcon);

                const normaMainInfo = document.createElement('div');
                normaMainInfo.classList.add('norma-main-info');
                // Acceder a las propiedades de la norma a través de la primera infracción del grupo
                const refInfraccion = groupInfo.infracciones[0];
                const identificador = refInfraccion.normagris_identificador;
                const tematica = refInfraccion.normagris_tematica;
                const ambito = refInfraccion.ambito;
                const areaId = refInfraccion.areaId;


                const ambitoTagHtml = ambito ?
                    `<span class="ambito-tag" style="background-color: ${ambitoColorsMap[ambito] || 'transparent'}; color: white;">${ambito}</span>` : '';

                const showSeparator = ambito && identificador;
                const separatorHtml = showSeparator ? '<span class="separator">|</span>' : '';

                normaMainInfo.innerHTML = `
                    <span class="normagris-tematica">${tematica || ''}</span>
                    <div class="identificador-and-ambito">
                        ${ambitoTagHtml}
                        ${separatorHtml}
                        <span class="normagris-identificador">${identificador}</span>
                    </div>
                    <span class="norma-update-date">Actualizado: ${refInfraccion.fecha_actualizacion || 'N/A'}</span>
                `;
                groupHeader.appendChild(normaMainInfo);

                const areaInfo = grandesAreas[areaId]; // Usar areaId de la refInfraccion
                if (areaInfo) {
                    groupDiv.style.setProperty('--area-color', areaInfo.color);

                    const areaBadge = document.createElement('span');
                    areaBadge.className = 'area-badge';
                    areaBadge.textContent = areaInfo.nombre;
                    areaBadge.style.backgroundColor = areaInfo.color;
                    groupDiv.prepend(areaBadge);

                    if (areaInfo.icon) {
                        const areaIconDiv = document.createElement('div');
                        areaIconDiv.className = `area-group-icon icon-${areaInfo.icon}`;
                        areaIconDiv.dataset.icon = areaInfo.icon;
                        groupHeader.appendChild(areaIconDiv);
                    }
                }

                // El contador de infracciones del grupo
                const infraccionCounter = document.createElement('span');
                infraccionCounter.classList.add('infraccion-count');
                infraccionCounter.textContent = `${infraccionesVisiblesGlobalmenteEnGrupo} / ${totalInfraccionesGrupoOriginal}`;
                infraccionCounter.dataset.totalCount = totalInfraccionesGrupoOriginal;
                groupHeader.appendChild(infraccionCounter);


                groupDiv.appendChild(groupHeader);

                const severityFilterBar = document.createElement('div');
                severityFilterBar.classList.add('severity-filter-bar');
                severityFilterBar.innerHTML = `
                    <button class="severity-btn grave" data-severity="grave" title="Filtrar por Muy Graves"></button>
                    <button class="severity-btn media" data-severity="media" title="Filtrar por Graves"></button>
                    <button class="severity-btn leve" data-severity="leve" title="Filtrar por Leves"></button>
                `;
                groupDiv.appendChild(severityFilterBar);

                const infractionsContent = document.createElement('div');
                infractionsContent.classList.add('infracciones-content');

                // Renderizar todas las infracciones que pasaron el filtro global para este grupo
                groupInfo.infracciones.sort((a, b) => {
                    const artA = parseInt(a.articulo, 10);
                    const artB = parseInt(b.articulo, 10);
                    if (artA !== artB) return artA - artB;
                    const aptoNumA = parseInt(a.apartado, 10) || 0;
                    const aptoNumB = parseInt(b.apartado, 10) || 0;
                    const opcA = a.opc || '';
                    const opcB = b.opc || '';
                    return aptoNumA - aptoNumB || opcA.localeCompare(opcB);
                }).forEach(infraccionData => {
                    const infraccionElement = createInfraccionElement(infraccionData);
                    infractionsContent.appendChild(infraccionElement);
                });

                groupDiv.appendChild(infractionsContent);

                // Lógica para colapsar/expandir el grupo
                groupHeader.addEventListener('click', () => {
                    groupDiv.classList.toggle('open');
                    if (groupDiv.classList.contains('open')) {
                        infractionsContent.style.maxHeight = `${infractionsContent.scrollHeight}px`;
                    } else {
                        infractionsContent.style.maxHeight = null;
                        // Al cerrar, resetear filtros de gravedad y mostrar todo el contenido del grupo
                        severityFilterBar.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
                        infractionsContent.querySelectorAll('.infraccion').forEach(inf => inf.style.display = '');
                        // También resetear el contador visible a las coincidencias globales del grupo
                        infraccionCounter.textContent = `${infraccionesVisiblesGlobalmenteEnGrupo} / ${totalInfraccionesGrupoOriginal}`;
                    }
                });

                // Función para configurar el filtro de gravedad de un grupo
                function setupSeverityFilter(severityBar, infractionsContainer, counterElement) {
                    severityBar.querySelectorAll('.severity-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const clickedButton = e.currentTarget;
                            const severityToFilter = clickedButton.dataset.severity;

                            let currentVisibleCount = 0;

                            // Si ya está activo, desactiva y muestra todas las infracciones visibles por filtro global
                            if (clickedButton.classList.contains('active')) {
                                clickedButton.classList.remove('active');
                                // Contamos las que ya estaban visibles antes de este filtro de gravedad
                                infractionsContainer.querySelectorAll('.infraccion').forEach(inf => {
                                    inf.style.display = '';
                                    currentVisibleCount++;
                                });
                            } else {
                                // Desactiva otros botones y activa el clicado
                                severityBar.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
                                clickedButton.classList.add('active');

                                // Filtra las infracciones por gravedad
                                infractionsContainer.querySelectorAll('.infraccion').forEach(inf => {
                                    if (inf.classList.contains(severityToFilter)) {
                                        inf.style.display = '';
                                        currentVisibleCount++;
                                    } else {
                                        inf.style.display = 'none';
                                    }
                                });
                            }
                            // Reajusta la altura del contenedor del grupo después de filtrar/mostrar
                            infractionsContainer.style.maxHeight = `${infractionsContent.scrollHeight}px`;

                            // Actualizar el contador del grupo
                            if (counterElement) {
                                const originalTotal = counterElement.dataset.totalCount;
                                counterElement.textContent = `${currentVisibleCount} / ${originalTotal}`;
                            }
                        });
                    });
                }
                setupSeverityFilter(severityFilterBar, infractionsContent, infraccionCounter);


                groupedInfraccionesContainer.appendChild(groupDiv);
            });
        }

        // Función para cargar ordenanzas locales y combinarlas con las globales
        async function loadAndCombineNorms(selectedLocalityId) {
            // Mostrar mensaje de carga
            const mainLoadingMessage = document.querySelector('main .loading-message');
            if (mainLoadingMessage) {
                mainLoadingMessage.style.display = 'block';
                mainLoadingMessage.textContent = `Cargando ordenanzas para "${localidadesMeta.find(loc => loc.id === selectedLocalityId)?.nombre || 'Todas las Localidades'}"...`;
            }

            let currentLocalNorms = [];
            currentSelectedLocalityId = selectedLocalityId; // Actualizar la variable global de localidad seleccionada

            // Si hay una localidad seleccionada y no es "Todas las Localidades" (si tienes ese ID en tu meta)
            if (selectedLocalityId && selectedLocalityId !== 'todas_localidades') {
                const selectedLocalityMeta = localidadesMeta.find(loc => loc.id === selectedLocalityId);
                if (selectedLocalityMeta && selectedLocalityMeta.filePath) {
                    if (localOrdinancesCache[selectedLocalityMeta.id]) {
                        currentLocalNorms = localOrdinancesCache[selectedLocalityMeta.id];
                    } else {
                        try {
                            const response = await fetch(selectedLocalityMeta.filePath);
                            if (!response.ok) {
                                throw new Error(`No se pudo cargar: ${selectedLocalityMeta.filePath}`);
                            }
                            const data = await response.json();
                            // Aplanar y adjuntar propiedades padre a las infracciones locales
                            currentLocalNorms = data.localNorms.flatMap(norma => // Asumo que el JSON local tiene un array 'localNorms'
                                norma.infracciones.map(infraccion => ({
                                    ...infraccion,
                                    normagris_identificador: norma.identificador,
                                    normagris_tematica: norma.tematica,
                                    rango: norma.rango,
                                    ambito: norma.ambito, // Asegurarse de que el ámbito sea 'Local' aquí
                                    areaId: norma.areaId,
                                    modelo_sancion: norma.modelo_sancion,
                                    norma: infraccion.norma || norma.identificador,
                                    localidadId: selectedLocalityId // Añadir la ID de la localidad a cada infracción
                                }))
                            );
                            localOrdinancesCache[selectedLocalityMeta.id] = currentLocalNorms; // Guardar en caché
                        } catch (error) {
                            console.error(`Error al cargar ordenanzas de ${selectedLocalityMeta.nombre}:`, error);
                            alert(`Error al cargar ordenanzas para ${selectedLocalityMeta.nombre}. Se mostrarán solo normas generales.`);
                            currentLocalNorms = [];
                        }
                    }
                }
            }

            // Combinar normas globales con las ordenanzas locales cargadas
            // Reconstruir allInfraccionesData cada vez
            allInfraccionesData = []; // Limpiar
            // Añadir normas globales
            Array.prototype.push.apply(allInfraccionesData, globalNorms);
            // Añadir normas locales cargadas (si hay)
            Array.prototype.push.apply(allInfraccionesData, currentLocalNorms);

            // Reconstruir originalGroupedInfraccionesData para los contadores (ahora para el conjunto combinado)
            originalGroupedInfraccionesData = allInfraccionesData.reduce((acc, infraccion) => {
                const normaGrisKey = `${infraccion.normagris_identificador.trim()} - ${infraccion.normagris_tematica.trim()}`;
                if (!acc[normaGrisKey]) {
                    acc[normaGrisKey] = { totalInfracciones: 0 };
                }
                acc[normaGrisKey].totalInfracciones++;
                return acc;
            }, {});

            if (mainLoadingMessage) {
                mainLoadingMessage.style.display = 'none';
            }
            applyFilters(); // Re-aplicar filtros con los datos combinados
        }


        // Función principal para aplicar todos los filtros y renderizar
        function applyFilters() {
            // Actualizar el estado de los filtros
            currentFilters.searchTerm = searchInput.value.toLowerCase().trim();
            currentFilters.areaId = areaFilterSelect.value;
            currentFilters.rango = rangoFilterSelect.value;
            currentFilters.ambito = ambitoFilterSelect.value;

            renderActiveFilters(); // Muestra los badges de filtros activos

            // Filtrar sobre el array completo de infracciones (allInfraccionesData)
            const filteredInfracciones = allInfraccionesData.filter(infraccion => {
                // Búsqueda por texto en múltiples campos
                const matchesSearch = !currentFilters.searchTerm ||
                    infraccion.descripcion.toLowerCase().includes(currentFilters.searchTerm) ||
                    infraccion.norma.toLowerCase().includes(currentFilters.searchTerm) ||
                    infraccion.articulo.includes(currentFilters.searchTerm) ||
                    (infraccion.apartado && infraccion.apartado.toLowerCase().includes(currentFilters.searchTerm)) ||
                    (infraccion.opc && infraccion.opc.toLowerCase().includes(currentFilters.searchTerm)) ||
                    (infraccion.tags && infraccion.tags.some(tag => tag.toLowerCase().includes(currentFilters.searchTerm))) ||
                    infraccion.normagris_identificador.toLowerCase().includes(currentFilters.searchTerm) ||
                    infraccion.normagris_tematica.toLowerCase().includes(currentFilters.searchTerm);

                // Filtros de selección
                const matchesArea = !currentFilters.areaId || infraccion.areaId === currentFilters.areaId;
                const matchesRango = !currentFilters.rango || infraccion.rango === currentFilters.rango;

                // === LÓGICA CLAVE DE FILTRADO POR ÁMBITO Y LOCALIDAD (ACTUALIZADA) ===
                let matchesAmbitoAndLocality = false;

                // Si se ha seleccionado una localidad específica (ej. "daimiel")
                if (currentSelectedLocalityId && currentSelectedLocalityId !== 'todas_localidades') {
                    // Las normas Estatales y Autonómicas siempre pasan este filtro de localidad
                    if (infraccion.ambito === 'Estatal' || infraccion.ambito === 'Autonómico') {
                        // Y además, deben coincidir con el filtro de ámbito si está activo
                        matchesAmbitoAndLocality = !currentFilters.ambito || infraccion.ambito === currentFilters.ambito;
                    }
                    // Las normas Locales solo pasan si pertenecen a la localidad seleccionada
                    else if (infraccion.ambito === 'Local') {
                        matchesAmbitoAndLocality = infraccion.localidadId === currentSelectedLocalityId &&
                            (!currentFilters.ambito || currentFilters.ambito === 'Local');
                    }
                    // Si el ámbito de la infracción no es ninguno de los anteriores, no coincide
                    else {
                        matchesAmbitoAndLocality = false;
                    }
                }
                // Si NO hay una localidad específica seleccionada (es decir, "Todas las Localidades" o al inicio)
                else {
                    // Comportamiento original: el filtro de ámbito funciona normalmente
                    matchesAmbitoAndLocality = !currentFilters.ambito || infraccion.ambito === currentFilters.ambito;
                }

                return matchesSearch && matchesArea && matchesRango && matchesAmbitoAndLocality;
            });

            // Renderizar las infracciones que han pasado todos los filtros globales
            renderGroupedInfracciones(filteredInfracciones);

            // Actualizar el display de la localidad actual en la sidebar
            const localityNameToShow = localidadesMeta.find(loc => loc.id === currentSelectedLocalityId)?.nombre || 'Global';
            if (currentLocalityDisplay) {
                currentLocalityDisplay.textContent = localityNameToShow;
            }
            // Asegurarse de que el select de la sidebar tenga el valor correcto
            if (sidebarLocalitySelect) {
                sidebarLocalitySelect.value = currentSelectedLocalityId;
            }
        }

        // --- Lógica de carga inicial al abrir buscador.html ---
        // Comprobar si hay un filtro de área y/o localidad inicial desde sessionStorage
        const initialAreaFilter = sessionStorage.getItem('initialAreaFilter');
        const initialLocalidadFilter = sessionStorage.getItem('initialLocalidadFilter');

        // Aplicar filtro de área si existe
        if (initialAreaFilter) {
            currentFilters.areaId = initialAreaFilter;
            areaFilterSelect.value = initialAreaFilter;
            sessionStorage.removeItem('initialAreaFilter'); // Limpiar después de usar
        }

        // Aplicar filtro de localidad si existe y luego cargar las normas
        if (initialLocalidadFilter) {
            currentSelectedLocalityId = initialLocalidadFilter;
            // No limpiar sessionStorage aquí, se limpia en la carga inicial de loadAndCombineNorms
        }
        // Llamada inicial para cargar las normas (globales + opcionalmente locales)
        loadAndCombineNorms(currentSelectedLocalityId);


        // Event Listeners para los elementos de filtro
        searchInput.addEventListener('input', applyFilters);
        areaFilterSelect.addEventListener('change', applyFilters);
        rangoFilterSelect.addEventListener('change', applyFilters);
        ambitoFilterSelect.addEventListener('change', applyFilters);

        // Listener para el selector de localidad en el sidebar
        sidebarLocalitySelect.addEventListener('change', async () => {
            const selectedId = sidebarLocalitySelect.value;
            // No llamar a applyFilters directamente, loadAndCombineNorms lo hará
            await loadAndCombineNorms(selectedId);
        });

        // Listener para los botones de limpiar el campo de búsqueda principal y badges
        document.querySelectorAll('.clear-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const inputToClear = document.querySelector(`.${event.target.dataset.filterTarget}`);
                if (inputToClear) {
                    inputToClear.value = '';
                    // Si limpiamos la búsqueda de texto, pero hay una localidad seleccionada,
                    // no deberíamos recargar todas las normas, solo aplicar los filtros.
                    // applyFilters() ya lo maneja bien.
                }
                applyFilters();
            });
        });

        // Lógica de la barra lateral (sidebar) y botones flotantes (FABs)
        const floatingActionButtonsContainer = document.querySelector('.floating-action-buttons');

        // Controla la visibilidad de los FABs (ocultos si sidebar abierto, visibles si cerrado)
        function updateFABVisibility() {
            floatingActionButtonsContainer.style.display = 'flex'; // AÑADIR ESTA LÍNEA: Siempre visible
        }

        // Toggle para abrir/cerrar sidebar
        if (toggleSidebarBtn && sidebar) {
            toggleSidebarBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                updateFABVisibility();
            });
        }

        // Botón de cerrar sidebar (dentro del sidebar)
        if (closeSidebarBtn && sidebar) {
            closeSidebarBtn.addEventListener('click', () => {
                sidebar.classList.remove('open');
                updateFABVisibility();
            });
        }

        // Lógica para el botón de scroll to top
        if (scrollTopBtn) {
            window.addEventListener('scroll', () => {
                // Solo mostrar si el sidebar NO está abierto
                if (!sidebar.classList.contains('open')) {
                    const scrolledEnough = window.scrollY > window.innerHeight / 2;
                    scrollTopBtn.classList.toggle('hidden', !scrolledEnough);
                } else {
                    scrollTopBtn.classList.add('hidden'); // Ocultar si el sidebar está abierto
                }
            });

            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Botón showSearchBtn (actualmente sin funcionalidad activa)
        if (showSearchBtn) {
            showSearchBtn.addEventListener('click', () => {
                console.log('Botón "Mostrar filtros y título" clicado. Su funcionalidad es opcional aquí.');
            });
        }

        // Asegurarse de que los FABs estén visibles al cargar la página si el sidebar no está abierto
        updateFABVisibility();
    }
});