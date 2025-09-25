/**
 * Form Renderer - Generate form HTML from schema and bind to state
 * Replaces hard-coded form sections with dynamic rendering
 */

class FormRenderer {
    constructor() {
        this.schema = null;
        this.stateManager = null;
        this.visibilityManager = null;
        this.container = null;
        this.eventListeners = new Map();
    }

    /**
     * Initialize renderer with dependencies
     * @param {Object} schema 
     * @param {FormStateManager} stateManager 
     * @param {VisibilityManager} visibilityManager 
     */
    init(schema, stateManager, visibilityManager) {
        this.schema = schema;
        this.stateManager = stateManager;
        this.visibilityManager = visibilityManager;
        
        // Subscribe to state changes
        this.stateManager.subscribe((newState, oldState) => {
            this.handleStateChange(newState, oldState);
        });
    }

    /**
     * Render the entire form
     * @param {HTMLElement|string} container - Container element or ID
     */
    renderForm(container) {
        // Handle both element and string ID
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (!container) {
            throw new Error('Container element not found');
        }
        
        this.container = container;
        this.clearEventListeners();

        const formHTML = this.generateFormHTML();
        container.innerHTML = formHTML;
        
        this.bindEventHandlers();
        this.updateVisibility();
        this.populateFormValues();
    }

    /**
     * Convenience method that accepts container ID
     * @param {string} containerId 
     */
    render(containerId) {
        this.renderForm(containerId);
    }

    /**
     * Generate complete form HTML from schema
     * @returns {string}
     */
    generateFormHTML() {
        const blocks = this.schema.blocks.map(blockId => 
            this.renderBlock(blockId)
        ).join('');

        return `
            <form id="inspectionForm" class="a-form">
                ${blocks}
                
                <!-- Location Measures Section -->
                <div class="form-section" data-block="blok4_calculations">
                    <h3>📐 Locatie Metingen & Oppervlaktes</h3>
                    <div id="location-measurements">
                        <!-- Dynamic location entries -->
                    </div>
                    <button type="button" class="a-button a-button--outlined" onclick="addLocation()">
                        ➕ Locatie Toevoegen
                    </button>
                </div>

                <!-- Media Section -->
                <div class="form-section">
                    <h3>📸 Foto's & Documenten</h3>
                    <div class="media-section">
                        <!-- Keep existing media upload implementation -->
                        <div class="upload-section">
                            <h4>📷 Foto's</h4>
                            <div class="photo-upload-area" 
                                 onclick="triggerPhotoUpload()" 
                                 ondrop="handlePhotoDrop(event)" 
                                 ondragover="handleDragOver(event)"
                                 ondragenter="handleDragEnter(event)"
                                 ondragleave="handleDragLeave(event)">
                                
                                <div class="upload-content">
                                    <div class="upload-icon">📷</div>
                                    <h5>Sleep foto's hierheen</h5>
                                    <p class="upload-text">of klik om bestanden te selecteren</p>
                                    <p class="upload-hint">
                                        Formaten: JPG, PNG, HEIC<br>
                                        GPS & datum metadata automatisch uitgelezen
                                    </p>
                                </div>
                                
                                <input type="file" 
                                       id="photo_upload" 
                                       name="photos[]" 
                                       multiple 
                                       accept="image/*" 
                                       class="hidden" 
                                       title="Foto upload" 
                                       onchange="handlePhotoUpload(event)">
                            </div>
                            
                            <div class="mobile-camera-options u-margin-top-xs">
                                <div class="row">
                                    <div class="col-xs-12 col-md-6">
                                        <button type="button" class="a-button a-button--outlined camera-btn" onclick="openCamera()">
                                            📸 Camera Openen
                                        </button>
                                    </div>
                                    <div class="col-xs-12 col-md-6">
                                        <button type="button" class="a-button a-button--outline" onclick="triggerPhotoUpload()">
                                            📁 Bestanden Kiezen
                                        </button>
                                    </div>
                                </div>
                                <div class="u-margin-top-xs">
                                    <span id="photo-status" class="form-hint">Geen bestanden gekozen</span>
                                </div>
                            </div>
                            
                            <div id="photo-grid" class="media-grid u-margin-top">
                                <!-- Foto's worden hier dynamisch toegevoegd -->
                            </div>
                        </div>

                        <div class="upload-section u-margin-top">
                            <h4>📄 PDF Documenten</h4>
                            <div class="pdf-upload-area" onclick="triggerPdfUpload()" ondrop="handleMediaDrop(event, 'pdf')" ondragover="handleMediaDragOver(event)">
                                <div class="upload-icon">📄</div>
                                <p><strong>Klik hier of sleep PDF's</strong></p>
                                <p class="upload-hint">Formaten: PDF<br>
                                Maximum: 10MB per bestand<br>
                                Bijlagen: plannen, vergunningen, tekeningen</p>
                                <input type="file" id="pdf_upload" name="pdfs[]" multiple accept=".pdf,application/pdf" class="hidden" title="PDF upload" onchange="handlePdfUpload(event)">
                            </div>
                            
                            <div id="pdf-grid" class="media-grid">
                                <!-- PDF's worden hier dynamisch toegevoegd -->
                            </div>
                            
                            <div class="u-margin-top-xs">
                                <button type="button" class="a-button a-button--outline" onclick="triggerPdfUpload()">
                                    📄 Bestanden kiezen
                                </button>
                                <span class="form-hint">Geen bestand gekozen</span>
                            </div>
                        </div>

                        <div class="media-metadata-summary hidden u-margin-top" id="media-metadata-summary">
                            <h4>📊 Media Samenvatting:</h4>
                            <!-- Media summary content -->
                        </div>
                    </div>
                </div>

                <!-- Form Actions -->
                <div class="form-actions u-margin-top">
                    <button type="button" class="a-button a-button--outline u-margin-right-xs" onclick="resetInspectionForm()">
                        🔄 Reset
                    </button>
                    <button type="submit" class="a-button a-button--success">
                        💾 Vaststelling Opslaan
                    </button>
                </div>
            </form>
        `;
    }

