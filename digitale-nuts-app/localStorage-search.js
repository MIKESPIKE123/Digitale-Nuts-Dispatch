// localStorage search script - plak dit in de browser console
console.log('=== LOCALSTORAGE SEARCH FOR MICHEL GERITS ===');

// Function to search all localStorage
function findMichelGerits() {
  console.log('Totaal aantal localStorage items:', localStorage.length);
  
  let found = false;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    
    console.log(`\n--- KEY ${i + 1}: ${key} ---`);
    
    if (value && value.includes('Michel')) {
      console.log('🎯 MICHEL GEVONDEN in key:', key);
      console.log('Value length:', value.length);
      
      try {
        const parsed = JSON.parse(value);
        if (parsed.inspecteurs) {
          console.log('👥 Inspecteurs in deze configuratie:');
          parsed.inspecteurs.forEach((inspector, idx) => {
            console.log(`${idx + 1}. ${inspector.name} (${inspector.phone || 'geen telefoon'})`);
          });
          found = true;
        }
      } catch (e) {
        console.log('Kan niet parsen als JSON');
      }
    } else {
      // Show first 100 chars of each key for inspection
      console.log('First 100 chars:', value?.substring(0, 100));
    }
  }
  
  if (!found) {
    console.log('❌ Michel Gerits niet gevonden in localStorage');
    console.log('\n🔍 Alle keys:');
    for (let i = 0; i < localStorage.length; i++) {
      console.log(`- ${localStorage.key(i)}`);
    }
  }
  
  return found;
}

// Run the search
findMichelGerits();

// Also check specific common keys
console.log('\n=== CHECKING COMMON KEYS ===');
['inspectie-app-config', 'inspectionConfig', 'config', 'app-config'].forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    console.log(`✅ Found data in ${key}:`, value.substring(0, 200));
  } else {
    console.log(`❌ No data in ${key}`);
  }
});