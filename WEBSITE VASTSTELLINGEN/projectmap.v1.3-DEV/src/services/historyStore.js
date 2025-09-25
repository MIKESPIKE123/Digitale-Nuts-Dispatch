/**
 * History Store - Mock service for finding timeline and cloning
 * Provides in-memory storage with API-like interface for future backend integration
 */

class HistoryStore {
    constructor() {
        this.findings = new Map();
        this.workReferences = new Map();
        this.initializeMockData();
    }

    /**
     * Initialize with mock historical data
     */
    initializeMockData() {
        const mockFindings = [
            {
                id: 'VST-2025-0901-001',
                workReference: 'PROJECT-2025-ANTWERP-001',
                timestamp: new Date('2025-09-01T10:30:00'),
                findingType: 'signalisatie_werken_uitvoering',
                utilityCompany: 'Fluvius',
                contractor: 'Cas-Vos',
                permitNumber: 'GW2025-001224',
                postcode: '2000',
                totalFine: 1250.00,
                urgentAction: true,
                status: 'completed'
            },
            {
                id: 'VST-2025-0902-002',
                workReference: 'PROJECT-2025-ANTWERP-001',
                timestamp: new Date('2025-09-02T14:15:00'),
                findingType: 'werken_uitgevoerd',
                utilityCompany: 'Fluvius',
                contractor: 'Cas-Vos',
                permitNumber: 'GW2025-001224',
                postcode: '2000',
                totalFine: 850.00,
                urgentAction: false,
                status: 'completed'
            },
            {
                id: 'VST-2025-0903-003',
                workReference: 'PROJECT-2025-ANTWERP-002',
                timestamp: new Date('2025-09-03T09:45:00'),
                findingType: 'signalisatie_geen_werken',
                utilityCompany: 'Proximus',
                contractor: 'TeleNet Construct',
                permitNumber: 'GW2025-001301',
                postcode: '2018',
                totalFine: 0,
                urgentAction: false,
                status: 'completed'
            },
            {
                id: 'VST-2025-0904-004',
                workReference: 'PROJECT-2025-ANTWERP-001',
                timestamp: new Date('2025-09-04T16:20:00'),
                findingType: 'signalisatie_werken_niet_uitvoering',
                utilityCompany: 'Fluvius',
                contractor: 'Cas-Vos',
                permitNumber: 'GW2025-001224',
                postcode: '2000',
                totalFine: 2100.00,
                urgentAction: true,
                status: 'pending'
            },
            {
                id: 'VST-2025-0905-005',
                workReference: 'PROJECT-2025-ANTWERP-003',
                timestamp: new Date('2025-09-05T11:10:00'),
                findingType: 'werken_uitgevoerd',
                utilityCompany: 'Water-link',
                contractor: 'AquaTech Solutions',
                permitNumber: 'GW2025-001402',
                postcode: '2060',
                totalFine: 675.50,
                urgentAction: false,
                status: 'completed'
            }
        ];

        // Store findings and build work reference index
        mockFindings.forEach(finding => {
            this.findings.set(finding.id, finding);
            
            if (!this.workReferences.has(finding.workReference)) {
                this.workReferences.set(finding.workReference, []);
            }
            this.workReferences.get(finding.workReference).push(finding.id);
        });
    }