    /**
     * Render a single block
     * @param {string} blockId 
     * @returns {string}
     */
    renderBlock(blockId) {
        const blockFields = Object.values(this.schema.fields)
            .filter(field => field.block === blockId);

        if (blockFields.length === 0) return '';

        const blockTitle = this.getBlockTitle(blockId);
        const fieldsHTML = blockFields.map(field => this.renderField(field)).join('');

        return `
            <div class="form-section" data-block="${blockId}">
                ${blockTitle ? `<h3>${blockTitle}</h3>` : ''}
                ${fieldsHTML}
            </div>
        `;
    }

    /**
     * Get human-readable block title
     * @param {string} blockId 
     * @returns {string}
     */
    getBlockTitle(blockId) {
        const titles = {
            'blok1_meta': '📋 Basis Informatie',
            'blok2_actor': '👥 Betrokken Partijen', 
            'blok3_observations': '🔍 Waarnemingen & Vaststellingen',
            'blok4_calculations': '💰 Berekeningen & Details',
            'blok5_relations': '🔗 Relaties & Extra Info'
        };
        return titles[blockId] || '';
    }

    /**
     * Render a single field
     * @param {Object} field 
     * @returns {string}
     */
    renderField(field) {
        const wrapper = `<div class="m-form-group" data-field="${field.id}" ${field.showIf ? 'data-conditional="true"' : ''}>`;

        switch (field.type) {
            case 'text':
            case 'date':
            case 'number':
                return wrapper + this.renderInput(field) + '</div>';
            case 'textarea':
                return wrapper + this.renderTextarea(field) + '</div>';
            case 'select':
                return wrapper + this.renderSelect(field) + '</div>';
            case 'radio':
                return wrapper + this.renderRadioGroup(field) + '</div>';
            case 'checkbox':
                return wrapper + this.renderCheckbox(field) + '</div>';
            case 'checkbox-group':
                return wrapper + this.renderCheckboxGroup(field) + '</div>';
            default:
                return wrapper + `<p>Unknown field type: ${field.type}</p></div>`;
        }
    }

