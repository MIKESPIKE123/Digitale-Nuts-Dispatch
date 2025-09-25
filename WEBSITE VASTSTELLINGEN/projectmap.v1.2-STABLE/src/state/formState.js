/**
 * FormState - Central state management for inspection form
 * Single source of truth for all form data
 */

/**
 * @typedef {Object} GPSData
 * @property {number|null} latitude
 * @property {number|null} longitude  
 * @property {number|null} accuracy
 * @property {'device'|'exif'|null} source
 */

/**
 * @typedef {Object} LocationMeasure
 * @property {string} id
 * @property {string} address
 * @property {number} length
 * @property {number} width
 * @property {number} area - computed: length * width
 * @property {number} permittedDuration
 * @property {number} extraDuration
 * @property {number} violationDays - computed: permittedDuration + extraDuration
 */

/**
 * @typedef {Object} MediaFile
 * @property {string} id
 * @property {string} type - 'photo' | 'pdf'
 * @property {File} file
 * @property {string} dataUrl
 * @property {Object} metadata
 */

/**
 * @typedef {Object} FormState
 * @property {string} caseId
 * @property {Object} fields - All form field values keyed by field ID
 * @property {GPSData} gps
 * @property {LocationMeasure[]} locationMeasures
 * @property {MediaFile[]} media
 * @property {Object} computed - Computed values cache
 * @property {Date} lastUpdated
 */

class FormStateManager {
    constructor() {
        this.state = this.getInitialState();
        this.listeners = new Set();
        this.schema = null;
    }

    /**
     * Get initial empty state
     * @returns {FormState}
     */
    getInitialState() {
        return {
            caseId: this.generateCaseId(),
            fields: {},
            gps: {
                latitude: null,
                longitude: null,
                accuracy: null,
                source: null
            },
            locationMeasures: [],
            media: [],
            computed: {},
            lastUpdated: new Date()
        };
    }

    /**
     * Generate unique case ID
     * @returns {string}
     */
    generateCaseId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const time = String(now.getHours()).padStart(2, '0') + 
                    String(now.getMinutes()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `VST-${year}${month}${day}-${time}${random}`;
    }

    /**
     * Set the form schema
     * @param {Object} schema 
     */
    setSchema(schema) {
        this.schema = schema;
        this.initializeDefaults();
    }

    /**
     * Initialize default values from schema
     */
    initializeDefaults() {
        if (!this.schema) return;

        const updates = {};
        Object.values(this.schema.fields).forEach(field => {
            if (field.default !== undefined) {
                if (field.default === 'today') {
                    updates[field.id] = new Date().toISOString().split('T')[0];
                } else {
                    updates[field.id] = field.default;
                }
            }
        });

        if (Object.keys(updates).length > 0) {
            this.updateState({ fields: updates });
        }
    }

    /**
     * Update state with partial updates
     * @param {Partial<FormState>} patch 
     */
    updateState(patch) {
        const oldState = { ...this.state };
        
        // Merge updates
        if (patch.fields) {
            this.state.fields = { ...this.state.fields, ...patch.fields };
        }
        if (patch.gps) {
            this.state.gps = { ...this.state.gps, ...patch.gps };
        }
        if (patch.locationMeasures) {
            this.state.locationMeasures = patch.locationMeasures;
        }
        if (patch.media) {
            this.state.media = patch.media;
        }

        this.state.lastUpdated = new Date();
        
        // Recompute derived values
        this.recompute();
        
        // Notify listeners
        this.notifyListeners(oldState, this.state);
    }

