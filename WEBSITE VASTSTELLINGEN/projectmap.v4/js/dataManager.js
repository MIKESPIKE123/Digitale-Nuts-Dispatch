/**
 * Centraal Data Management Systeem voor Vaststellingen
 * Versie: 1.0.0
 * Datum: 2025-09-09
 */

class DataManager {
    constructor() {
        this.config = null;
        this.inspections = [];
        this.configPath = './data/config.json';
        this.archivePath = './archive/';
    }

    /**
     * Laadt de configuratie uit localStorage EERST, dan JSON als fallback
     */
    async loadConfig() {
        // 1. EERST proberen localStorage (hier staan de wijzigingen!)
        console.log('🔍 Controleren localStorage voor opgeslagen wijzigingen...');
        const localConfig = this.loadConfigFromLocalStorage();
        if (localConfig) {
            console.log('✅ Configuratie geladen uit localStorage (met wijzigingen)');
            this.config = localConfig;
            return localConfig;
        }

        // 2. Als geen localStorage, probeer JSON bestand
        try {
            console.log('📄 Geen localStorage, proberen config.json te laden...');
            const response = await fetch(this.configPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.config = await response.json();
            console.log('✅ Configuratie succesvol geladen uit JSON');
            this.saveConfigToLocalStorage();
            return this.config;
        } catch (error) {
            console.warn('⚠️ Fout bij laden configuratie uit JSON:', error.message);
            console.log('🔧 Laden fallback configuratie...');
            // 3. Laatste fallback: hardcoded config
            return this.loadFallbackConfig();
        }
    }

    /**
     * Slaat configuratie op in localStorage als backup
     */
    saveConfigToLocalStorage() {
        if (this.config) {
            localStorage.setItem('vaststellingen_config', JSON.stringify(this.config));
            localStorage.setItem('vaststellingen_config_timestamp', Date.now().toString());
            
            // Update UI status if function exists
            if (typeof window.updateSaveStatus === 'function') {
                window.updateSaveStatus('Data opgeslagen');
            }
            
            console.log('💾 Configuration saved to localStorage');
        }
    }

    /**
     * Laadt configuratie uit localStorage
     */
    loadConfigFromLocalStorage() {
        const savedConfig = localStorage.getItem('vaststellingen_config');
        if (savedConfig) {
            this.config = JSON.parse(savedConfig);
            console.log('Configuratie geladen uit localStorage');
            return this.config;
        }
        return null;
    }

    /**
     * Laadt fallback configuratie als alle andere methoden falen
     */
    loadFallbackConfig() {
        console.log('Laden van fallback configuratie...');
        this.config = {
            "version": "1.0.0",
            "schema": {
                "configGroups": [
                    { "key": "utilities", "label": "Nutsbedrijven", "method": "getActiveUtilities", "addMethod": "addUtility", "fields": ["name", "type"], "active": true, "custom": false },
                    { "key": "utilityTypes", "label": "Types Nuts", "method": "getActiveUtilityTypes", "addMethod": "addUtilityType", "fields": ["name"], "active": true, "custom": false },
                    { "key": "postcodes", "label": "Postcodes", "method": "getActivePostcodes", "addMethod": "addPostcode", "fields": ["code", "description"], "active": true, "custom": false },
                    { "key": "workTypes", "label": "Werksoorten", "method": "getActiveWorkTypes", "addMethod": "addWorkType", "fields": ["name", "description"], "active": true, "custom": false },
                    { "key": "priorities", "label": "Prioriteit", "method": "getActivePriorities", "addMethod": "addPriority", "fields": ["name"], "active": true, "custom": false },
                    { "key": "weatherConditions", "label": "Weer", "method": "getActiveWeatherConditions", "addMethod": "addWeatherCondition", "fields": ["name", "icon"], "active": true, "custom": false },
                    { "key": "inspectionTypes", "label": "Controle Types", "method": "getActiveInspectionTypes", "addMethod": "addInspectionType", "fields": ["name"], "active": true, "custom": false },
                    { "key": "inspectionStatuses", "label": "Status Opties", "method": "getActiveInspectionStatuses", "addMethod": "addInspectionStatus", "fields": ["name", "color"], "active": true, "custom": false },
                    { "key": "contactRoles", "label": "Contact Rollen", "method": "getActiveContactRoles", "addMethod": "addContactRole", "fields": ["name", "description"], "active": true, "custom": false },
                    { "key": "projectManagers", "label": "Projectleiders", "method": "getActiveProjectManagers", "addMethod": "addContactPerson", "fields": ["name", "phone", "email", "company", "utilityId"], "active": true, "custom": false },
                    { "key": "contractors", "label": "Aannemers", "method": "getActiveContractors", "addMethod": "addContactPerson", "fields": ["name", "phone", "email", "company", "utilityId"], "active": true, "custom": false },
                    { "key": "cityContacts", "label": "Contact Stad", "method": "getActiveCityContacts", "addMethod": "addCityContact", "fields": ["name", "email", "phone", "department"], "active": true, "custom": false },
                    { "key": "defectTypes", "label": "Gebreken Opties", "method": "getActiveDefectTypes", "addMethod": "addDefectType", "fields": ["name"], "active": true, "custom": false },
                    { "key": "materialOptions", "label": "Materiaal Opties", "method": "getActiveMaterialOptions", "addMethod": "addMaterialOption", "fields": ["name"], "active": true, "custom": false }
                ],
                "fieldTypes": {
                    "name": { "type": "text", "label": "Naam", "required": true },
                    "code": { "type": "text", "label": "Code", "required": true },
                    "description": { "type": "text", "label": "Beschrijving", "required": false },
                    "type": { "type": "select", "label": "Type", "required": true, "source": "utilityTypes" },
                    "phone": { "type": "tel", "label": "Telefoon", "required": false },
                    "email": { "type": "email", "label": "Email", "required": false },
                    "company": { "type": "text", "label": "Bedrijf", "required": false },
                    "utilityId": { "type": "select", "label": "Gekoppeld Nutsbedrijf", "required": false, "source": "utilities" },
                    "department": { "type": "text", "label": "Afdeling", "required": false },
                    "icon": { "type": "text", "label": "Icoon (emoji)", "required": false },
                    "color": { "type": "color", "label": "Kleur", "required": false, "default": "#3498db" }
                }
            },
            "configuration": {
                "supervisors": [
                    {"id": "fred", "name": "Fred Stoks", "phone": "03-338-1234", "employeeId": "FS001", "email": "fred.stoks@antwerpen.be", "department": "Toezicht Water", "active": true},
                    {"id": "erik", "name": "Erik Vanboven", "phone": "03-338-1235", "employeeId": "EV002", "email": "erik.vanboven@antwerpen.be", "department": "Toezicht Elektriciteit", "active": true},
                    {"id": "luc", "name": "Luc Smets", "phone": "03-338-1236", "employeeId": "LS003", "email": "luc.smets@antwerpen.be", "department": "Toezicht Gas", "active": true},
                    {"id": "marc", "name": "Marc Vereycken", "phone": "03-338-1237", "employeeId": "MV004", "email": "marc.vereycken@antwerpen.be", "department": "Toezicht Water", "active": true},
                    {"id": "paul", "name": "Paul Cornelis", "phone": "03-338-1238", "employeeId": "PC005", "email": "paul.cornelis@antwerpen.be", "department": "Toezicht Elektriciteit", "active": true},
                    {"id": "chris_vl", "name": "Chris Vanlerberghe", "phone": "03-338-1239", "employeeId": "CV006", "email": "chris.vanlerberghe@antwerpen.be", "department": "Toezicht Gas", "active": true},
                    {"id": "dieter", "name": "Dieter van Meensel", "phone": "03-338-1240", "employeeId": "DM007", "email": "dieter.vanmeensel@antwerpen.be", "department": "Toezicht Water", "active": true},
                    {"id": "kenney", "name": "Kenney", "phone": "03-338-1241", "employeeId": "KN008", "email": "kenney@antwerpen.be", "department": "Toezicht Algemeen", "active": true},
                    {"id": "bram", "name": "Bram Coenen", "phone": "03-338-1242", "employeeId": "BC009", "email": "bram.coenen@antwerpen.be", "department": "Toezicht Elektriciteit", "active": true},
                    {"id": "david", "name": "David de Weerdt", "phone": "03-338-1243", "employeeId": "DW010", "email": "david.deweerdt@antwerpen.be", "department": "Toezicht Gas", "active": true},
                    {"id": "francois", "name": "Francois va eyck", "phone": "03-338-1244", "employeeId": "FE011", "email": "francois.vaeyck@antwerpen.be", "department": "Toezicht Water", "active": true},
                    {"id": "ingrid", "name": "Ingrid", "phone": "03-338-1245", "employeeId": "IN012", "email": "ingrid@antwerpen.be", "department": "Toezicht Algemeen", "active": true},
                    {"id": "jill", "name": "Jill", "phone": "03-338-1246", "employeeId": "JL013", "email": "jill@antwerpen.be", "department": "Toezicht Elektriciteit", "active": true},
                    {"id": "michel Gerits", "name": "Michel", "phone": "03-338-1247", "employeeId": "MG014", "email": "michel.gerits@antwerpen.be", "department": "Toezicht Gas", "active": true},
                    {"id": "jens", "name": "Jens", "phone": "03-338-1248", "employeeId": "JS015", "email": "jens@antwerpen.be", "department": "Toezicht Water", "active": true},
                    {"id": "patrick", "name": "Patrick", "phone": "03-338-1249", "employeeId": "PT016", "email": "patrick@antwerpen.be", "department": "Toezicht Algemeen", "active": true},
                    {"id": "chris_s", "name": "Chris S.", "phone": "03-338-1250", "employeeId": "CS017", "email": "chris.s@antwerpen.be", "department": "Toezicht Elektriciteit", "active": true},
                    {"id": "werner", "name": "Werner", "phone": "03-338-1251", "employeeId": "WR018", "email": "werner@antwerpen.be", "department": "Toezicht Gas", "active": true},
                    {"id": "maarten", "name": "Maarten", "phone": "03-338-1252", "employeeId": "MT019", "email": "maarten@antwerpen.be", "department": "Toezicht Water", "active": true},
                    {"id": "dave", "name": "Dave", "phone": "03-338-1253", "employeeId": "DV020", "email": "dave@antwerpen.be", "department": "Toezicht Algemeen", "active": true},
                    {"id": "staf", "name": "Staf", "phone": "03-338-1254", "employeeId": "SF021", "email": "staf@antwerpen.be", "department": "Toezicht Elektriciteit", "active": true},
                    {"id": "stefan", "name": "Stefan", "phone": "03-338-1255", "employeeId": "ST022", "email": "stefan@antwerpen.be", "department": "Toezicht Gas", "active": false}
                ],
                "utilityTypes": [
                    {"id": "electriciteit", "name": "Electriciteit", "active": true},
                    {"id": "water", "name": "Water", "active": true},
                    {"id": "gas", "name": "Gas", "active": true},
                    {"id": "riolering", "name": "Riolering", "active": true},
                    {"id": "telecom", "name": "Telecom", "active": true},
                    {"id": "warmte", "name": "Warmte", "active": true},
                    {"id": "andere", "name": "Andere", "active": true}
                ],
                "utilities": [
                    {"id": "fluvius", "name": "FLUVIUS", "type": "electriciteit", "active": true},
                    {"id": "proximus", "name": "PROXIMUS", "type": "telecom", "active": true},
                    {"id": "wyre", "name": "WYRE", "type": "telecom", "active": true},
                    {"id": "waterlink_rio", "name": "WATER-LINK(Rio)", "type": "riolering", "active": true},
                    {"id": "waterlink_water", "name": "WATER-LINK(Water)", "type": "water", "active": true},
                    {"id": "fluvius_warmte", "name": "FLUVIUS WARMTE", "type": "warmte", "active": true}
                ],
                "postcodes": [
                    {"id": "2000", "code": "2000", "description": "Antwerpen (Centrum)", "active": true},
                    {"id": "2018", "code": "2018", "description": "Antwerpen (Zuid)", "active": true},
                    {"id": "2020", "code": "2020", "description": "Antwerpen (Kiel)", "active": true},
                    {"id": "2030", "code": "2030", "description": "Antwerpen (Noord)", "active": true},
                    {"id": "2040", "code": "2040", "description": "Antwerpen (Lillo, Berendrecht, Zandvliet)", "active": true},
                    {"id": "2050", "code": "2050", "description": "Antwerpen (Linkeroever)", "active": true},
                    {"id": "2060", "code": "2060", "description": "Antwerpen (Dam, Stuivenberg, Seefhoek)", "active": true},
                    {"id": "2100", "code": "2100", "description": "Deurne", "active": true},
                    {"id": "2140", "code": "2140", "description": "Borgerhout", "active": true},
                    {"id": "2150", "code": "2150", "description": "Borsbeek", "active": true},
                    {"id": "2170", "code": "2170", "description": "Merksem", "active": true},
                    {"id": "2180", "code": "2180", "description": "Ekeren", "active": true},
                    {"id": "2600", "code": "2600", "description": "Berchem", "active": true},
                    {"id": "2610", "code": "2610", "description": "Wilrijk", "active": true},
                    {"id": "2660", "code": "2660", "description": "Hoboken", "active": true}
                ],
                "workTypes": [
                    {"id": "executie_check", "name": "Werken uitgevoerd controle", "description": "Controle of werken correct uitgevoerd zijn", "active": true},
                    {"id": "visibility_check", "name": "Zichtbaarheid controle", "description": "Controle of werk zichtbaar OK is", "active": true},
                    {"id": "material_check", "name": "Materiaal controle", "description": "Controle op achtergebleven materiaal", "active": true},
                    {"id": "defect_check", "name": "Gebreken controle", "description": "Controle op vastgestelde gebreken", "active": true}
                ],
                "inspectionStatuses": [
                    {"id": "nieuw", "name": "Nieuw", "color": "#3498db", "active": true},
                    {"id": "in_behandeling", "name": "In Behandeling", "color": "#f39c12", "active": true},
                    {"id": "voltooid", "name": "Voltooid", "color": "#27ae60", "active": true},
                    {"id": "afgekeurd", "name": "Afgekeurd", "color": "#e74c3c", "active": true}
                ],
                "materialOptions": [
                    {"id": "geen_materiaal", "name": "NEEN, Geen materiaal achtergelaten", "active": true},
                    {"id": "signalisatie", "name": "JA, Signalisatie achtergelaten", "active": true},
                    {"id": "los_materiaal", "name": "JA, Los materiaal achtergelaten", "active": true},
                    {"id": "materiaal_signalisatie", "name": "JA, Materiaal en Signalisatie achtergelaten", "active": true}
                ],
                "defectTypes": [
                    {"id": "bezanding", "name": "Bezanding zichtbaar", "active": true},
                    {"id": "materiaal_afwijking", "name": "Materiaal wijkt af van omgevend materiaal", "active": true},
                    {"id": "gebroken_stenen", "name": "Gebroken stenen", "active": true},
                    {"id": "open_voegen", "name": "Grote open voegen", "active": true},
                    {"id": "verzakking", "name": "Verzakking of verhoging zichtbaar", "active": true},
                    {"id": "slecht_geplaatst", "name": "Stenen slecht teruggeplaatst", "active": true}
                ],
                "priorities": [
                    {"id": "laag", "name": "Laag", "active": true},
                    {"id": "normaal", "name": "Normaal", "active": true},
                    {"id": "hoog", "name": "Hoog", "active": true}
                ],
                "inspectionResults": [
                    {"id": "conform", "name": "Conform", "active": true},
                    {"id": "afwijking", "name": "Afwijking", "active": true},
                    {"id": "niet_conform", "name": "Niet conform", "active": true}
                ],
                "contactRoles": [
                    {"id": "aannemer", "name": "Aannemer", "description": "Hoofdaannemer", "active": true},
                    {"id": "toezichthouder", "name": "Toezichthouder", "description": "Toezicht ter plaatse", "active": true},
                    {"id": "projectmanager", "name": "Projectmanager", "description": "Verantwoordelijke projectmanager", "active": true}
                ],
                "contactPersons": [
                    {"id": "jan_janssen", "name": "Jan Janssen", "phone": "+32 123 456 789", "email": "jan.janssen@example.com", "company": "Bouwbedrijf Janssen", "role": "aannemer", "utilityId": "", "active": true},
                    {"id": "marie_pieters", "name": "Marie Pieters", "phone": "+32 234 567 890", "email": "marie.pieters@fluvius.be", "company": "Fluvius", "role": "projectmanager", "utilityId": "fluvius", "active": true},
                    {"id": "peter_vandenberghe", "name": "Peter Vandenberghe", "phone": "+32 345 678 901", "email": "peter.vdb@veiligheid.be", "company": "Veiligheid Plus", "role": "toezichthouder", "utilityId": "", "active": true},
                    {"id": "sarah_willems", "name": "Sarah Willems", "phone": "+32 456 789 012", "email": "sarah.willems@proximus.be", "company": "Proximus", "role": "projectmanager", "utilityId": "proximus", "active": true},
                    {"id": "tom_martens", "name": "Tom Martens", "phone": "+32 567 890 123", "email": "tom.martens@waterlink.be", "company": "Water-link", "role": "projectmanager", "utilityId": "waterlink_water", "active": true}
                ],
                "cityContacts": [
                    {"id": "wegen_antwerpen", "name": "Wegen Antwerpen", "email": "wegen@antwerpen.be", "phone": "+32 3 338 3000", "department": "Wegen", "active": true}
                ],
                "inspectionTypes": [
                    {"id": "voorinspectie", "name": "Voorinspectie", "active": true},
                    {"id": "eindcontrole", "name": "Eindcontrole", "active": true},
                    {"id": "tussentijdse_controle", "name": "Tussentijdse controle", "active": true}
                ],
                "weatherConditions": [
                    {"id": "zonnig", "name": "Zonnig", "icon": "☀️", "active": true},
                    {"id": "bewolkt", "name": "Bewolkt", "icon": "☁️", "active": true},
                    {"id": "regen", "name": "Regen", "icon": "🌧️", "active": true},
                    {"id": "mist", "name": "Mist", "icon": "🌫️", "active": true}
                ]
            }
        };
        
        console.log('Fallback configuratie geladen');
        this.saveConfigToLocalStorage();
        return this.config;
    }

    /**
     * Haalt alle actieve supervisors op
     */
    getActiveSupervisors() {
        if (!this.config) return [];
        return this.config.configuration.supervisors.filter(s => s.active);
    }

    /**
     * Haalt alle inactieve supervisors op
     */
    getInactiveSupervisors() {
        if (!this.config) return [];
        return this.config.configuration.supervisors.filter(s => !s.active);
    }

    /**
     * Haalt alle supervisors op (actief + inactief)
     */
    getAllSupervisors() {
        if (!this.config) return [];
        return this.config.configuration.supervisors;
    }

    /**
     * Haalt alle actieve postcodes op
     */
    getActivePostcodes() {
        if (!this.config) return [];
        return this.config.configuration.postcodes.filter(p => p.active);
    }

    /**
     * Haalt alle actieve utility types op
     */
    getActiveUtilityTypes() {
        if (!this.config) return [];
        return this.config.configuration.utilityTypes.filter(t => t.active);
    }

    /**
     * Haalt alle actieve utilities op
     */
    getActiveUtilities() {
        if (!this.config) return [];
        return this.config.configuration.utilities.filter(u => u.active);
    }

    /**
     * Haalt utilities op per type
     */
    getUtilitiesByType(typeId) {
        if (!this.config) return [];
        return this.config.configuration.utilities.filter(u => u.active && u.type === typeId);
    }

    /**
     * Haalt alle actieve werksoorten op
     */
    getActiveWorkTypes() {
        if (!this.config) return [];
        return this.config.configuration.workTypes.filter(w => w.active);
    }

    /**
     * Haalt alle actieve vaststellingsstatussen op
     */
    getActiveInspectionStatuses() {
        if (!this.config) return [];
        return this.config.configuration.inspectionStatuses.filter(s => s.active);
    }

    /**
     * Haalt alle actieve prioriteiten op
     */
    getActivePriorities() {
        if (!this.config) return [];
        return this.config.configuration.priorities.filter(p => p.active);
    }

    /**
     * Haalt alle actieve vaststellingsresultaten op
     */
    getActiveInspectionResults() {
        if (!this.config) return [];
        return this.config.configuration.inspectionResults.filter(r => r.active);
    }

    /**
     * Haalt alle actieve contactrollen op
     */
    getActiveContactRoles() {
        if (!this.config) return [];
        return this.config.configuration.contactRoles.filter(r => r.active);
    }

    /**
     * Haalt alle actieve controle types op
     */
    getActiveInspectionTypes() {
        if (!this.config) return [];
        return this.config.configuration.inspectionTypes.filter(t => t.active);
    }

    /**
     * Haalt alle actieve weersomstandigheden op
     */
    getActiveWeatherConditions() {
        if (!this.config) return [];
        return this.config.configuration.weatherConditions.filter(w => w.active);
    }

    /**
     * Haalt alle actieve contactpersonen op
     */
    getActiveContactPersons() {
        if (!this.config) return [];
        return this.config.configuration.contactPersons ? this.config.configuration.contactPersons.filter(c => c.active) : [];
    }

    /**
     * Haalt contactpersonen op gefilterd op rol
     */
    getContactPersonsByRole(roleId) {
        if (!this.config) return [];
        const allContacts = this.getActiveContactPersons();
        return allContacts.filter(contact => contact.role === roleId);
    }

    /**
     * Haalt alle actieve defect types op
     */
    getActiveDefectTypes() {
        if (!this.config) return [];
        return this.config.configuration.defectTypes ? this.config.configuration.defectTypes.filter(d => d.active) : [];
    }

    /**
     * Haalt alle actieve stad contacten op
     */
    getActiveCityContacts() {
        if (!this.config) return [];
        return this.config.configuration.cityContacts ? this.config.configuration.cityContacts.filter(c => c.active) : [];
    }

    /**
     * Haalt alle actieve materiaal opties op
     */
    getActiveMaterialOptions() {
        if (!this.config) return [];
        return this.config.configuration.materialOptions ? this.config.configuration.materialOptions.filter(m => m.active) : [];
    }

    /**
     * Haalt projectleiders op (contactpersonen met rol 'projectmanager')
     */
    getActiveProjectManagers() {
        return this.getContactPersonsByRole('projectmanager');
    }

    /**
     * Haalt aannemers op (contactpersonen met rol 'aannemer')
     */
    getActiveContractors() {
        return this.getContactPersonsByRole('aannemer');
    }

    /**
     * Haalt contactpersonen op gekoppeld aan een specific utility
     */
    getContactPersonsByUtility(utilityId) {
        if (!this.config) return [];
        const allContacts = this.getActiveContactPersons();
        return allContacts.filter(contact => contact.utilityId === utilityId);
    }

    /**
     * Voegt een nieuwe supervisor toe
     */
    /**
     * Voegt nieuwe supervisor toe met uitgebreide data
     * @param {Object} supervisorData - Object met naam, telefoon, personeelsnr, email, afdeling
     * @returns {boolean|Object} - false bij fout, supervisor object bij succes
     */
    addSupervisor(supervisorData) {
        console.log('🔥 DataManager.addSupervisor called with:', supervisorData);
        
        if (!this.config) {
            console.error('❌ No config in DataManager.addSupervisor');
            return false;
        }
        
        // Support voor oude API (alleen naam string)
        if (typeof supervisorData === 'string') {
            supervisorData = { name: supervisorData };
        }
        
        const { name, phone, employeeId, email, department } = supervisorData;
        
        if (!name || name.trim() === '') {
            console.error('❌ Name is required for supervisor');
            return false;
        }
        
        console.log('🔥 Current supervisors count:', this.config.configuration.supervisors.length);
        
        // Uitgebreide duplicaat controle
        const duplicateCheck = this.checkSupervisorDuplicate({
            name: name.trim(),
            phone: phone?.trim(),
            employeeId: employeeId?.trim(),
            email: email?.trim()
        });
        
        if (duplicateCheck.isDuplicate) {
            console.warn('⚠️ Supervisor duplicate detected:', duplicateCheck.reason);
            return { error: 'duplicate', reason: duplicateCheck.reason, existing: duplicateCheck.existing };
        }
        
        // Generate unique ID
        const id = this.generateSupervisorId(name);
        
        const newSupervisor = {
            id: id,
            name: name.trim(),
            phone: phone?.trim() || '',
            employeeId: employeeId?.trim() || '',
            email: email?.trim() || '',
            department: department?.trim() || 'Toezicht Algemeen',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        console.log('🔥 Adding new supervisor:', newSupervisor);
        
        this.config.configuration.supervisors.push(newSupervisor);
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        
        console.log('🔥 Supervisors count after add:', this.config.configuration.supervisors.length);
        
        this.saveConfigToLocalStorage();
        console.log('✅ Supervisor added and config saved');
        return newSupervisor;
    }

    /**
     * Controleert of een supervisor een duplicaat is
     */
    checkSupervisorDuplicate(data) {
        const supervisors = this.config.configuration.supervisors;
        
        // Check op naam (case insensitive)
        let existing = supervisors.find(s => 
            s.name.toLowerCase().trim() === data.name.toLowerCase().trim()
        );
        if (existing) {
            return { 
                isDuplicate: true, 
                reason: `Naam "${data.name}" bestaat al`, 
                existing: existing 
            };
        }
        
        // Check op personeelsnummer (als opgegeven)
        if (data.employeeId && data.employeeId !== '') {
            existing = supervisors.find(s => 
                s.employeeId && s.employeeId.toLowerCase().trim() === data.employeeId.toLowerCase().trim()
            );
            if (existing) {
                return { 
                    isDuplicate: true, 
                    reason: `Personeelsnummer "${data.employeeId}" bestaat al bij ${existing.name}`, 
                    existing: existing 
                };
            }
        }
        
        // Check op email (als opgegeven)
        if (data.email && data.email !== '') {
            existing = supervisors.find(s => 
                s.email && s.email.toLowerCase().trim() === data.email.toLowerCase().trim()
            );
            if (existing) {
                return { 
                    isDuplicate: true, 
                    reason: `Email "${data.email}" bestaat al bij ${existing.name}`, 
                    existing: existing 
                };
            }
        }
        
        // Check op telefoonnummer (als opgegeven)
        if (data.phone && data.phone !== '') {
            existing = supervisors.find(s => 
                s.phone && s.phone.replace(/\D/g, '') === data.phone.replace(/\D/g, '')
            );
            if (existing) {
                return { 
                    isDuplicate: true, 
                    reason: `Telefoonnummer "${data.phone}" bestaat al bij ${existing.name}`, 
                    existing: existing 
                };
            }
        }
        
        return { isDuplicate: false };
    }

    /**
     * Genereert unieke ID voor supervisor
     */
    generateSupervisorId(name) {
        const baseId = name.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .substring(0, 20);
        
        const existingIds = this.config.configuration.supervisors.map(s => s.id);
        let id = baseId;
        let counter = 1;
        
        while (existingIds.includes(id)) {
            id = `${baseId}_${counter}`;
            counter++;
        }
        
        return id;
    }

    /**
     * Voegt een nieuwe postcode toe
     */
    addPostcode(code, description) {
        if (!this.config) return false;
        
        const newPostcode = {
            id: code,
            code: code,
            description: description,
            active: true
        };
        
        this.config.configuration.postcodes.push(newPostcode);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe utility toe
     */
    addUtility(name, type) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newUtility = {
            id: id,
            name: name,
            type: type,
            active: true
        };
        
        this.config.configuration.utilities.push(newUtility);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe utility type toe
     */
    addUtilityType(name) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newUtilityType = {
            id: id,
            name: name,
            active: true
        };
        
        this.config.configuration.utilityTypes.push(newUtilityType);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe werksoort toe
     */
    addWorkType(name, description) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newWorkType = {
            id: id,
            name: name,
            description: description || '',
            active: true
        };
        
        this.config.configuration.workTypes.push(newWorkType);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe prioriteit toe
     */
    addPriority(name) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newPriority = {
            id: id,
            name: name,
            active: true
        };
        
        this.config.configuration.priorities.push(newPriority);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe status toe
     */
    addInspectionStatus(name, color = '#3498db') {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newStatus = {
            id: id,
            name: name,
            color: color,
            active: true
        };
        
        this.config.configuration.inspectionStatuses.push(newStatus);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe weersomstandigheid toe
     */
    addWeatherCondition(name, icon = '') {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newWeatherCondition = {
            id: id,
            name: name,
            icon: icon,
            active: true
        };
        
        this.config.configuration.weatherConditions.push(newWeatherCondition);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe controle type toe
     */
    addInspectionType(name) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newInspectionType = {
            id: id,
            name: name,
            active: true
        };
        
        this.config.configuration.inspectionTypes.push(newInspectionType);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe contactrol toe
     */
    addContactRole(name, description) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newRole = {
            id: id,
            name: name,
            description: description || '',
            active: true
        };
        
        this.config.configuration.contactRoles.push(newRole);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe contactpersoon toe
     */
    addContactPerson(name, phone, email, company, role) {
        if (!this.config) return false;
        
        // Zorg ervoor dat contactPersons array bestaat
        if (!this.config.configuration.contactPersons) {
            this.config.configuration.contactPersons = [];
        }
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newPerson = {
            id: id,
            name: name,
            phone: phone || '',
            email: email || '',
            company: company || '',
            role: role,
            active: true
        };
        
        this.config.configuration.contactPersons.push(newPerson);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Deactiveert een item (zet active op false)
     */
    deactivateItem(category, id) {
        if (!this.config) return false;
        
        const items = this.config.configuration[category];
        const item = items.find(i => i.id === id);
        if (item) {
            item.active = false;
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Activeert een item (zet active op true)
     */
    activateItem(category, id) {
        console.log('🔧 DataManager.activateItem called:', category, id);
        
        if (!this.config) {
            console.error('❌ No config available');
            return false;
        }
        
        const items = this.config.configuration[category];
        console.log('🔧 Items in category:', items ? items.length : 'null');
        
        const item = items.find(i => i.id === id);
        console.log('🔧 Found item:', item);
        
        if (item) {
            console.log('🔧 Item active before:', item.active);
            item.active = true;
            console.log('🔧 Item active after:', item.active);
            this.saveConfigToLocalStorage();
            console.log('🔧 Config saved');
            return true;
        }
        console.error('❌ Item not found in activateItem');
        return false;
    }

    /**
     * Update een supervisor
     */
    /**
     * Update een supervisor met nieuwe data
     * @param {string} id - Supervisor ID
     * @param {string|Object} updateData - Nieuwe naam (string) of object met meerdere velden
     */
    updateSupervisor(id, updateData) {
        if (!this.config) return false;
        
        const supervisor = this.config.configuration.supervisors.find(s => s.id === id);
        if (!supervisor) return false;
        
        // Support voor oude API (alleen naam string)
        if (typeof updateData === 'string') {
            supervisor.name = updateData;
        } else {
            // Update meerdere velden
            if (updateData.name !== undefined) supervisor.name = updateData.name;
            if (updateData.phone !== undefined) supervisor.phone = updateData.phone;
            if (updateData.employeeId !== undefined) supervisor.employeeId = updateData.employeeId;
            if (updateData.email !== undefined) supervisor.email = updateData.email;
            if (updateData.department !== undefined) supervisor.department = updateData.department;
        }
        
        // Update timestamp
        supervisor.updatedAt = new Date().toISOString();
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        this.saveConfigToLocalStorage();
        
        console.log('✅ Supervisor updated:', supervisor);
        return true;
    }

    /**
     * Update een postcode
     */
    updatePostcode(id, newCode, newDescription) {
        if (!this.config) return false;
        
        const postcode = this.config.configuration.postcodes.find(p => p.id === id);
        if (postcode) {
            postcode.code = newCode;
            postcode.description = newDescription;
            // Update ID als code verandert
            if (id !== newCode) {
                postcode.id = newCode;
            }
            this.config.lastUpdated = new Date().toISOString().split('T')[0];
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Update een utility
     */
    updateUtility(id, newName, newType) {
        if (!this.config) return false;
        
        const utility = this.config.configuration.utilities.find(u => u.id === id);
        if (utility) {
            utility.name = newName;
            utility.type = newType;
            this.config.lastUpdated = new Date().toISOString().split('T')[0];
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

        // ===== INSPECTION METHODS =====

    /**
     * Save a new inspection
     */
    saveInspection(inspectionData) {
        try {
            // Create inspection object
            const inspection = {
                id: Date.now().toString(), // Simple ID generation
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...inspectionData
            };

            // Save to localStorage (if implemented)
            const inspections = this.getInspections();
            inspections.push(inspection);
            localStorage.setItem('vaststellingen_inspections', JSON.stringify(inspections));

            console.log('✅ Inspection saved:', inspection);
            return inspection.id;

        } catch (error) {
            console.error('❌ Error saving inspection:', error);
            throw error;
        }
    }

    /**
     * Get all inspections
     */
    getInspections() {
        try {
            const stored = localStorage.getItem('vaststellingen_inspections');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ Error loading inspections:', error);
            return [];
        }
    }

    /**
     * Get inspection by ID
     */
    getInspection(id) {
        const inspections = this.getInspections();
        return inspections.find(inspection => inspection.id === id);
    }

    /**
     * Update inspection
     */
    updateInspection(id, updatedData) {
        try {
            const inspections = this.getInspections();
            const index = inspections.findIndex(inspection => inspection.id === id);
            
            if (index === -1) {
                throw new Error('Inspection not found');
            }

            inspections[index] = {
                ...inspections[index],
                ...updatedData,
                updated_at: new Date().toISOString()
            };

            localStorage.setItem('vaststellingen_inspections', JSON.stringify(inspections));
            console.log('✅ Inspection updated:', inspections[index]);
            
            return inspections[index];

        } catch (error) {
            console.error('❌ Error updating inspection:', error);
            throw error;
        }
    }

    /**
     * Delete inspection
     */
    deleteInspection(id) {
        try {
            const inspections = this.getInspections();
            const filteredInspections = inspections.filter(inspection => inspection.id !== id);
            
            localStorage.setItem('vaststellingen_inspections', JSON.stringify(filteredInspections));
            console.log('✅ Inspection deleted:', id);
            
            return true;

        } catch (error) {
            console.error('❌ Error deleting inspection:', error);
            throw error;
        }
    }

    // ===== DASHBOARD DATA =====

    /**
     * Verwijder een supervisor
     */
    deleteSupervisor(id) {
        if (!this.config) return false;
        
        const index = this.config.configuration.supervisors.findIndex(s => s.id === id);
        if (index !== -1) {
            this.config.configuration.supervisors.splice(index, 1);
            this.config.lastUpdated = new Date().toISOString().split('T')[0];
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Verwijder een utility
     */
    deleteUtility(id) {
        if (!this.config) return false;
        
        const index = this.config.configuration.utilities.findIndex(u => u.id === id);
        if (index !== -1) {
            this.config.configuration.utilities.splice(index, 1);
            this.config.lastUpdated = new Date().toISOString().split('T')[0];
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Verwijder een postcode
     */
    deletePostcode(id) {
        if (!this.config) return false;
        
        const index = this.config.configuration.postcodes.findIndex(p => p.id === id);
        if (index !== -1) {
            this.config.configuration.postcodes.splice(index, 1);
            this.config.lastUpdated = new Date().toISOString().split('T')[0];
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Update een werksoort
     */
    updateWorkType(id, newName, newDescription) {
        if (!this.config) return false;
        
        const workType = this.config.configuration.workTypes.find(w => w.id === id);
        if (workType) {
            workType.name = newName;
            workType.description = newDescription;
            this.config.lastUpdated = new Date().toISOString().split('T')[0];
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Update een status
     */
    updateInspectionStatus(id, newName, newColor) {
        if (!this.config) return false;
        
        const status = this.config.configuration.inspectionStatuses.find(s => s.id === id);
        if (status) {
            status.name = newName;
            status.color = newColor;
            this.config.lastUpdated = new Date().toISOString().split('T')[0];
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Update een contactrol
     */
    updateContactRole(id, newName, newDescription) {
        if (!this.config) return false;
        
        const role = this.config.configuration.contactRoles.find(r => r.id === id);
        if (role) {
            role.name = newName;
            role.description = newDescription;
            this.config.lastUpdated = new Date().toISOString().split('T')[0];
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Voegt een nieuwe defect type toe
     */
    addDefectType(name) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newDefectType = {
            id: id,
            name: name,
            active: true
        };
        
        // Zorg ervoor dat defectTypes array bestaat
        if (!this.config.configuration.defectTypes) {
            this.config.configuration.defectTypes = [];
        }
        
        this.config.configuration.defectTypes.push(newDefectType);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe materiaal optie toe
     */
    addMaterialOption(name) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newMaterialOption = {
            id: id,
            name: name,
            active: true
        };
        
        // Zorg ervoor dat materialOptions array bestaat
        if (!this.config.configuration.materialOptions) {
            this.config.configuration.materialOptions = [];
        }
        
        this.config.configuration.materialOptions.push(newMaterialOption);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Voegt een nieuwe stad contact toe
     */
    addCityContact(name, email, phone, department) {
        if (!this.config) return false;
        
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newCityContact = {
            id: id,
            name: name,
            email: email || '',
            phone: phone || '',
            department: department || '',
            active: true
        };
        
        // Zorg ervoor dat cityContacts array bestaat
        if (!this.config.configuration.cityContacts) {
            this.config.configuration.cityContacts = [];
        }
        
        this.config.configuration.cityContacts.push(newCityContact);
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Update een contactpersoon
     */
    updateContactPerson(id, updateData) {
        if (!this.config) return false;
        
        const person = this.config.configuration.contactPersons.find(p => p.id === id);
        if (!person) return false;
        
        // Update velden
        if (updateData.name !== undefined) person.name = updateData.name;
        if (updateData.phone !== undefined) person.phone = updateData.phone;
        if (updateData.email !== undefined) person.email = updateData.email;
        if (updateData.company !== undefined) person.company = updateData.company;
        if (updateData.utilityId !== undefined) person.utilityId = updateData.utilityId;
        
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        this.saveConfigToLocalStorage();
        
        return true;
    }

    /**
     * Slaat een vaststelling op in het archief
     */
    saveInspection(inspectionData) {
        const timestamp = new Date();
        const inspection = {
            id: this.generateInspectionId(timestamp),
            timestamp: timestamp.toISOString(),
            data: inspectionData,
            status: 'completed'
        };

        // Opslaan in localStorage
        const existingInspections = JSON.parse(localStorage.getItem('vaststellingen_archive') || '[]');
        existingInspections.push(inspection);
        localStorage.setItem('vaststellingen_archive', JSON.stringify(existingInspections));

        console.log('Vaststelling opgeslagen:', inspection.id);
        return inspection.id;
    }

    /**
     * Genereert een unieke ID voor een vaststelling
     */
    generateInspectionId(timestamp) {
        const date = timestamp.toISOString().split('T')[0].replace(/-/g, '');
        const time = timestamp.toTimeString().split(' ')[0].replace(/:/g, '');
        const random = Math.random().toString(36).substr(2, 4);
        return `VST_${date}_${time}_${random}`;
    }

    /**
     * Haalt alle vaststellingen op uit het archief
     */
    getArchivedInspections() {
        return JSON.parse(localStorage.getItem('vaststellingen_archive') || '[]');
    }

    /**
     * Haalt vaststellingen op per datum range
     */
    getInspectionsByDateRange(startDate, endDate) {
        const allInspections = this.getArchivedInspections();
        return allInspections.filter(inspection => {
            const inspectionDate = new Date(inspection.timestamp);
            return inspectionDate >= new Date(startDate) && inspectionDate <= new Date(endDate);
        });
    }

    /**
     * Exporteert vaststellingen naar CSV
     */
    exportInspectionsToCSV(inspections = null) {
        const data = inspections || this.getArchivedInspections();
        if (data.length === 0) return '';

        const headers = ['ID', 'Datum', 'Type', 'NUTS', 'Postcode', 'Start Datum', 'Eind Datum', 'Vaststeller'];
        const csvContent = [
            headers.join(','),
            ...data.map(inspection => [
                inspection.id,
                new Date(inspection.timestamp).toLocaleDateString('nl-BE'),
                inspection.data.type || '',
                inspection.data.nuts || '',
                inspection.data.postcode || '',
                inspection.data.start_date || '',
                inspection.data.end_date || '',
                inspection.data.supervisor || ''
            ].join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * Download CSV bestand
     */
    downloadCSV(filename = 'vaststellingen_export.csv', inspections = null) {
        const csvContent = this.exportInspectionsToCSV(inspections);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Valideert configuratie integriteit
     */
    validateConfig() {
        if (!this.config) return { valid: false, errors: ['Configuratie niet geladen'] };

        const errors = [];
        const config = this.config.configuration;

        // Controleer verplichte secties
        if (!config.supervisors || !Array.isArray(config.supervisors)) {
            errors.push('Supervisors sectie ontbreekt of is geen array');
        }
        if (!config.postcodes || !Array.isArray(config.postcodes)) {
            errors.push('Postcodes sectie ontbreekt of is geen array');
        }
        if (!config.utilityTypes || !Array.isArray(config.utilityTypes)) {
            errors.push('UtilityTypes sectie ontbreekt of is geen array');
        }
        if (!config.utilities || !Array.isArray(config.utilities)) {
            errors.push('Utilities sectie ontbreekt of is geen array');
        }

        // Controleer op duplicaten
        const supervisorIds = config.supervisors?.map(s => s.id) || [];
        if (new Set(supervisorIds).size !== supervisorIds.length) {
            errors.push('Duplicaat supervisor IDs gevonden');
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Reset configuratie naar defaults
     */
    resetToDefaults() {
        localStorage.removeItem('vaststellingen_config');
        localStorage.removeItem('vaststellingen_config_timestamp');
        return this.loadConfig();
    }

    // ====== SCHEMA MANAGEMENT METHODS ======

    /**
     * Haalt alle actieve configuratie groepen op uit het schema
     */
    getActiveConfigGroups() {
        if (!this.config?.schema?.configGroups) return [];
        return this.config.schema.configGroups.filter(group => group.active);
    }

    /**
     * Haalt alle beschikbare veld types op uit het schema
     */
    getFieldTypes() {
        if (!this.config?.schema?.fieldTypes) {
            console.warn('Field types not loaded, using fallback');
            return this.getFallbackFieldTypes();
        }
        return this.config.schema.fieldTypes;
    }

    /**
     * Haalt fallback field types op
     */
    getFallbackFieldTypes() {
        return {
            "name": { "type": "text", "label": "Naam", "required": true },
            "code": { "type": "text", "label": "Code", "required": true },
            "description": { "type": "text", "label": "Beschrijving", "required": false },
            "type": { "type": "select", "label": "Type", "required": true, "source": "utilityTypes" },
            "phone": { "type": "tel", "label": "Telefoon", "required": false },
            "email": { "type": "email", "label": "Email", "required": false },
            "company": { "type": "text", "label": "Bedrijf", "required": false },
            "utilityId": { "type": "select", "label": "Gekoppeld Nutsbedrijf", "required": false, "source": "utilities" },
            "department": { "type": "text", "label": "Afdeling", "required": false },
            "icon": { "type": "text", "label": "Icoon (emoji)", "required": false },
            "color": { "type": "color", "label": "Kleur", "required": false, "default": "#3498db" }
        };
    }

    /**
     * Voegt een nieuwe configuratie groep toe aan het schema
     */
    addConfigGroup(groupData) {
        // Zorg ervoor dat schema geïnitialiseerd is
        this.ensureSchemaInitialized();
        
        if (!this.config?.schema?.configGroups) {
            if (!this.config.schema) this.config.schema = {};
            this.config.schema.configGroups = [];
        }

        const { key, label, method, addMethod, fields } = groupData;
        
        console.log('Adding config group:', groupData);
        
        if (!key || !label || !fields) {
            console.error('Incomplete group data:', groupData);
            return false;
        }

        // Check if key already exists
        if (this.config.schema.configGroups.find(g => g.key === key)) {
            console.error('Config group key already exists:', key);
            return false;
        }

        const newGroup = {
            key: key,
            label: label,
            method: method || `getActive${key.charAt(0).toUpperCase() + key.slice(1)}`,
            addMethod: addMethod || `add${key.charAt(0).toUpperCase() + key.slice(1)}`,
            fields: fields,
            active: true,
            custom: true,
            createdAt: new Date().toISOString()
        };

        this.config.schema.configGroups.push(newGroup);
        
        // Initialize empty array in configuration if it doesn't exist
        if (!this.config.configuration[key]) {
            this.config.configuration[key] = [];
        }
        
        // Creëer de dynamische methoden
        this.createDynamicMethods(newGroup);

        this.saveConfigToLocalStorage();
        console.log('Config group added successfully:', newGroup);
        return true;
    }
    
    /**
     * Creërt dynamische methoden voor een nieuwe groep
     */
    createDynamicMethods(group) {
        const capitalizedKey = group.key.charAt(0).toUpperCase() + group.key.slice(1);
        
        // Maak get methode aan als deze niet bestaat
        if (!this[group.method]) {
            this[group.method] = () => {
                if (!this.config?.configuration?.[group.key]) return [];
                return this.config.configuration[group.key].filter(item => item.active !== false);
            };
        }
        
        // Maak add methode aan als deze niet bestaat  
        if (!this[group.addMethod]) {
            this[group.addMethod] = (itemData) => {
                if (!this.config.configuration[group.key]) {
                    this.config.configuration[group.key] = [];
                }
                
                const newItem = {
                    id: `${group.key}_${Date.now()}`,
                    ...itemData,
                    active: true,
                    createdAt: new Date().toISOString()
                };
                
                this.config.configuration[group.key].push(newItem);
                this.saveConfigToLocalStorage();
                return newItem;
            };
        }
        
        console.log(`Dynamic methods created for ${group.key}:`, group.method, group.addMethod);
    }
    
    /**
     * Deactiveert een configuratie groep
     */
    deactivateConfigGroup(key) {
        if (!this.config?.schema?.configGroups) return false;
        
        const group = this.config.schema.configGroups.find(g => g.key === key);
        if (!group) {
            console.error('Config group not found:', key);
            return false;
        }
        
        // Alleen custom groepen kunnen gedeactiveerd worden
        if (!group.custom) {
            console.error('Cannot deactivate system group:', key);
            return false;
        }
        
        group.active = false;
        this.saveConfigToLocalStorage();
        console.log('Config group deactivated:', key);
        return true;
    }
    
    /**
     * Update een configuratie item
     */
    updateConfigItem(groupKey, itemData) {
        if (!this.config?.configuration?.[groupKey]) {
            console.error('Configuration group not found:', groupKey);
            return false;
        }
        
        const items = this.config.configuration[groupKey];
        const itemIndex = items.findIndex(item => item.id === itemData.id);
        
        if (itemIndex === -1) {
            console.error('Item not found:', itemData.id);
            return false;
        }
        
        // Update het item met nieuwe data, behoud bestaande properties
        const existingItem = items[itemIndex];
        const updatedItem = {
            ...existingItem,
            ...itemData,
            updatedAt: new Date().toISOString()
        };
        
        items[itemIndex] = updatedItem;
        this.saveConfigToLocalStorage();
        
        console.log('Config item updated:', groupKey, itemData.id);
        return true;
    }
    
    /**
     * Deactiveert een configuratie item
     */
    deactivateConfigItem(groupKey, itemId) {
        if (!this.config?.configuration?.[groupKey]) {
            console.error('Configuration group not found:', groupKey);
            return false;
        }
        
        const items = this.config.configuration[groupKey];
        const item = items.find(item => item.id === itemId);
        
        if (!item) {
            console.error('Item not found:', itemId);
            return false;
        }
        
        item.active = false;
        item.deactivatedAt = new Date().toISOString();
        
        this.saveConfigToLocalStorage();
        console.log('Config item deactivated:', groupKey, itemId);
        return true;
    }

    /**
     * Voegt een nieuw veld type toe aan het schema
     */
    addFieldType(fieldKey, fieldDefinition) {
        if (!this.config?.schema?.fieldTypes) {
            if (!this.config.schema) this.config.schema = {};
            this.config.schema.fieldTypes = {};
        }

        this.config.schema.fieldTypes[fieldKey] = fieldDefinition;
        this.saveConfigToLocalStorage();
        return true;
    }

    /**
     * Deactiveert een configuratie groep
     */
    deactivateConfigGroup(key) {
        if (!this.config?.schema?.configGroups) return false;
        
        const group = this.config.schema.configGroups.find(g => g.key === key);
        if (group) {
            group.active = false;
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Activeert een configuratie groep
     */
    activateConfigGroup(key) {
        if (!this.config?.schema?.configGroups) return false;
        
        const group = this.config.schema.configGroups.find(g => g.key === key);
        if (group) {
            group.active = true;
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Zorgt ervoor dat het schema correct geïnitialiseerd is
     */
    ensureSchemaInitialized() {
        console.log('Ensuring schema is initialized...');
        if (!this.config?.schema?.configGroups) {
            console.log('Schema not found, loading fallback config...');
            this.loadFallbackConfig();
        }
        console.log('Schema groups available:', this.config?.schema?.configGroups?.length || 0);
    }

    /**
     * Haalt een configuratie groep op op basis van key
     */
    getConfigGroup(key) {
        if (!this.config?.schema?.configGroups) {
            console.warn('Schema not loaded, creating fallback group for key:', key);
            // Return a fallback group based on the key
            return this.getFallbackGroup(key);
        }
        return this.config.schema.configGroups.find(g => g.key === key);
    }

    /**
     * Haalt een fallback groep op voor als het schema nog niet geladen is
     */
    getFallbackGroup(key) {
        const fallbackGroups = {
            'utilities': { key: 'utilities', label: 'Nutsbedrijven', method: 'getActiveUtilities', addMethod: 'addUtility', fields: ['name', 'type'], active: true, custom: false },
            'utilityTypes': { key: 'utilityTypes', label: 'Types Nuts', method: 'getActiveUtilityTypes', addMethod: 'addUtilityType', fields: ['name'], active: true, custom: false },
            'postcodes': { key: 'postcodes', label: 'Postcodes', method: 'getActivePostcodes', addMethod: 'addPostcode', fields: ['code', 'description'], active: true, custom: false },
            'workTypes': { key: 'workTypes', label: 'Werksoorten', method: 'getActiveWorkTypes', addMethod: 'addWorkType', fields: ['name', 'description'], active: true, custom: false },
            'priorities': { key: 'priorities', label: 'Prioriteit', method: 'getActivePriorities', addMethod: 'addPriority', fields: ['name'], active: true, custom: false },
            'weatherConditions': { key: 'weatherConditions', label: 'Weer', method: 'getActiveWeatherConditions', addMethod: 'addWeatherCondition', fields: ['name', 'icon'], active: true, custom: false },
            'inspectionTypes': { key: 'inspectionTypes', label: 'Controle Types', method: 'getActiveInspectionTypes', addMethod: 'addInspectionType', fields: ['name'], active: true, custom: false },
            'inspectionStatuses': { key: 'inspectionStatuses', label: 'Status Opties', method: 'getActiveInspectionStatuses', addMethod: 'addInspectionStatus', fields: ['name', 'color'], active: true, custom: false },
            'contactRoles': { key: 'contactRoles', label: 'Contact Rollen', method: 'getActiveContactRoles', addMethod: 'addContactRole', fields: ['name', 'description'], active: true, custom: false },
            'projectManagers': { key: 'projectManagers', label: 'Projectleiders', method: 'getActiveProjectManagers', addMethod: 'addContactPerson', fields: ['name', 'phone', 'email', 'company', 'utilityId'], active: true, custom: false },
            'contractors': { key: 'contractors', label: 'Aannemers', method: 'getActiveContractors', addMethod: 'addContactPerson', fields: ['name', 'phone', 'email', 'company', 'utilityId'], active: true, custom: false },
            'cityContacts': { key: 'cityContacts', label: 'Contact Stad', method: 'getActiveCityContacts', addMethod: 'addCityContact', fields: ['name', 'email', 'phone', 'department'], active: true, custom: false },
            'defectTypes': { key: 'defectTypes', label: 'Gebreken Opties', method: 'getActiveDefectTypes', addMethod: 'addDefectType', fields: ['name'], active: true, custom: false },
            'materialOptions': { key: 'materialOptions', label: 'Materiaal Opties', method: 'getActiveMaterialOptions', addMethod: 'addMaterialOption', fields: ['name'], active: true, custom: false }
        };
        
        return fallbackGroups[key] || null;
    }

    /**
     * Update een configuratie groep
     */
    updateConfigGroup(key, updates) {
        if (!this.config?.schema?.configGroups) return false;
        
        const group = this.config.schema.configGroups.find(g => g.key === key);
        if (group) {
            Object.assign(group, updates);
            group.updatedAt = new Date().toISOString();
            this.saveConfigToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Dynamische methode om data op te halen voor een configuratie groep
     */
    getDataForGroup(key) {
        const group = this.getConfigGroup(key);
        if (!group || !group.method) return [];

        // Check if method exists on this class
        if (typeof this[group.method] === 'function') {
            return this[group.method]();
        }

        // Fallback: direct access to configuration array
        if (this.config?.configuration?.[key]) {
            return this.config.configuration[key].filter(item => item.active !== false);
        }

        return [];
    }

    /**
     * Dynamische methode om item toe te voegen voor een configuratie groep
     */
    addItemToGroup(key, itemData) {
        const group = this.getConfigGroup(key);
        if (!group) return false;

        // Check if specific add method exists
        if (group.addMethod && typeof this[group.addMethod] === 'function') {
            // Call the specific method with appropriate parameters
            const fieldValues = group.fields.map(field => itemData[field] || '');
            return this[group.addMethod](...fieldValues);
        }

        // Generic fallback: add to configuration array
        if (!this.config.configuration[key]) {
            this.config.configuration[key] = [];
        }

        const id = itemData.name?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 
                   itemData.code || 
                   Date.now().toString();
        
        const newItem = {
            id: id,
            ...itemData,
            active: true,
            createdAt: new Date().toISOString()
        };

        this.config.configuration[key].push(newItem);
        this.saveConfigToLocalStorage();
        return true;
    }

    // =====================================================================
    // ARCHIEF MANAGEMENT METHODEN
    // =====================================================================

    /**
     * Haalt alle gearchiveerde vaststellingen op uit localStorage
     */
    getArchivedInspections() {
        try {
            const archived = localStorage.getItem('archivedInspections');
            return archived ? JSON.parse(archived) : [];
        } catch (error) {
            console.error('Fout bij ophalen gearchiveerde vaststellingen:', error);
            return [];
        }
    }

    /**
     * Archiveert een vaststelling
     */
    archiveInspection(inspection) {
        try {
            const archived = this.getArchivedInspections();
            const archivedItem = {
                ...inspection,
                archivedAt: new Date().toISOString(),
                id: inspection.id || `archived_${Date.now()}`
            };
            
            archived.push(archivedItem);
            localStorage.setItem('archivedInspections', JSON.stringify(archived));
            
            console.log(`✅ Vaststelling ${archivedItem.id} gearchiveerd`);
            return true;
        } catch (error) {
            console.error('Fout bij archiveren:', error);
            return false;
        }
    }

    /**
     * Herstelt een gearchiveerde vaststelling
     */
    restoreArchivedInspection(inspectionId) {
        try {
            const archived = this.getArchivedInspections();
            const index = archived.findIndex(item => item.id === inspectionId);
            
            if (index === -1) {
                throw new Error('Gearchiveerde vaststelling niet gevonden');
            }
            
            const restored = archived[index];
            archived.splice(index, 1);
            
            // Verwijder archivering metadata
            delete restored.archivedAt;
            restored.restoredAt = new Date().toISOString();
            
            localStorage.setItem('archivedInspections', JSON.stringify(archived));
            
            console.log(`✅ Vaststelling ${inspectionId} hersteld`);
            return restored;
        } catch (error) {
            console.error('Fout bij herstellen:', error);
            return null;
        }
    }

    /**
     * Verwijdert een gearchiveerde vaststelling permanent
     */
    deleteArchivedInspection(inspectionId) {
        try {
            const archived = this.getArchivedInspections();
            const filtered = archived.filter(item => item.id !== inspectionId);
            
            localStorage.setItem('archivedInspections', JSON.stringify(filtered));
            console.log(`🗑️ Gearchiveerde vaststelling ${inspectionId} permanent verwijderd`);
            return true;
        } catch (error) {
            console.error('Fout bij verwijderen:', error);
            return false;
        }
    }

    /**
     * Creëert sample data voor het archief (voor demo doeleinden)
     */
    createSampleArchiveData() {
        const sampleInspections = [
            {
                id: 'insp_2024_001',
                location: 'Hoofdstraat 123, Antwerpen',
                status: 'Voltooid',
                supervisor: 'Jan Janssen',
                type: 'Standaard Controle',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dagen geleden
                completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
                findings: ['Geen opmerkingen', 'Alles in orde'],
                priority: 'Normaal'
            },
            {
                id: 'insp_2024_002',
                location: 'Kerkstraat 45, Gent',
                status: 'Voltooid',
                supervisor: 'Maria Peeters',
                type: 'Urgente Controle',
                createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
                completedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
                findings: ['Klein lek gevonden', 'Reparatie uitgevoerd'],
                priority: 'Hoog'
            },
            {
                id: 'insp_2024_003',
                location: 'Marktplein 12, Brugge',
                status: 'Voltooid',
                supervisor: 'Pieter Van Damme',
                type: 'Periodieke Inspectie',
                createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                completedAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString(),
                findings: ['Preventief onderhoud uitgevoerd'],
                priority: 'Laag'
            },
            {
                id: 'insp_2024_004',
                location: 'Industrielaan 78, Mechelen',
                status: 'Voltooid',
                supervisor: 'Sarah Willems',
                type: 'Veiligheidscontrole',
                createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
                findings: ['Alle veiligheidsprotocollen nageleefd'],
                priority: 'Hoog'
            },
            {
                id: 'insp_2024_005',
                location: 'Schoolstraat 91, Leuven',
                status: 'Voltooid',
                supervisor: 'Tom Claes',
                type: 'Klachten Follow-up',
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                findings: ['Klacht opgelost', 'Communicatie met klant'],
                priority: 'Normaal'
            }
        ];

        // Archiveer alle sample items
        sampleInspections.forEach(inspection => {
            this.archiveInspection(inspection);
        });

        return sampleInspections.length;
    }

    /**
     * Leegt het complete archief
     */
    clearAllArchives() {
        try {
            localStorage.removeItem('archivedInspections');
            console.log('🗑️ Alle archief data verwijderd');
            return true;
        } catch (error) {
            console.error('Fout bij leegmaken archief:', error);
            return false;
        }
    }

    /**
     * Exporteert gearchiveerde data naar JSON
     */
    exportArchiveData(format = 'json') {
        const archived = this.getArchivedInspections();
        
        switch (format) {
            case 'json':
                return {
                    data: archived,
                    exportedAt: new Date().toISOString(),
                    count: archived.length,
                    format: 'json'
                };
                
            case 'csv':
                if (archived.length === 0) return '';
                
                const headers = Object.keys(archived[0]).join(',');
                const rows = archived.map(item => 
                    Object.values(item).map(val => 
                        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
                    ).join(',')
                );
                return [headers, ...rows].join('\\n');
                
            default:
                return archived;
        }
    }

    /**
     * Haalt archief statistieken op
     */
    getArchiveStatistics() {
        const archived = this.getArchivedInspections();
        const now = new Date();
        
        return {
            totalCount: archived.length,
            byStatus: this.groupBy(archived, 'status'),
            byType: this.groupBy(archived, 'type'),
            bySupervisor: this.groupBy(archived, 'supervisor'),
            byPriority: this.groupBy(archived, 'priority'),
            recentlyArchived: archived.filter(item => {
                const archivedDate = new Date(item.archivedAt);
                const daysDiff = (now - archivedDate) / (1000 * 60 * 60 * 24);
                return daysDiff <= 30;
            }).length,
            oldestArchived: archived.length > 0 ? 
                Math.min(...archived.map(item => new Date(item.archivedAt).getTime())) : null,
            newestArchived: archived.length > 0 ? 
                Math.max(...archived.map(item => new Date(item.archivedAt).getTime())) : null
        };
    }

    // ===== OBSERVATION FINDINGS MANAGEMENT =====
    
    /**
     * Haal alle observation findings op
     */
    getObservationFindings() {
        if (!this.config?.configuration?.observation_findings) {
            this.initializeObservationFindings();
        }
        return this.config.configuration.observation_findings || [];
    }
    
    /**
     * Initialiseer observation findings als ze niet bestaan
     */
    initializeObservationFindings() {
        if (!this.config) return;
        
        if (!this.config.configuration.observation_findings) {
            this.config.configuration.observation_findings = [];
            this.saveConfigToLocalStorage();
        }
    }
    
    /**
     * Voeg nieuwe observation finding toe
     */
    addObservationFinding(findingData) {
        if (!this.config) {
            return { success: false, reason: 'Configuratie niet geladen' };
        }
        
        // Zorg dat observation_findings array bestaat
        if (!this.config.configuration.observation_findings) {
            this.config.configuration.observation_findings = [];
        }
        
        // Controleer of code al bestaat
        const existingFinding = this.config.configuration.observation_findings.find(
            f => f.code.toLowerCase() === findingData.code.toLowerCase()
        );
        
        if (existingFinding) {
            return { success: false, reason: 'Een vaststelling met deze code bestaat al' };
        }
        
        // Voeg nieuwe finding toe
        const newFinding = {
            code: findingData.code,
            label: findingData.label,
            boundaryStatus: Boolean(findingData.boundaryStatus),
            worksStatus: Boolean(findingData.worksStatus),
            createdAt: new Date().toISOString().split('T')[0]
        };
        
        this.config.configuration.observation_findings.push(newFinding);
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        this.saveConfigToLocalStorage();
        
        console.log('✅ Observation finding added:', newFinding);
        return { success: true };
    }
    
    /**
     * Update observation finding
     */
    updateObservationFinding(code, updateData) {
        if (!this.config?.configuration?.observation_findings) return false;
        
        const finding = this.config.configuration.observation_findings.find(f => f.code === code);
        if (!finding) return false;
        
        // Update fields
        if (updateData.label !== undefined) finding.label = updateData.label;
        if (updateData.boundaryStatus !== undefined) finding.boundaryStatus = Boolean(updateData.boundaryStatus);
        if (updateData.worksStatus !== undefined) finding.worksStatus = Boolean(updateData.worksStatus);
        
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        this.saveConfigToLocalStorage();
        
        console.log('✅ Observation finding updated:', finding);
        return true;
    }
    
    /**
     * Verwijder observation finding
     */
    deleteObservationFinding(code) {
        if (!this.config?.configuration?.observation_findings) return false;
        
        const index = this.config.configuration.observation_findings.findIndex(f => f.code === code);
        if (index === -1) return false;
        
        const deletedFinding = this.config.configuration.observation_findings.splice(index, 1)[0];
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        this.saveConfigToLocalStorage();
        
        console.log('✅ Observation finding deleted:', deletedFinding);
        return true;
    }

    // ===== SIGNALISATIE MANAGEMENT =====
    
    /**
     * Haal alle signalisatie opties op
     */
    getSignalisatieOptions() {
        if (!this.config?.configuration?.signalisatie_options) {
            this.initializeSignalisatieOptions();
        }
        return this.config.configuration.signalisatie_options || [];
    }
    
    /**
     * Initialiseer signalisatie opties als ze niet bestaan
     */
    initializeSignalisatieOptions() {
        if (!this.config) return;
        
        if (!this.config.configuration.signalisatie_options) {
            this.config.configuration.signalisatie_options = [
                {
                    code: "SECTIE1_BEGIN_EINDE",
                    label: "Sectie 1: Signalisatieborden Begin/Einde",
                    description: "Controle op aanwezigheid van begin en einde signalisatieborden",
                    createdAt: new Date().toISOString().split('T')[0]
                },
                {
                    code: "SECTIE2_VEILIGHEID",
                    label: "Sectie 2: Veiligheid Werf/Werfafbakening",
                    description: "Controle op veiligheidsmaatregelen en afbakening",
                    createdAt: new Date().toISOString().split('T')[0]
                },
                {
                    code: "SECTIE3_BRUGJES",
                    label: "Sectie 3: Brugjes over sleuf",
                    description: "Controle op toegankelijkheid via brugjes",
                    createdAt: new Date().toISOString().split('T')[0]
                },
                {
                    code: "SECTIE4_OPMERKINGEN",
                    label: "Sectie 4: Bijzondere opmerkingen",
                    description: "Vrije tekst voor bijzondere observaties",
                    createdAt: new Date().toISOString().split('T')[0]
                }
            ];
            this.saveConfigToLocalStorage();
        }
    }
    
    /**
     * Voeg nieuwe signalisatie optie toe
     */
    addSignalisatieOption(optionData) {
        if (!this.config) {
            return { success: false, reason: 'Configuratie niet geladen' };
        }
        
        // Zorg dat signalisatie_options array bestaat
        if (!this.config.configuration.signalisatie_options) {
            this.config.configuration.signalisatie_options = [];
        }
        
        // Controleer of code al bestaat
        const existingOption = this.config.configuration.signalisatie_options.find(
            s => s.code.toLowerCase() === optionData.code.toLowerCase()
        );
        
        if (existingOption) {
            return { success: false, reason: 'Een signalisatie optie met deze code bestaat al' };
        }
        
        // Voeg nieuwe optie toe
        const newOption = {
            code: optionData.code,
            label: optionData.label,
            description: optionData.description || '',
            createdAt: new Date().toISOString().split('T')[0]
        };
        
        this.config.configuration.signalisatie_options.push(newOption);
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        this.saveConfigToLocalStorage();
        
        console.log('✅ Signalisatie option added:', newOption);
        return { success: true };
    }
    
    /**
     * Update signalisatie optie
     */
    updateSignalisatieOption(code, updateData) {
        if (!this.config?.configuration?.signalisatie_options) return false;
        
        const option = this.config.configuration.signalisatie_options.find(s => s.code === code);
        if (!option) return false;
        
        // Update fields
        if (updateData.label !== undefined) option.label = updateData.label;
        if (updateData.description !== undefined) option.description = updateData.description;
        
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        this.saveConfigToLocalStorage();
        
        console.log('✅ Signalisatie option updated:', option);
        return true;
    }
    
    /**
     * Verwijder signalisatie optie
     */
    deleteSignalisatieOption(code) {
        if (!this.config?.configuration?.signalisatie_options) return false;
        
        const index = this.config.configuration.signalisatie_options.findIndex(s => s.code === code);
        if (index === -1) return false;
        
        const deletedOption = this.config.configuration.signalisatie_options.splice(index, 1)[0];
        this.config.lastUpdated = new Date().toISOString().split('T')[0];
        this.saveConfigToLocalStorage();
        
        console.log('✅ Signalisatie option deleted:', deletedOption);
        return true;
    }

    /**
     * Helper functie voor grouperen van data
     */
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const value = item[key] || 'Onbekend';
            groups[value] = (groups[value] || 0) + 1;
            return groups;
        }, {});
    }
}

// Globale instantie
window.dataManager = new DataManager();

// Initialiseer bij pagina load
document.addEventListener('DOMContentLoaded', async () => {
    await window.dataManager.loadConfig();
    console.log('DataManager geïnitialiseerd');
});
