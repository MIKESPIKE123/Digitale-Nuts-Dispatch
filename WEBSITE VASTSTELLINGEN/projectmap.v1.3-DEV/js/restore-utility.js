/**
 * Vaststellingen Management System - Restore Utility
 * Version: 1.2 STABLE
 * Date: 20 September 2025
 * 
 * This utility helps restore the stable version if something breaks
 */

// Global restore functions
window.restoreStableVersion = function() {
    const confirmation = confirm(
        '🔄 RESTORE STABLE VERSION\n\n' +
        'Dit zal de huidige versie vervangen door de laatste werkende versie (v1.2 STABLE).\n\n' +
        '✅ Werkende features in stable versie:\n' +
        '- Schema loading\n' + 
        '- Vaststellingen formulier\n' +
        '- Repeater functionaliteit\n' +
        '- Schone interface\n\n' +
        'Doorgaan met herstel?'
    );
    
    if (confirmation) {
        alert(
            '📋 HERSTEL INSTRUCTIES:\n\n' +
            '1. Open bestand: index.html.STABLE_v1.0_20250920\n' +
            '2. Kopieer inhoud\n' +
            '3. Vervang huidige index.html inhoud\n' +
            '4. Sla op en herlaad pagina\n\n' +
            'Of gebruik PowerShell commando:\n' +
            'Copy-Item "index.html.STABLE_v1.0_20250920" "index.html" -Force'
        );
    }
};

// Version check function
window.checkStableVersion = function() {
    const currentFeatures = {
        schema: !!window.formSchema,
        renderer: typeof window.initSchemaLayout === 'function',
        navigation: typeof window.showSection === 'function',
        repeaters: typeof window.addRepeaterItem === 'function'
    };
    
    const allWorking = Object.values(currentFeatures).every(Boolean);
    
    console.log('🔍 STABLE VERSION CHECK:');
    console.log('Schema loading:', currentFeatures.schema ? '✅' : '❌');
    console.log('Renderer functions:', currentFeatures.renderer ? '✅' : '❌');
    console.log('Navigation:', currentFeatures.navigation ? '✅' : '❌');
    console.log('Repeater system:', currentFeatures.repeaters ? '✅' : '❌');
    console.log('Overall status:', allWorking ? '✅ STABLE' : '❌ NEEDS RESTORE');
    
    if (!allWorking) {
        console.warn('⚠️ System not in stable state. Consider running restoreStableVersion()');
    }
    
    return allWorking;
};

// Auto-check on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof window.checkStableVersion === 'function') {
            window.checkStableVersion();
        }
    }, 2000);
});

// Make functions available for console use
console.log('🔧 RESTORE UTILITY LOADED');
console.log('Available commands:');
console.log('- restoreStableVersion() - Restore to working version');
console.log('- checkStableVersion() - Check current system status');