    /**
     * Recompute all derived/computed values
     */
    recompute() {
        if (!this.schema) return;

        const computed = {};

        // Compute location measures
        this.state.locationMeasures = this.state.locationMeasures.map(location => ({
            ...location,
            area: (location.length || 0) * (location.width || 0),
            violationDays: (location.permittedDuration || 0) + (location.extraDuration || 0)
        }));

        // Compute totals
        const totalArea = this.state.locationMeasures.reduce((sum, loc) => sum + (loc.area || 0), 0);
        const totalViolationDays = this.state.locationMeasures.reduce((sum, loc) => sum + (loc.violationDays || 0), 0);
        const dailyRate = this.schema.settings?.dailyRate || 5.00;
        const totalFine = dailyRate * totalArea * totalViolationDays;

        computed.totalArea = totalArea;
        computed.totalViolationDays = totalViolationDays;
        computed.totalFine = totalFine;
        computed.dailyRate = dailyRate;

        this.state.computed = computed;

        // Update computed fields in form fields
        this.state.fields = {
            ...this.state.fields,
            total_area: totalArea,
            violation_days: totalViolationDays,
            total_fine: totalFine,
            daily_rate: dailyRate
        };
    }

    /**
     * Add a location measure
     * @param {Partial<LocationMeasure>} location 
     */
    addLocationMeasure(location = {}) {
        const newLocation = {
            id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            address: '',
            length: 0,
            width: 0,
            area: 0,
            permittedDuration: 0,
            extraDuration: 0,
            violationDays: 0,
            ...location
        };

        this.updateState({
            locationMeasures: [...this.state.locationMeasures, newLocation]
        });

        return newLocation.id;
    }

    /**
     * Update a location measure
     * @param {string} id 
     * @param {Partial<LocationMeasure>} updates 
     */
    updateLocationMeasure(id, updates) {
        const locationMeasures = this.state.locationMeasures.map(location =>
            location.id === id ? { ...location, ...updates } : location
        );

        this.updateState({ locationMeasures });
    }

    /**
     * Remove a location measure
     * @param {string} id 
     */
    removeLocationMeasure(id) {
        const locationMeasures = this.state.locationMeasures.filter(location => location.id !== id);
        this.updateState({ locationMeasures });
    }

    /**
     * Add media file
     * @param {MediaFile} mediaFile 
     */
    addMediaFile(mediaFile) {
        const media = [...this.state.media, mediaFile];
        this.updateState({ media });
    }

    /**
     * Remove media file
     * @param {string} id 
     */
    removeMediaFile(id) {
        const media = this.state.media.filter(file => file.id !== id);
        this.updateState({ media });
    }

    /**
     * Update GPS data
     * @param {Partial<GPSData>} gpsData 
     */
    updateGPS(gpsData) {
        this.updateState({ gps: gpsData });

        // Also update form fields
        const fieldUpdates = {};
        if (gpsData.latitude !== undefined) {
            fieldUpdates.gps_latitude = gpsData.latitude?.toString() || '';
        }
        if (gpsData.longitude !== undefined) {
            fieldUpdates.gps_longitude = gpsData.longitude?.toString() || '';
        }
        if (gpsData.accuracy !== undefined) {
            fieldUpdates.gps_accuracy = gpsData.accuracy ? `${Math.round(gpsData.accuracy)}m` : '';
        }

        if (Object.keys(fieldUpdates).length > 0) {
            this.updateState({ fields: fieldUpdates });
        }
    }

    /**
     * Get current state (read-only)
     * @returns {FormState}
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Reset to initial state
     */
    reset() {
        const oldState = { ...this.state };
        this.state = this.getInitialState();
        if (this.schema) {
            this.initializeDefaults();
        }
        this.notifyListeners(oldState, this.state);
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback 
     * @returns {Function} unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of state change
     * @param {FormState} oldState 
     * @param {FormState} newState 
     */
    notifyListeners(oldState, newState) {
        this.listeners.forEach(callback => {
            try {
                callback(newState, oldState);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    /**
     * Export state as JSON
     * @returns {string}
     */
    exportJSON() {
        return JSON.stringify(this.state, null, 2);
    }

    /**
     * Import state from JSON
     * @param {string} json 
     */
    importJSON(json) {
        try {
            const importedState = JSON.parse(json);
            this.state = {
                ...this.getInitialState(),
                ...importedState,
                lastUpdated: new Date()
            };
            this.recompute();
            this.notifyListeners({}, this.state);
        } catch (error) {
            console.error('Error importing state:', error);
            throw new Error('Invalid JSON format');
        }
    }
}

// Export singleton instance
window.formStateManager = new FormStateManager();
