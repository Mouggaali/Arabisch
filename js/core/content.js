// Laadt de leerinhoud uit content/. De code kent geen lesinhoud; alles komt uit JSON.

const cache = new Map();

async function getJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`Kon ${path} niet laden (${r.status}).`);
        return r.json();
      })
    );
  }
  try {
    return await cache.get(path);
  } catch (e) {
    cache.delete(path);
    throw e;
  }
}

let curriculum = null;

export const content = {
  async curriculum() {
    if (!curriculum) {
      curriculum = await getJson('content/curriculum.json');
      // Index voor snel opzoeken, met verwijzing naar jaar en periode.
      curriculum.index = new Map();
      curriculum.order = [];
      for (const jaar of curriculum.jaren) {
        for (const periode of jaar.periodes) {
          for (const unit of periode.eenheden) {
            unit.jaar = jaar.nr;
            unit.periode = periode.nr;
            curriculum.index.set(unit.id, unit);
            curriculum.order.push(unit);
          }
        }
      }
    }
    return curriculum;
  },

  async unit(id) {
    const c = await this.curriculum();
    return c.index.get(id) || null;
  },

  /** Laad het volledige lesbestand; null als de les nog niet uitgewerkt is. */
  async lesson(id) {
    const unit = await this.unit(id);
    if (!unit || !unit.bestand) return null;
    const data = await getJson('content/' + unit.bestand);
    return { ...data, unit };
  },

  /** Alle uitgewerkte lessen (voor de controlelijst). */
  async allLessons() {
    const c = await this.curriculum();
    const built = c.order.filter((u) => u.bestand);
    return Promise.all(built.map((u) => this.lesson(u.id)));
  },

  async verbs() {
    return getJson('content/werkwoorden.json');
  },

  /** Compacte index voor de zoekpagina (gegenereerd door tools/build-search-index.mjs). */
  async searchIndex() {
    return getJson('content/zoekindex.json');
  },

  /** Lijst van de leesteksten (content/teksten/index.json): [{id, titel, soort, jaar, periode, naLes, bestand}]. */
  async texts() {
    return (await getJson('content/teksten/index.json')).teksten;
  },

  async text(id) {
    const entry = (await this.texts()).find((t) => t.id === id);
    if (!entry) return null;
    return { ...(await getJson('content/teksten/' + entry.bestand)), entry };
  },

  tagLabel(tag) {
    return curriculum?.tags?.[tag] || tag;
  },
};