    /**
     * Get findings by work reference
     * @param {string} workReference 
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    async getByWorkReference(workReference, limit = 5) {
        return new Promise(resolve => {
            setTimeout(() => {
                const findingIds = this.workReferences.get(workReference) || [];
                const findings = findingIds
                    .map(id => this.findings.get(id))
                    .filter(Boolean)
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, limit);

                resolve(findings);
            }, 100); // Simulate network delay
        });
    }

    /**
     * Get recent findings across all work references
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    async listRecent(limit = 10) {
        return new Promise(resolve => {
            setTimeout(() => {
                const allFindings = Array.from(this.findings.values())
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, limit);

                resolve(allFindings);
            }, 100);
        });
    }

    /**
     * Get a specific finding by ID
     * @param {string} findingId 
     * @returns {Promise<Object|null>}
     */
    async getFinding(findingId) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.findings.get(findingId) || null);
            }, 50);
        });
    }

    /**
     * Save a new finding
     * @param {Object} finding 
     * @returns {Promise<string>} Finding ID
     */
    async saveFinding(finding) {
        return new Promise(resolve => {
            setTimeout(() => {
                const id = finding.id || this.generateFindingId();
                const savedFinding = {
                    ...finding,
                    id,
                    timestamp: finding.timestamp || new Date(),
                    status: finding.status || 'pending'
                };

                this.findings.set(id, savedFinding);

                // Update work reference index
                if (savedFinding.workReference) {
                    if (!this.workReferences.has(savedFinding.workReference)) {
                        this.workReferences.set(savedFinding.workReference, []);
                    }
                    this.workReferences.get(savedFinding.workReference).push(id);
                }

                resolve(id);
            }, 150);
        });
    }

    /**
     * Clone finding into new form state (carry-over specific fields only)
     * @param {string} findingId 
     * @returns {Promise<Object>} Cloned form state
     */
    async cloneIntoNew(findingId) {
        const finding = await this.getFinding(findingId);
        if (!finding) {
            throw new Error('Finding not found');
        }

        // Fields to carry over (NOT including media, dates, or case-specific data)
        const carryOverFields = {
            utility_company: finding.utilityCompany,
            contractor_company: finding.contractor,
            signalization_permit_nr: finding.permitNumber,
            postcode: finding.postcode,
            utility_responsible: finding.utilityCompany // Map to responsible field
        };

        return {
            fields: carryOverFields,
            gps: {
                latitude: null,
                longitude: null,
                accuracy: null,
                source: null
            },
            locationMeasures: [], // Start fresh
            media: [], // Start fresh
            computed: {},
            clonedFrom: findingId,
            workReference: finding.workReference // Keep same work reference
        };
    }

    /**
     * Search findings by criteria
     * @param {Object} criteria 
     * @returns {Promise<Array>}
     */
    async searchFindings(criteria) {
        return new Promise(resolve => {
            setTimeout(() => {
                let results = Array.from(this.findings.values());

                // Apply filters
                if (criteria.workReference) {
                    results = results.filter(f => f.workReference === criteria.workReference);
                }
                if (criteria.utilityCompany) {
                    results = results.filter(f => f.utilityCompany === criteria.utilityCompany);
                }
                if (criteria.contractor) {
                    results = results.filter(f => f.contractor === criteria.contractor);
                }
                if (criteria.postcode) {
                    results = results.filter(f => f.postcode === criteria.postcode);
                }
                if (criteria.findingType) {
                    results = results.filter(f => f.findingType === criteria.findingType);
                }
                if (criteria.urgentOnly) {
                    results = results.filter(f => f.urgentAction === true);
                }
                if (criteria.dateFrom) {
                    const fromDate = new Date(criteria.dateFrom);
                    results = results.filter(f => f.timestamp >= fromDate);
                }
                if (criteria.dateTo) {
                    const toDate = new Date(criteria.dateTo);
                    results = results.filter(f => f.timestamp <= toDate);
                }

                // Sort by timestamp (newest first)
                results.sort((a, b) => b.timestamp - a.timestamp);

                // Apply limit
                if (criteria.limit) {
                    results = results.slice(0, criteria.limit);
                }

                resolve(results);
            }, 200);
        });
    }

    /**
     * Get work reference statistics
     * @param {string} workReference 
     * @returns {Promise<Object>}
     */
    async getWorkReferenceStats(workReference) {
        const findings = await this.getByWorkReference(workReference, 1000);

        const stats = {
            totalFindings: findings.length,
            totalFines: findings.reduce((sum, f) => sum + (f.totalFine || 0), 0),
            urgentCount: findings.filter(f => f.urgentAction).length,
            completedCount: findings.filter(f => f.status === 'completed').length,
            pendingCount: findings.filter(f => f.status === 'pending').length,
            findingTypes: {},
            contractors: new Set(),
            utilities: new Set(),
            dateRange: {
                earliest: null,
                latest: null
            }
        };

        findings.forEach(finding => {
            // Count finding types
            if (!stats.findingTypes[finding.findingType]) {
                stats.findingTypes[finding.findingType] = 0;
            }
            stats.findingTypes[finding.findingType]++;

            // Collect unique contractors and utilities
            if (finding.contractor) stats.contractors.add(finding.contractor);
            if (finding.utilityCompany) stats.utilities.add(finding.utilityCompany);

            // Track date range
            if (!stats.dateRange.earliest || finding.timestamp < stats.dateRange.earliest) {
                stats.dateRange.earliest = finding.timestamp;
            }
            if (!stats.dateRange.latest || finding.timestamp > stats.dateRange.latest) {
                stats.dateRange.latest = finding.timestamp;
            }
        });

        // Convert sets to arrays
        stats.contractors = Array.from(stats.contractors);
        stats.utilities = Array.from(stats.utilities);

        return stats;
    }

    /**
     * Generate unique finding ID
     * @returns {string}
     */
    generateFindingId() {
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
     * Export all findings as JSON
     * @returns {Promise<string>}
     */
    async exportAllFindings() {
        const allFindings = Array.from(this.findings.values());
        return JSON.stringify(allFindings, null, 2);
    }

    /**
     * Import findings from JSON
     * @param {string} jsonData 
     * @returns {Promise<number>} Number of imported findings
     */
    async importFindings(jsonData) {
        return new Promise((resolve, reject) => {
            try {
                const findings = JSON.parse(jsonData);
                let imported = 0;

                findings.forEach(finding => {
                    if (finding.id) {
                        this.findings.set(finding.id, {
                            ...finding,
                            timestamp: new Date(finding.timestamp)
                        });
                        
                        // Update work reference index
                        if (finding.workReference) {
                            if (!this.workReferences.has(finding.workReference)) {
                                this.workReferences.set(finding.workReference, []);
                            }
                            if (!this.workReferences.get(finding.workReference).includes(finding.id)) {
                                this.workReferences.get(finding.workReference).push(finding.id);
                            }
                        }
                        imported++;
                    }
                });

                resolve(imported);
            } catch (error) {
                reject(new Error('Invalid JSON format'));
            }
        });
    }

    /**
     * Clear all data (for testing)
     */
    clearAll() {
        this.findings.clear();
        this.workReferences.clear();
    }

    /**
     * Get all unique work references
     * @returns {Promise<Array>}
     */
    async getWorkReferences() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(Array.from(this.workReferences.keys()).sort());
            }, 50);
        });
    }
}

// Export singleton instance
window.historyStore = new HistoryStore();
