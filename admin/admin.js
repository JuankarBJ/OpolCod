// Elements
const fileInput = document.getElementById('file-input');
const welcomeScreen = document.getElementById('welcome-screen');
const editorScreen = document.getElementById('editor-screen');
const currentFilenameEl = document.getElementById('current-filename');
const btnSave = document.getElementById('btn-save');
const btnAddItem = document.getElementById('btn-add-item');
const btnCreateNew = document.getElementById('btn-create-new');
const metadataContainer = document.getElementById('metadata-form-container');
const itemsListContainer = document.getElementById('items-list-container');

// State
let currentData = null;
let currentFilename = 'nuevo_archivo.json';
let isConfigMode = false;
let detectedSeverityOptions = [];

// Event Listeners
fileInput.addEventListener('change', handleFileSelect);
btnSave.addEventListener('click', saveJSON);
btnAddItem.addEventListener('click', addNewItem);
if (btnCreateNew) btnCreateNew.addEventListener('click', createNewFile);

function createNewFile() {
    currentFilename = "nuevo_archivo.json";
    currentFilenameEl.textContent = currentFilename;
    isConfigMode = false;

    // Default Template
    currentData = {
        "identificador": "Nueva Norma",
        "tematica": "",
        "modelo_sancion": "modelo_estandar",
        "rango": "Ordenanza",
        "ambito": "Local",
        "areaId": "trafico",
        "localidadId": "",
        "infracciones": []
    };

    scanSeverityOptions(); // Defaults
    renderEditor();
    switchScreen('editor');
}

// Global close function
window.closeEditor = function () {
    if (confirm('¿Salir sin guardar? Perderás los cambios no descargados.')) {
        switchScreen('welcome');
        fileInput.value = ''; // Reset input
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    currentFilename = file.name;
    currentFilenameEl.textContent = currentFilename;
    isConfigMode = currentFilename === 'config.json';

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            currentData = JSON.parse(e.target.result);
            scanSeverityOptions(); // Scan for "Leve/L" pairs
            renderEditor();
            switchScreen('editor');
        } catch (error) {
            alert('Error al leer el JSON: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function switchScreen(screen) {
    welcomeScreen.classList.remove('active');
    editorScreen.classList.remove('active');

    if (screen === 'welcome') welcomeScreen.classList.add('active');
    if (screen === 'editor') editorScreen.classList.add('active');
}

function scanSeverityOptions() {
    detectedSeverityOptions = [];
    const uniquePairs = new Set();

    // Default options if empty
    const defaults = [
        { label: 'Leve', code: 'L' },
        { label: 'Grave', code: 'G' },
        { label: 'Muy Grave', code: 'MG' }
    ];

    if (currentData.infracciones && Array.isArray(currentData.infracciones)) {
        currentData.infracciones.forEach(inf => {
            if (inf.tipo && inf.circulo) {
                const pairKey = `${inf.tipo}|${inf.circulo}`;
                if (!uniquePairs.has(pairKey)) {
                    uniquePairs.add(pairKey);
                    detectedSeverityOptions.push({
                        label: capitalize(inf.tipo),
                        code: inf.circulo,
                        value_tipo: inf.tipo // keep original case for value
                    });
                }
            }
        });
    }

    // Determine if we need to add defaults (if no data found)
    if (detectedSeverityOptions.length === 0) {
        detectedSeverityOptions = defaults;
    } else {
        // Sort by L, G, MG preference if possible
        const magnitude = { 'L': 1, 'G': 2, 'MG': 3 };
        detectedSeverityOptions.sort((a, b) => (magnitude[a.code] || 9) - (magnitude[b.code] || 9));
    }
}

function renderEditor() {
    metadataContainer.innerHTML = '';
    itemsListContainer.innerHTML = '';

    if (isConfigMode) {
        renderConfigEditor();
    } else {
        renderNormEditor();
    }
}

function renderNormEditor() {
    // 1. Metadata (Sidebar)
    // 1. Metadata (Sidebar)
    const metaFields = [
        { key: 'identificador', label: 'Identificador' },
        { key: 'tematica', label: 'Temática' },
        { key: 'rango', label: 'Rango' },
        { key: 'ambito', label: 'Ámbito' },
        // modelo_sancion handled separately
        { key: 'areaId', label: 'Area ID' },
        { key: 'localidadId', label: 'Localidad ID' }
    ];

    metaFields.forEach(field => {
        if (currentData[field.key] !== undefined) {
            metadataContainer.appendChild(createInputDOM(field.label, currentData[field.key], (val) => currentData[field.key] = val));
        }
    });

    // Custom Render for modelo_sancion (Dropdown)
    if (currentData.modelo_sancion !== undefined) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';

        const labelEl = document.createElement('label');
        labelEl.textContent = 'Modelo Sanción';
        wrapper.appendChild(labelEl);

        const select = document.createElement('select');
        select.className = 'form-control';

        const options = [
            { val: 'modelo_estandar', label: 'Estándar (Con Puntos)' },
            { val: 'estandar_sin_puntos', label: 'Estándar (Sin Puntos)' },
            { val: 'solo_importe_rango', label: 'Solo Importe/Rango' }
        ];

        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.val;
            optionEl.textContent = opt.label;
            if (currentData.modelo_sancion === opt.val) optionEl.selected = true;
            select.appendChild(optionEl);
        });

        select.addEventListener('change', (e) => {
            currentData.modelo_sancion = e.target.value;
        });

        wrapper.appendChild(select);
        metadataContainer.appendChild(wrapper);
    }

    // 2. Infracciones List
    if (currentData.infracciones && Array.isArray(currentData.infracciones)) {
        currentData.infracciones.forEach((infraccion, index) => {
            renderInfraccionCard(infraccion, index);
        });
        renderSidebarIndex(); // NEW: Render sidebar index
    } else {
        itemsListContainer.innerHTML = '<div class="empty-state-card" style="margin:auto"><p>No hay infracciones. Añade una nueva.</p></div>';
        document.getElementById('index-list-container').innerHTML = '';
    }
}

