/**
 * Visibility Rules Engine
 * Handles show/hide logic based on form state and schema rules
 */

/**
 * @typedef {Object} VisibilityRule
 * @property {Array} all - All conditions must be true
 * @property {Array} any - Any condition must be true  
 */

/**
 * @typedef {Object} Condition
 * @property {string} field - Field ID to check
 * @property {any} equals - Field must equal this value
 * @property {Array} in - Field must be in this array
 * @property {string} contains - Field (if array/string) must contain this value
 */

class VisibilityManager {
    constructor() {
        this.schema = null;
        this.lastState = null;
        this.visibilityCache = new Map();
    }

    /**
     * Set the form schema
     * @param {Object} schema 
     */
    setSchema(schema) {
        this.schema = schema;
        this.clearCache();
    }

    /**
     * Clear visibility cache
     */
    clearCache() {
        this.visibilityCache.clear();
    }

    /**
     * Apply visibility rules to current state
     * @param {Object} state - Current form state
     * @returns {Object} Map of field ID to visibility (true/false)
     */
    applyVisibility(state) {
        if (!this.schema) {
            return {};
        }

        // Check if we can use cache
        if (this.lastState && this.statesEqual(state.fields, this.lastState)) {
            return Object.fromEntries(this.visibilityCache);
        }

        const visibility = {};
        
        // Process each field's visibility rules
        Object.values(this.schema.fields).forEach(field => {
            const isVisible = this.evaluateFieldVisibility(field, state.fields);
            visibility[field.id] = isVisible;
            this.visibilityCache.set(field.id, isVisible);
        });

        this.lastState = { ...state.fields };
        return visibility;
    }

    /**
     * Evaluate visibility for a single field
     * @param {Object} field - Field configuration
     * @param {Object} formFields - Current form field values
     * @returns {boolean}
     */
    evaluateFieldVisibility(field, formFields) {
        // If no showIf rule, field is always visible
        if (!field.showIf) {
            return true;
        }

        return this.evaluateRule(field.showIf, formFields);
    }

    /**
     * Evaluate a visibility rule
     * @param {VisibilityRule} rule 
     * @param {Object} formFields 
     * @returns {boolean}
     */
    evaluateRule(rule, formFields) {
        // Handle 'all' conditions (AND logic)
        if (rule.all && Array.isArray(rule.all)) {
            return rule.all.every(condition => this.evaluateCondition(condition, formFields));
        }

        // Handle 'any' conditions (OR logic)  
        if (rule.any && Array.isArray(rule.any)) {
            return rule.any.some(condition => this.evaluateCondition(condition, formFields));
        }

        // Direct condition
        return this.evaluateCondition(rule, formFields);
    }

    /**
     * Evaluate a single condition
     * @param {Condition} condition 
     * @param {Object} formFields 
     * @returns {boolean}
     */
    evaluateCondition(condition, formFields) {
        const fieldValue = formFields[condition.field];

        // Handle 'equals' condition
        if (condition.equals !== undefined) {
            return fieldValue === condition.equals;
        }

        // Handle 'in' condition (value in array)
        if (condition.in && Array.isArray(condition.in)) {
            return condition.in.includes(fieldValue);
        }

        // Handle 'contains' condition
        if (condition.contains !== undefined) {
            if (Array.isArray(fieldValue)) {
                return fieldValue.includes(condition.contains);
            }
            if (typeof fieldValue === 'string') {
                return fieldValue.includes(condition.contains);
            }
            return false;
        }

        // Handle 'notEquals' condition
        if (condition.notEquals !== undefined) {
            return fieldValue !== condition.notEquals;
        }

        // Handle 'exists' condition
        if (condition.exists !== undefined) {
            const exists = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
            return condition.exists ? exists : !exists;
        }

        // Handle 'isEmpty' condition  
        if (condition.isEmpty !== undefined) {
            const isEmpty = !fieldValue || 
                           (Array.isArray(fieldValue) && fieldValue.length === 0) ||
                           (typeof fieldValue === 'string' && fieldValue.trim() === '');
            return condition.isEmpty ? isEmpty : !isEmpty;
        }

        // Default: check if field has truthy value
        return !!fieldValue;
    }