    /**
     * Render input field
     * @param {Object} field 
     * @returns {string}
     */
    renderInput(field) {
        const attrs = this.buildAttributes(field);
        
        return `
            <div class="a-input">
                <label class="a-input__label" for="${field.id}">${field.label}${field.required ? ' *' : ''}:</label>
                <input ${attrs} data-field-id="${field.id}">
                ${field.hint ? `<small class="form-hint">${field.hint}</small>` : ''}
            </div>
        `;
    }

    /**
     * Render textarea field
     * @param {Object} field 
     * @returns {string}
     */
    renderTextarea(field) {
        const attrs = this.buildAttributes(field, ['rows']);
        
        return `
            <div class="a-input">
                <label class="a-input__label" for="${field.id}">${field.label}${field.required ? ' *' : ''}:</label>
                <textarea ${attrs} data-field-id="${field.id}"></textarea>
                ${field.hint ? `<small class="form-hint">${field.hint}</small>` : ''}
            </div>
        `;
    }

    /**
     * Render select field
     * @param {Object} field 
     * @returns {string}
     */
    renderSelect(field) {
        const options = this.getFieldOptions(field);
        const optionsHTML = options.map(option => 
            `<option value="${option.value}">${option.label}</option>`
        ).join('');

        return `
            <div class="a-input">
                <label class="a-input__label" for="${field.id}">${field.label}${field.required ? ' *' : ''}:</label>
                <select id="${field.id}" name="${field.id}" class="a-input__field" 
                        ${field.required ? 'required' : ''} data-field-id="${field.id}">
                    <option value="" disabled selected>Kies ${field.label.toLowerCase()}</option>
                    ${optionsHTML}
                </select>
                ${field.hint ? `<small class="form-hint">${field.hint}</small>` : ''}
            </div>
        `;
    }

    /**
     * Render radio group
     * @param {Object} field 
     * @returns {string}
     */
    renderRadioGroup(field) {
        const options = this.getFieldOptions(field);
        const radiosHTML = options.map(option => `
            <div class="a-input__checkbox">
                <input type="radio" id="${field.id}-${option.value}" 
                       name="${field.id}" value="${option.value}"
                       ${field.required ? 'required' : ''} data-field-id="${field.id}">
                <label for="${field.id}-${option.value}">${option.label}</label>
            </div>
        `).join('');

        return `
            <div class="a-input">
                <label class="a-input__label">${field.label}${field.required ? ' *' : ''}:</label>
                ${radiosHTML}
                ${field.hint ? `<small class="form-hint">${field.hint}</small>` : ''}
            </div>
        `;
    }

    /**
     * Render checkbox field
     * @param {Object} field 
     * @returns {string}
     */
    renderCheckbox(field) {
        return `
            <div class="a-input__checkbox">
                <input type="checkbox" id="${field.id}" name="${field.id}" 
                       value="true" data-field-id="${field.id}">
                <label for="${field.id}" class="a-input__label">${field.label}</label>
                ${field.hint ? `<small class="form-hint">${field.hint}</small>` : ''}
            </div>
        `;
    }

    /**
     * Render checkbox group
     * @param {Object} field 
     * @returns {string}
     */
    renderCheckboxGroup(field) {
        const options = this.getFieldOptions(field);
        const checkboxesHTML = options.map(option => `
            <div class="a-input__checkbox">
                <input type="checkbox" id="${field.id}-${option.value}" 
                       name="${field.id}[]" value="${option.value}" 
                       data-field-id="${field.id}">
                <label for="${field.id}-${option.value}">${option.label}</label>
            </div>
        `).join('');

        return `
            <div class="a-input">
                <label class="a-input__label">${field.label}${field.required ? ' *' : ''}:</label>
                ${checkboxesHTML}
                ${field.hint ? `<small class="form-hint">${field.hint}</small>` : ''}
            </div>
        `;
    }

