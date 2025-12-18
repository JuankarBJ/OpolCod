document.addEventListener('DOMContentLoaded', () => {
    const areasGridContainer = document.querySelector('.areas-grid');
    const localitySelect = document.getElementById('locality-select'); 
    const accessButton = document.querySelector('.access-button'); // Selector del botón "Ir al Buscador"

    // Mostrar mensaje de carga para las áreas
    const loadingAreasMessage = document.createElement('p');
    loadingAreasMessage.textContent = 'Cargando áreas temáticas...';
    loadingAreasMessage.style.textAlign = 'center';
    loadingAreasMessage.style.color = 'var(--color-muted-text)';
    if (areasGridContainer) {
        areasGridContainer.appendChild(loadingAreasMessage);
    }

    // Mostrar mensaje de carga para las localidades si el select existe
    if (localitySelect) {
        localitySelect.innerHTML = '<option value="">Cargando localidades...</option>';
        localitySelect.disabled = true;
    }

    // Cargar config.json para obtener grandesAreas y localidadesMeta
    fetch('config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`No se pudo cargar config.json: ${response.status} - ${response.statusText}.`);
            }
            return response.json();
        })
        .then(data => {
            const grandesAreas = data.grandesAreas;
            const localidadesMeta = data.localidadesMeta;
            
            // --- 1. Poblar y renderizar las tarjetas de Área ---
            if (areasGridContainer) {
                areasGridContainer.innerHTML = ''; // Limpiar mensaje de carga de áreas
                
                const iconEmojiMap = {
                    'building': '🏗️',
                    'car': '🚗',
                    'dog': '🐶',
                    'handcuffs': '⛓️',
                    'circus': '🎪'
                    // Añade más mapeos si tienes otros iconos
                };

                for (const areaId in grandesAreas) {
                    const areaInfo = grandesAreas[areaId];
                    const areaCard = document.createElement('div');
                    areaCard.classList.add('area-card');
                    areaCard.style.setProperty('--area-card-color', areaInfo.color); 

                    const iconHtml = areaInfo.icon && iconEmojiMap[areaInfo.icon] ? 
                                     `<span class="icon">${iconEmojiMap[areaInfo.icon]}</span>` : '';

                    areaCard.innerHTML = `
                        ${iconHtml}
                        <span class="name">${areaInfo.nombre}</span>
                    `;
                    areaCard.dataset.areaId = areaId;

                    // Listener para hacer clic en una tarjeta de área
                    areaCard.addEventListener('click', () => {
                        sessionStorage.setItem('initialAreaFilter', areaId);
                        // ¡IMPORTANTE! Guardar la localidad seleccionada en ese momento
                        if (localitySelect && localitySelect.value) {
                            sessionStorage.setItem('initialLocalidadFilter', localitySelect.value);
                        } else {
                            sessionStorage.removeItem('initialLocalidadFilter');
                        }
                        window.location.href = 'buscador.html'; // Navegar al buscador
                    });

                    areasGridContainer.appendChild(areaCard);
                }
            }

            // --- 2. Poblar el selector de Localidad ---
            if (localitySelect) {
                localitySelect.innerHTML = '<option value="">--Seleccione para cargar Ordenanzas--</option>'; // Opción por defecto
                localitySelect.disabled = false; // Habilitar el select

                localidadesMeta.forEach(loc => {
                    const option = document.createElement('option');
                    option.value = loc.id;
                    option.textContent = loc.nombre;
                    localitySelect.appendChild(option);
                    
                    
                });

                // Listener para el cambio de localidad en el index.html
                // ESTE LISTENER SOLO GUARDA LA SELECCIÓN, NO REDIRIGE AUTOMÁTICAMENTE
                localitySelect.addEventListener('change', () => {
                    sessionStorage.setItem('initialLocalidadFilter', localitySelect.value);
                });
            }

            // --- 3. Listener para el botón "Ir al Buscador de Infracciones" ---
            if (accessButton) {
                accessButton.addEventListener('click', (event) => {
                    event.preventDefault(); // Evitar la navegación por defecto del enlace

                    // Guardar la localidad seleccionada actualmente (si el select ya está poblado)
                    if (localitySelect && localitySelect.value) {
                        sessionStorage.setItem('initialLocalidadFilter', localitySelect.value);
                    } else {
                        sessionStorage.removeItem('initialLocalidadFilter');
                    }
                    
                    // No se establece initialAreaFilter aquí porque este botón es general.
                    window.location.href = 'buscador.html'; // Navegar al buscador
                });
            }

        }) // Fin del .then(data => { ... }); que carga config.json
        .catch(error => {
            console.error('Error al cargar datos de inicio (config.json):', error);
            if (areasGridContainer) {
                areasGridContainer.innerHTML = `<p style="color: red; text-align: center;">Error al cargar áreas: ${error.message}</p>`;
            }
            if (localitySelect) {
                localitySelect.innerHTML = '<option value="">Error al cargar</option>';
                localitySelect.disabled = true;
            }
        });
});