    /**
     * Check if two form states are equal (for caching)
     * @param {Object} state1 
     * @param {Object} state2 
     * @returns {boolean}
     */
    statesEqual(state1, state2) {
        if (!state1 || !state2) return false;

        const keys1 = Object.keys(state1);
        const keys2 = Object.keys(state2);

        if (keys1.length !== keys2.length) return false;

        return keys1.every(key => {
            const val1 = state1[key];
            const val2 = state2[key];

            // Handle arrays
            if (Array.isArray(val1) && Array.isArray(val2)) {
                return val1.length === val2.length && 
                       val1.every((item, index) => item === val2[index]);
            }

            return val1 === val2;
        });
    }

    /**
     * Get visible blocks for current state
     * @param {Object} state 
     * @returns {Array} Array of visible block IDs
     */
    getVisibleBlocks(state) {
        if (!this.schema) return [];

        const visibility = this.applyVisibility(state);
        const visibleBlocks = new Set();

        // Check which blocks have visible fields
        Object.values(this.schema.fields).forEach(field => {
            if (visibility[field.id]) {
                visibleBlocks.add(field.block);
            }
        });

        // Always show blocks that are in the schema blocks list
        this.schema.blocks.forEach(blockId => {
            // Check if block has at least one field without showIf rule
            const hasAlwaysVisibleFields = Object.values(this.schema.fields).some(field => 
                field.block === blockId && !field.showIf
            );

            if (hasAlwaysVisibleFields) {
                visibleBlocks.add(blockId);
            }
        });

        return Array.from(visibleBlocks);
    }

    /**
     * Get fields that should be visible in a specific block
     * @param {string} blockId 
     * @param {Object} state 
     * @returns {Array} Array of visible field configurations
     */
    getVisibleFieldsInBlock(blockId, state) {
        if (!this.schema) return [];

        const visibility = this.applyVisibility(state);

        return Object.values(this.schema.fields)
            .filter(field => field.block === blockId && visibility[field.id]);
    }

    /**
     * Check if a specific field should be visible
     * @param {string} fieldId 
     * @param {Object} state 
     * @returns {boolean}
     */
    isFieldVisible(fieldId, state) {
        if (!this.schema) return false;

        const field = this.schema.fields[fieldId];
        if (!field) return false;

        return this.evaluateFieldVisibility(field, state.fields);
    }

    /**
     * Get all currently hidden fields
     * @param {Object} state 
     * @returns {Array} Array of hidden field IDs
     */
    getHiddenFields(state) {
        const visibility = this.applyVisibility(state);
        return Object.keys(visibility).filter(fieldId => !visibility[fieldId]);
    }

    /**
     * Debug visibility for a field
     * @param {string} fieldId 
     * @param {Object} state 
     * @returns {Object} Debug information
     */
    debugFieldVisibility(fieldId, state) {
        const field = this.schema?.fields[fieldId];
        if (!field) {
            return { error: 'Field not found' };
        }

        const isVisible = this.evaluateFieldVisibility(field, state.fields);
        
        return {
            fieldId,
            isVisible,
            hasRule: !!field.showIf,
            rule: field.showIf,
            relevantFieldValues: field.showIf ? this.getRelevantFieldValues(field.showIf, state.fields) : {}
        };
    }

    /**
     * Get field values that are relevant to a visibility rule
     * @param {VisibilityRule} rule 
     * @param {Object} formFields 
     * @returns {Object}
     */
    getRelevantFieldValues(rule, formFields) {
        const relevant = {};

        const extractFields = (conditions) => {
            if (Array.isArray(conditions)) {
                conditions.forEach(condition => {
                    if (condition.field) {
                        relevant[condition.field] = formFields[condition.field];
                    }
                });
            } else if (conditions.field) {
                relevant[conditions.field] = formFields[conditions.field];
            }
        };

        if (rule.all) extractFields(rule.all);
        if (rule.any) extractFields(rule.any);
        if (rule.field) extractFields(rule);

        return relevant;
    }
}

// Export singleton instance
window.visibilityManager = new VisibilityManager();
