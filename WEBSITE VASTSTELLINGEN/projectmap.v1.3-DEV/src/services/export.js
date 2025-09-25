/**
 * Export Service - Handle JSON and CSV exports
 * Client-side export functionality for form data
 */

class ExportService {
    constructor() {
        this.stateManager = null;
    }

    /**
     * Initialize with state manager
     * @param {FormStateManager} stateManager 
     */
    init(stateManager) {
        this.stateManager = stateManager;
    }

    /**
     * Export current form state as JSON
     * @param {string} filename Optional filename
     */
    exportJSON(filename) {
        if (!this.stateManager) {
            throw new Error('ExportService not initialized');
        }

        const state = this.stateManager.getState();
        const exportData = {
            ...state,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const defaultFilename = `vaststelling_${state.caseId}_${this.formatDate(new Date())}.json`;
        
        this.downloadFile(jsonString, filename || defaultFilename, 'application/json');
    }

    /**
     * Export current form state as CSV
     * @param {string} filename Optional filename
     */
    exportCSV(filename) {
        if (!this.stateManager) {
            throw new Error('ExportService not initialized');
        }

        const state = this.stateManager.getState();
        const csvData = this.convertStateToCSV(state);
        const defaultFilename = `vaststelling_${state.caseId}_${this.formatDate(new Date())}.csv`;
        
        this.downloadFile(csvData, filename || defaultFilename, 'text/csv');
    }

    /**
     * Convert form state to CSV format
     * @param {Object} state 
     * @returns {string}
     */
    convertStateToCSV(state) {
        const rows = [];
        
        // CSV headers
        const headers = [
            'Case ID',
            'Export Date',
            'Field',
            'Value',
            'Type',
            'Block'
        ];
        rows.push(headers.join(','));

        // Add basic info
        const exportDate = new Date().toISOString();
        rows.push(this.escapeCSVRow([state.caseId, exportDate, 'case_id', state.caseId, 'meta', 'system']));
        rows.push(this.escapeCSVRow([state.caseId, exportDate, 'last_updated', state.lastUpdated.toISOString(), 'meta', 'system']));

        // Add form fields
        Object.entries(state.fields).forEach(([fieldId, value]) => {
            const displayValue = Array.isArray(value) ? value.join('; ') : String(value || '');
            rows.push(this.escapeCSVRow([state.caseId, exportDate, fieldId, displayValue, 'field', 'form']));
        });

        // Add GPS data
        if (state.gps.latitude || state.gps.longitude) {
            rows.push(this.escapeCSVRow([state.caseId, exportDate, 'gps_latitude', state.gps.latitude || '', 'gps', 'location']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, 'gps_longitude', state.gps.longitude || '', 'gps', 'location']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, 'gps_accuracy', state.gps.accuracy || '', 'gps', 'location']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, 'gps_source', state.gps.source || '', 'gps', 'location']));
        }

        // Add location measures
        state.locationMeasures.forEach((location, index) => {
            const prefix = `location_${index + 1}`;
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `${prefix}_id`, location.id, 'location', 'calculation']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `${prefix}_address`, location.address || '', 'location', 'calculation']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `${prefix}_length`, location.length || 0, 'location', 'calculation']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `${prefix}_width`, location.width || 0, 'location', 'calculation']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `${prefix}_area`, location.area || 0, 'location', 'calculation']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `${prefix}_permitted_duration`, location.permittedDuration || 0, 'location', 'calculation']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `${prefix}_extra_duration`, location.extraDuration || 0, 'location', 'calculation']));
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `${prefix}_violation_days`, location.violationDays || 0, 'location', 'calculation']));
        });

        // Add computed values
        Object.entries(state.computed).forEach(([key, value]) => {
            rows.push(this.escapeCSVRow([state.caseId, exportDate, `computed_${key}`, value, 'computed', 'calculation']));
        });

        // Add media summary
        const photoCount = state.media.filter(m => m.type === 'photo').length;
        const pdfCount = state.media.filter(m => m.type === 'pdf').length;
        const totalSize = state.media.reduce((sum, m) => sum + (m.file?.size || 0), 0);

        rows.push(this.escapeCSVRow([state.caseId, exportDate, 'media_photo_count', photoCount, 'media', 'summary']));
        rows.push(this.escapeCSVRow([state.caseId, exportDate, 'media_pdf_count', pdfCount, 'media', 'summary']));
        rows.push(this.escapeCSVRow([state.caseId, exportDate, 'media_total_size_bytes', totalSize, 'media', 'summary']));

        return rows.join('\n');
    }

    /**
     * Create a flattened summary CSV (single row per case)
     * @param {string} filename Optional filename
     */
    exportSummaryCSV(filename) {
        if (!this.stateManager) {
            throw new Error('ExportService not initialized');
        }

        const state = this.stateManager.getState();
        const csvData = this.convertStateToSummaryCSV(state);
        const defaultFilename = `vaststelling_summary_${state.caseId}_${this.formatDate(new Date())}.csv`;
        
        this.downloadFile(csvData, filename || defaultFilename, 'text/csv');
    }

    /**
     * Convert state to summary CSV (single row)
     * @param {Object} state 
     * @returns {string}
     */
    convertStateToSummaryCSV(state) {
        const summary = {
            case_id: state.caseId,
            export_date: new Date().toISOString(),
            last_updated: state.lastUpdated.toISOString(),
            
            // Key form fields
            gipod_number: state.fields.gipod_number || '',
            inspection_date: state.fields.inspection_date || '',
            description: state.fields.description || '',
            utility_company: state.fields.utility_company || '',
            utility_type: state.fields.utility_type || '',
            postcode: state.fields.postcode || '',
            supervisor: state.fields.supervisor || '',
            finding_type: state.fields.finding_type || '',
            urgent_action: state.fields.urgent_action || '',
            
            // GPS data
            gps_latitude: state.gps.latitude || '',
            gps_longitude: state.gps.longitude || '',
            gps_accuracy: state.gps.accuracy || '',
            gps_source: state.gps.source || '',
            
            // Calculations
            total_area: state.computed.totalArea || 0,
            total_violation_days: state.computed.totalViolationDays || 0,
            daily_rate: state.computed.dailyRate || 0,
            total_fine: state.computed.totalFine || 0,
            
            // Additional info
            contractor_company: state.fields.contractor_company || '',
            permit_number: state.fields.signalization_permit_nr || '',
            work_reference: state.fields.work_reference || '',
            
            // Counts
            location_count: state.locationMeasures.length,
            photo_count: state.media.filter(m => m.type === 'photo').length,
            pdf_count: state.media.filter(m => m.type === 'pdf').length,
            media_total_size: state.media.reduce((sum, m) => sum + (m.file?.size || 0), 0)
        };

        // Create headers and values
        const headers = Object.keys(summary);
        const values = Object.values(summary).map(v => v === null || v === undefined ? '' : String(v));

        return [
            headers.join(','),
            this.escapeCSVRow(values)
        ].join('\n');
    }

    /**
     * Export multiple findings (batch export)
     * @param {Array} findings Array of form states
     * @param {string} filename Optional filename
     */
    exportBatchCSV(findings, filename) {
        if (!Array.isArray(findings) || findings.length === 0) {
            throw new Error('No findings to export');
        }

        const allRows = [];
        
        // Use first finding to determine headers
        const firstSummary = this.extractSummaryFromState(findings[0]);
        const headers = Object.keys(firstSummary);
        allRows.push(headers.join(','));

        // Add each finding as a row
        findings.forEach(state => {
            const summary = this.extractSummaryFromState(state);
            const values = headers.map(header => {
                const value = summary[header];
                return value === null || value === undefined ? '' : String(value);
            });
            allRows.push(this.escapeCSVRow(values));
        });

        const defaultFilename = `vaststellingen_batch_${this.formatDate(new Date())}.csv`;
        const csvData = allRows.join('\n');
        
        this.downloadFile(csvData, filename || defaultFilename, 'text/csv');
    }

    /**
     * Extract summary object from state
     * @param {Object} state 
     * @returns {Object}
     */
    extractSummaryFromState(state) {
        return {
            case_id: state.caseId || '',
            export_date: new Date().toISOString(),
            last_updated: state.lastUpdated ? new Date(state.lastUpdated).toISOString() : '',
            gipod_number: state.fields?.gipod_number || '',
            inspection_date: state.fields?.inspection_date || '',
            description: state.fields?.description || '',
            utility_company: state.fields?.utility_company || '',
            utility_type: state.fields?.utility_type || '',
            postcode: state.fields?.postcode || '',
            supervisor: state.fields?.supervisor || '',
            finding_type: state.fields?.finding_type || '',
            urgent_action: state.fields?.urgent_action || '',
            gps_latitude: state.gps?.latitude || '',
            gps_longitude: state.gps?.longitude || '',
            gps_accuracy: state.gps?.accuracy || '',
            gps_source: state.gps?.source || '',
            total_area: state.computed?.totalArea || 0,
            total_violation_days: state.computed?.totalViolationDays || 0,
            daily_rate: state.computed?.dailyRate || 0,
            total_fine: state.computed?.totalFine || 0,
            contractor_company: state.fields?.contractor_company || '',
            permit_number: state.fields?.signalization_permit_nr || '',
            work_reference: state.fields?.work_reference || '',
            location_count: state.locationMeasures?.length || 0,
            photo_count: (state.media || []).filter(m => m.type === 'photo').length,
            pdf_count: (state.media || []).filter(m => m.type === 'pdf').length,
            media_total_size: (state.media || []).reduce((sum, m) => sum + (m.file?.size || 0), 0)
        };
    }

    /**
     * Escape CSV row values
     * @param {Array} values 
     * @returns {string}
     */
    escapeCSVRow(values) {
        return values.map(value => {
            const str = String(value || '');
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(',');
    }

    /**
     * Download file to user's device
     * @param {string} content 
     * @param {string} filename 
     * @param {string} mimeType 
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }

    /**
     * Format date for filename
     * @param {Date} date 
     * @returns {string}
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}${month}${day}_${hours}${minutes}`;
    }

    /**
     * Import JSON file
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid JSON file'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Generate export preview (first 10 lines)
     * @param {string} format 'json' or 'csv'
     * @returns {string}
     */
    generatePreview(format = 'csv') {
        if (!this.stateManager) return 'Service not initialized';

        const state = this.stateManager.getState();
        
        if (format === 'json') {
            const exportData = {
                ...state,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
            const jsonString = JSON.stringify(exportData, null, 2);
            const lines = jsonString.split('\n');
            return lines.slice(0, 10).join('\n') + (lines.length > 10 ? '\n...' : '');
        } else {
            const csvData = this.convertStateToCSV(state);
            const lines = csvData.split('\n');
            return lines.slice(0, 10).join('\n') + (lines.length > 10 ? '\n...' : '');
        }
    }
}

// Export singleton instance
window.exportService = new ExportService();