function renderSidebarIndex() {
    const container = document.getElementById('index-list-container');
    container.innerHTML = '';

    if (!currentData.infracciones) return;

    currentData.infracciones.forEach((inf, index) => {
        const item = document.createElement('div');
        item.className = 'nav-item';
        // Format: "Art 12.1 - Título o resumen"
        const artText = inf.articulo ? `Art. ${inf.articulo}` : 'Sin art.';
        const snippet = inf.descripcion ? (inf.descripcion.substring(0, 25) + '...') : 'Sin descripción';

        item.innerHTML = `
            <span>${artText}</span>
            <span class="mini-badge" style="background:${getBadgeColor(inf.circulo)}22; color:${getBadgeColor(inf.circulo)}">${inf.circulo || '?'}</span>
        `;

        item.addEventListener('click', () => {
            // Scroll to card
            const card = document.querySelector(`.item-card[data-index="${index}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight effect
                card.style.borderColor = 'var(--primary-color)';
                setTimeout(() => card.style.borderColor = 'var(--border-color)', 1500);

                // Update active nav state
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
            }
        });

        container.appendChild(item);
    });
}

function getBadgeColor(code) {
    if (code === 'L') return '#4caf50';
    if (code === 'G') return '#ff9800';
    if (code === 'MG') return '#f44336';
    return '#ccc';
}

function renderInfraccionCard(infraccion, index) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.index = index;

    // Determine color for badge
    const badgeColor = infraccion.circulo || 'gray';

    card.innerHTML = `
        <div class="card-header" onclick="toggleCardBody(this)">
            <div class="card-title">
                <span class="badge-severity" data-color="${badgeColor}"></span>
                <span>${infraccion.articulo ? 'Art. ' + infraccion.articulo : 'Sin artículo'}</span>
                <small style="color:var(--text-secondary); margin-left:8px;">(${infraccion.tipo || 'Sin tipo'})</small>
            </div>
            <div class="item-actions">
                <button class="btn-icon delete" onclick="event.stopPropagation(); deleteItem(${index})"><span class="material-icons">delete</span></button>
            </div>
        </div>
        <div class="card-content">
            <!-- Content injected via JS for event handling -->
        </div>
    `;

    const body = card.querySelector('.card-content');

    // 1. Severity Selector (The "Listbox" requested)
    const severityWrapper = document.createElement('div');
    severityWrapper.className = 'form-group';
    severityWrapper.innerHTML = `<label>Gravedad / Círculo</label>`;

    const severitySelect = document.createElement('select');
    severitySelect.className = 'form-control';

    // Add scanned options
    detectedSeverityOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ tipo: opt.value_tipo || opt.label.toLowerCase(), circulo: opt.code });
        option.textContent = `${opt.label} (${opt.code})`;
        if (infraccion.tipo === (opt.value_tipo || opt.label.toLowerCase()) && infraccion.circulo === opt.code) {
            option.selected = true;
        }
        severitySelect.appendChild(option);
    });

    // Add "Custom" option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Personalizado...';
    severitySelect.appendChild(customOption);

    // Wrapper for Custom Fields
    const customSeverityDiv = document.createElement('div');
    customSeverityDiv.className = 'grid-2 col-full';
    customSeverityDiv.style.display = 'none'; // Hidden unless custom selected
    customSeverityDiv.style.padding = '1rem';
    customSeverityDiv.style.background = '#2c2c2c';
    customSeverityDiv.style.borderRadius = '4px';
    customSeverityDiv.style.marginBottom = '1rem';

    const rawTipoInput = createInputDOM('Texto Tipo (ej: Leve)', infraccion.tipo, (v) => updateInfraccion(index, 'tipo', v));
    const rawCirculoInput = createInputDOM('Círculo (L, G, MG)', infraccion.circulo, (v) => updateInfraccion(index, 'circulo', v));

    customSeverityDiv.appendChild(rawTipoInput);
    customSeverityDiv.appendChild(rawCirculoInput);

    severitySelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            // Show custom fields (hidden by default)
            customSeverityDiv.style.display = 'grid';
        } else {
            const val = JSON.parse(e.target.value);
            updateInfraccion(index, 'tipo', val.tipo);
            updateInfraccion(index, 'circulo', val.circulo);
            customSeverityDiv.style.display = 'none';
            renderEditor(); // Re-render to update badge color in header immediately
        }
    });

    severityWrapper.appendChild(severitySelect);
    body.appendChild(severityWrapper);
    body.appendChild(customSeverityDiv); // Append custom block


    // 2. Standard Fields
    body.appendChild(createInputDOM('Artículo', infraccion.articulo, v => updateInfraccion(index, 'articulo', v)));
    body.appendChild(createInputDOM('Apartado', infraccion.apartado, v => updateInfraccion(index, 'apartado', v)));

    const importeWrap = createInputDOM('Importe', infraccion.importe, v => updateInfraccion(index, 'importe', v));
    importeWrap.classList.add('col-full'); // Importe full width? Or maybe not
    body.appendChild(importeWrap);

    const descWrap = createInputDOM('Descripción', infraccion.descripcion, v => updateInfraccion(index, 'descripcion', v), 'textarea');
    descWrap.classList.add('col-full');
    body.appendChild(descWrap);

    const tagsWrap = createInputDOM('Tags (separar por comas)', (infraccion.tags || []).join(', '), v => updateInfraccion(index, 'tags', v.split(',').map(t => t.trim())));
    tagsWrap.classList.add('col-full');
    body.appendChild(tagsWrap);

    itemsListContainer.appendChild(card);
}

function renderConfigEditor() {
    metadataContainer.innerHTML = '<h3>Configuración Global</h3><p style="font-size:0.8rem; color:#aaa">Edición en crudo para config.json</p>';
    const textarea = document.createElement('textarea');
    textarea.className = 'form-control';
    textarea.style.height = '600px';
    textarea.style.fontFamily = 'monospace';
    textarea.value = JSON.stringify(currentData, null, 2);
    textarea.addEventListener('input', (e) => {
        try { currentData = JSON.parse(e.target.value); } catch (err) { /* ignore */ }
    });
    itemsListContainer.appendChild(textarea);
}

// Helpers
function createInputDOM(label, value, onChange, type = 'text') {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);

    let input;
    if (type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
    } else {
        input = document.createElement('input');
        input.type = type;
    }
    input.className = 'form-control';
    input.value = value || '';
    input.addEventListener('input', (e) => onChange(e.target.value));

    wrapper.appendChild(input);
    return wrapper;
}

function updateInfraccion(index, key, value) {
    if (currentData.infracciones && currentData.infracciones[index]) {
        currentData.infracciones[index][key] = value;
    }
}

window.toggleCardBody = function (header) {
    // Simple toggle visibility of sibling
    const content = header.nextElementSibling;
    if (content.style.display === 'none' || content.style.display === '') { // Fix: also check empty char
        content.style.display = 'grid';
    } else {
        content.style.display = 'none';
    }
}

window.deleteItem = function (index) {
    if (confirm('¿Eliminar esta infracción?')) {
        currentData.infracciones.splice(index, 1);
        renderEditor();
    }
}

function addNewItem() {
    if (!currentData.infracciones) currentData.infracciones = [];
    currentData.infracciones.unshift({
        tipo: detectedSeverityOptions[0] ? (detectedSeverityOptions[0].value_tipo || detectedSeverityOptions[0].label.toLowerCase()) : "leve",
        circulo: detectedSeverityOptions[0] ? detectedSeverityOptions[0].code : "L",
        articulo: "",
        importe: "0 €",
        descripcion: "",
        tags: []
    });
    renderEditor();
}

function saveJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", currentFilename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
