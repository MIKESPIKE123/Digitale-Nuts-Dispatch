// OSLO/JSON-LD export skeleton (to be wired later)
export function toOsloVaststelling(v) {
  return {
    '@context': 'https://data.vlaanderen.be/context/...', // TODO fill actual context
    '@type': 'Vaststelling',
    id: v.id,
    dossierId: v.dossierId,
    datum: v.updatedAt,
    // TODO: geometry, codeNutsCategorie, fotos (as links), organisatie referenties
  };
}