    /**
     * Build HTML attributes for input elements
     * @param {Object} field 
     * @param {Array} extraAttrs 
     * @returns {string}
     */
    buildAttributes(field, extraAttrs = []) {
        const attrs = [
            `type="${field.type}"`,
            `id="${field.id}"`,
            `name="${field.id}"`,
            `class="a-input__field${field.readonly ? ' calculated-field' : ''}"`
        ];

        if (field.required) attrs.push('required');
        if (field.readonly) attrs.push('readonly');
        if (field.placeholder) attrs.push(`placeholder="${field.placeholder}"`);
        if (field.pattern) attrs.push(`pattern="${field.pattern}"`);
        if (field.min !== undefined) attrs.push(`min="${field.min}"`);
        if (field.max !== undefined) attrs.push(`max="${field.max}"`);
        if (field.step !== undefined) attrs.push(`step="${field.step}"`);
        if (field.maxlength !== undefined) attrs.push(`maxlength="${field.maxlength}"`);

        // Add extra attributes
        extraAttrs.forEach(attr => {
            if (field[attr] !== undefined) {
                attrs.push(`${attr}="${field[attr]}"`);
            }
        });

        return attrs.join(' ');
    }

    /**
     * Get options for select/radio/checkbox fields
     * @param {Object} field 
     * @returns {Array}
     */
    getFieldOptions(field) {
        if (Array.isArray(field.options)) {
            return field.options;
        }

        // Look up from codelists
        if (typeof field.options === 'string' && this.schema.codelists) {
            return this.schema.codelists[field.options] || [];
        }

        // Look up from data (e.g., supervisors, postcodes)
        if (typeof field.options === 'string') {
            return this.getDataOptions(field.options);
        }

        return [];
    }

    /**
     * Get options from external data sources
     * @param {string} optionKey 
     * @returns {Array}
     */
    getDataOptions(optionKey) {
        if (!window.dataManager) return [];

        switch (optionKey) {
            case 'supervisors':
                return window.dataManager.getActiveSupervisors().map(s => ({
                    value: s.name,
                    label: s.name
                }));
            case 'postcodes':
                return window.dataManager.getActivePostcodes().map(p => ({
                    value: p.code,
                    label: `${p.code} - ${p.description}`
                }));
            case 'nuts_companies':
                return window.dataManager.getActiveUtilities().map(u => ({
                    value: u.name,
                    label: u.name
                }));
            default:
                return [];
        }
    }

    /**
     * Bind event handlers to form elements
     */
    bindEventHandlers() {
        if (!this.container) return;

        // Bind change events to all form fields
        const formFields = this.container.querySelectorAll('[data-field-id]');
        formFields.forEach(field => {
            const handler = (event) => this.handleFieldChange(event);
            
            if (field.type === 'radio' || field.type === 'checkbox') {
                field.addEventListener('change', handler);
            } else {
                field.addEventListener('input', handler);
                field.addEventListener('change', handler);
            }

            this.eventListeners.set(field, handler);
        });

        // Special handling for GPS checkbox
        const gpsCheckbox = this.container.querySelector('[data-field-id="use_gps"]');
        if (gpsCheckbox) {
            gpsCheckbox.addEventListener('change', () => this.handleGPSToggle());
        }
    }

    /**
     * Handle field value changes
     * @param {Event} event 
     */
    handleFieldChange(event) {
        const field = event.target;
        const fieldId = field.getAttribute('data-field-id');
        if (!fieldId) return;

        let value;

        if (field.type === 'checkbox') {
            if (field.name.endsWith('[]')) {
                // Checkbox group
                const groupName = field.name.slice(0, -2);
                const checkedBoxes = this.container.querySelectorAll(
                    `[name="${field.name}"]:checked`
                );
                value = Array.from(checkedBoxes).map(cb => cb.value);
            } else {
                // Single checkbox
                value = field.checked;
            }
        } else if (field.type === 'radio') {
            value = field.value;
        } else {
            value = field.value;
        }

        // Update state
        this.stateManager.updateState({
            fields: { [fieldId]: value }
        });
    }

    /**
     * Handle GPS toggle
     */
    handleGPSToggle() {
        const useGPS = this.stateManager.getState().fields.use_gps;
        
        if (useGPS) {
            this.requestGPSLocation();
        } else {
            // Try to get GPS from EXIF if photos are available
            this.tryEXIFLocation();
        }
    }

