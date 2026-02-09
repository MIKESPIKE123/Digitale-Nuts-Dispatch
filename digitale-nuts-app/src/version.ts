// Versie beheer systeem voor Stad Antwerpen Inspectie App
// Update dit bestand bij elke wijziging (+0.1)

export const APP_VERSION = '1.4';

// Changelog voor elke versie
export const VERSION_CHANGELOG = {
  '1.0': 'Initiële release met NOK workflow',
  '1.1': 'GPS, NOK validatie en uitgebreide exportbasis',
  '1.2': 'Configpanel, syncflow en operationele handover',
  '1.3': 'GPS fallback, reverse geocoding, foto koppeling per element',
  '1.4': 'Automatische fotostempel met stadslogo, GPS en adres'
};

// Functie om volgende versie te genereren
export const getNextVersion = (currentVersion: string): string => {
  const [major, minor] = currentVersion.split('.').map(Number);
  return `${major}.${minor + 1}`;
};

// Functie om versie info te tonen
export const getVersionInfo = () => ({
  version: APP_VERSION,
  changelog: VERSION_CHANGELOG[APP_VERSION as keyof typeof VERSION_CHANGELOG],
  buildDate: new Date().toLocaleDateString('nl-NL')
});