    /**
     * Request GPS location from device
     */
    requestGPSLocation() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            this.tryEXIFLocation();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.stateManager.updateGPS({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    source: 'device'
                });
            },
            (error) => {
                console.warn('GPS error:', error);
                this.tryEXIFLocation();
            }
        );
    }

    /**
     * Try to extract GPS from EXIF data of uploaded photos
     */
    tryEXIFLocation() {
        const photos = this.stateManager.getState().media.filter(m => m.type === 'photo');
        
        if (photos.length === 0) return;

        // Use first photo with GPS data
        const photoWithGPS = photos.find(photo => 
            photo.metadata && photo.metadata.gpsLatitude && photo.metadata.gpsLongitude
        );

        if (photoWithGPS) {
            this.stateManager.updateGPS({
                latitude: photoWithGPS.metadata.gpsLatitude,
                longitude: photoWithGPS.metadata.gpsLongitude,
                accuracy: null,
                source: 'exif'
            });
        }
    }

    /**
     * Handle state changes
     * @param {Object} newState 
     * @param {Object} oldState 
     */
    handleStateChange(newState, oldState) {
        this.updateVisibility();
        this.updateComputedFields();
    }

    /**
     * Update field visibility based on current state
     */
    updateVisibility() {
        if (!this.container || !this.visibilityManager) return;

        const state = this.stateManager.getState();
        const visibility = this.visibilityManager.applyVisibility(state);

        // Update field visibility
        Object.keys(visibility).forEach(fieldId => {
            const fieldElement = this.container.querySelector(`[data-field="${fieldId}"]`);
            if (fieldElement) {
                fieldElement.style.display = visibility[fieldId] ? 'block' : 'none';
            }
        });

        // Update block visibility
        const visibleBlocks = this.visibilityManager.getVisibleBlocks(state);
        this.schema.blocks.forEach(blockId => {
            const blockElement = this.container.querySelector(`[data-block="${blockId}"]`);
            if (blockElement) {
                blockElement.style.display = visibleBlocks.includes(blockId) ? 'block' : 'none';
            }
        });
    }

    /**
     * Update computed/readonly fields
     */
    updateComputedFields() {
        if (!this.container) return;

        const state = this.stateManager.getState();
        
        // Update computed fields from state
        Object.keys(state.computed).forEach(key => {
            const field = this.container.querySelector(`[data-field-id="${key}"]`);
            if (field && field.readOnly) {
                field.value = state.computed[key];
            }
        });
    }

    /**
     * Populate form with current state values
     */
    populateFormValues() {
        if (!this.container) return;

        const state = this.stateManager.getState();

        Object.keys(state.fields).forEach(fieldId => {
            const value = state.fields[fieldId];
            const elements = this.container.querySelectorAll(`[data-field-id="${fieldId}"]`);

            elements.forEach(element => {
                if (element.type === 'checkbox') {
                    if (Array.isArray(value)) {
                        element.checked = value.includes(element.value);
                    } else {
                        element.checked = !!value;
                    }
                } else if (element.type === 'radio') {
                    element.checked = element.value === value;
                } else {
                    element.value = value || '';
                }
            });
        });
    }

    /**
     * Clear event listeners
     */
    clearEventListeners() {
        this.eventListeners.forEach((handler, element) => {
            element.removeEventListener('change', handler);
            element.removeEventListener('input', handler);
        });
        this.eventListeners.clear();
    }

    /**
     * Render location measurements section
     */
    renderLocationMeasurements() {
        const container = this.container?.querySelector('#location-measurements');
        if (!container) return;

        const state = this.stateManager.getState();
        const locations = state.locationMeasures;

        if (locations.length === 0) {
            container.innerHTML = '<p class="u-text-muted">Nog geen locaties toegevoegd</p>';
            return;
        }

        const locationsHTML = locations.map(location => 
            this.renderLocationEntry(location)
        ).join('');

        container.innerHTML = locationsHTML;
    }

    /**
     * Render a single location entry
     * @param {Object} location 
     * @returns {string}
     */
    renderLocationEntry(location) {
        return `
            <div class="location-entry" data-location-id="${location.id}">
                <div class="row u-margin-bottom">
                    <div class="col-xs-12 col-md-6">
                        <div class="a-input">
                            <label class="a-input__label">📍 Locatie/Adres:</label>
                            <input type="text" class="a-input__field" 
                                   value="${location.address || ''}"
                                   onchange="updateLocationField('${location.id}', 'address', this.value)"
                                   placeholder="Bijv. Arenbergstraat nr 16">
                        </div>
                    </div>
                    <div class="col-xs-12 col-md-6">
                        <div class="a-input">
                            <label class="a-input__label">📏 Afmetingen (m):</label>
                            <div class="dimension-inputs">
                                <input type="number" class="a-input__field" 
                                       value="${location.length || ''}"
                                       onchange="updateLocationField('${location.id}', 'length', parseFloat(this.value) || 0)"
                                       placeholder="Lengte" step="0.1" min="0">
                                <span>×</span>
                                <input type="number" class="a-input__field" 
                                       value="${location.width || ''}"
                                       onchange="updateLocationField('${location.id}', 'width', parseFloat(this.value) || 0)"
                                       placeholder="Breedte" step="0.1" min="0">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row u-margin-bottom">
                    <div class="col-xs-12 col-md-6">
                        <div class="a-input">
                            <label class="a-input__label">📐 Oppervlakte (m²):</label>
                            <input type="number" class="a-input__field calculated-field" 
                                   value="${location.area || 0}" 
                                   readonly placeholder="Auto berekend">
                        </div>
                    </div>
                </div>
                
                <div class="row u-margin-bottom">
                    <div class="col-xs-12 col-md-4">
                        <div class="a-input">
                            <label class="a-input__label">⏱️ Vergunde Doorlooptijd (dagen):</label>
                            <input type="number" class="a-input__field duration-input" 
                                   value="${location.permittedDuration || ''}"
                                   onchange="updateLocationField('${location.id}', 'permittedDuration', parseInt(this.value) || 0)"
                                   placeholder="Bijv. 30" min="1">
                        </div>
                    </div>
                    <div class="col-xs-12 col-md-4">
                        <div class="a-input">
                            <label class="a-input__label">📅 Extra Doorlooptijd (dagen):</label>
                            <input type="number" class="a-input__field duration-input" 
                                   value="${location.extraDuration || ''}"
                                   onchange="updateLocationField('${location.id}', 'extraDuration', parseInt(this.value) || 0)"
                                   placeholder="Bijv. 15" min="0">
                        </div>
                    </div>
                    <div class="col-xs-12 col-md-4">
                        <div class="a-input">
                            <label class="a-input__label">📊 Subtotaal Dagen Overtreding:</label>
                            <input type="number" class="a-input__field calculated-field subtotal-days" 
                                   value="${location.violationDays || 0}"
                                   readonly placeholder="Auto berekend">
                        </div>
                    </div>
                </div>
                
                <div class="u-margin-bottom">
                    <button type="button" class="a-button a-button--outline" 
                            onclick="removeLocation('${location.id}')">
                        🗑️ Verwijder Locatie
                    </button>
                </div>
            </div>
        `;
    }
}

// Make functions globally available for onclick handlers
window.updateLocationField = function(locationId, field, value) {
    if (window.formStateManager) {
        window.formStateManager.updateLocationMeasure(locationId, { [field]: value });
        if (window.formRenderer) {
            window.formRenderer.renderLocationMeasurements();
        }
    }
};

window.removeLocation = function(locationId) {
    if (window.formStateManager) {
        window.formStateManager.removeLocationMeasure(locationId);
        if (window.formRenderer) {
            window.formRenderer.renderLocationMeasurements();
        }
    }
};

window.addLocation = function() {
    if (window.formStateManager) {
        window.formStateManager.addLocationMeasure();
        if (window.formRenderer) {
            window.formRenderer.renderLocationMeasurements();
        }
    }
};

// Export class
window.FormRenderer = FormRenderer;
