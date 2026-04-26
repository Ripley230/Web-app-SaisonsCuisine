export const MONTHS = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

export const DEFAULT_COUNTRY = "FR";

export const COUNTRIES = [{ code: "FR", label: "France" }];

const PRINTEMPS = [2, 3, 4];
const ETE = [5, 6, 7];
const AUTOMNE = [8, 9, 10];
const HIVER = [11, 0, 1];

export const INGREDIENTS_BY_COUNTRY = {
  FR: [
    // Printemps - Fruits
    { id: "fraise", nom: "Fraise", type: "Fruit", saisons: PRINTEMPS, nutrition: { calories: 32, glucides: 7.7, proteines: 0.7, lipides: 0.3 } },
    { id: "rhubarbe", nom: "Rhubarbe", type: "Fruit", saisons: PRINTEMPS, nutrition: { calories: 21, glucides: 4.5, proteines: 0.9, lipides: 0.2 } },
    { id: "cerise", nom: "Cerise", type: "Fruit", saisons: PRINTEMPS, nutrition: { calories: 63, glucides: 16, proteines: 1.1, lipides: 0.2 } },

    // Printemps - Legumes
    { id: "asperge", nom: "Asperge", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 20, glucides: 3.9, proteines: 2.2, lipides: 0.1 } },
    { id: "artichaut", nom: "Artichaut", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 47, glucides: 10.5, proteines: 3.3, lipides: 0.2 } },
    { id: "radis", nom: "Radis", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 16, glucides: 3.4, proteines: 0.7, lipides: 0.1 } },
    { id: "epinard", nom: "Epinard", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 23, glucides: 3.6, proteines: 2.9, lipides: 0.4 } },
    { id: "petit-pois", nom: "Petit pois", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 81, glucides: 14.5, proteines: 5.4, lipides: 0.4 } },
    { id: "feve", nom: "Feve", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 72, glucides: 11.7, proteines: 5.6, lipides: 0.6 } },
    { id: "cresson", nom: "Cresson", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 11, glucides: 1.3, proteines: 2.3, lipides: 0.1 } },
    { id: "oseille", nom: "Oseille", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 22, glucides: 3.2, proteines: 2, lipides: 0.7 } },
    { id: "blette", nom: "Blette (bette)", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 19, glucides: 3.7, proteines: 1.8, lipides: 0.2 } },
    { id: "chou-rave", nom: "Chou-rave", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 27, glucides: 6.2, proteines: 1.7, lipides: 0.1 } },
    { id: "navet-nouveau", nom: "Navet nouveau", type: "Legume", saisons: PRINTEMPS, nutrition: { calories: 28, glucides: 6.4, proteines: 0.9, lipides: 0.1 } },

    // Ete - Fruits
    { id: "abricot", nom: "Abricot", type: "Fruit", saisons: ETE, nutrition: { calories: 48, glucides: 11, proteines: 1.4, lipides: 0.4 } },
    { id: "peche", nom: "Peche", type: "Fruit", saisons: ETE, nutrition: { calories: 39, glucides: 9.5, proteines: 0.9, lipides: 0.3 } },
    { id: "nectarine", nom: "Nectarine", type: "Fruit", saisons: ETE, nutrition: { calories: 44, glucides: 10.5, proteines: 1.1, lipides: 0.3 } },
    { id: "melon", nom: "Melon", type: "Fruit", saisons: ETE, nutrition: { calories: 34, glucides: 8.2, proteines: 0.8, lipides: 0.2 } },
    { id: "pasteque", nom: "Pasteque", type: "Fruit", saisons: ETE, nutrition: { calories: 30, glucides: 7.5, proteines: 0.6, lipides: 0.2 } },
    { id: "framboise", nom: "Framboise", type: "Fruit", saisons: ETE, nutrition: { calories: 52, glucides: 12, proteines: 1.2, lipides: 0.7 } },
    { id: "mure", nom: "Mure", type: "Fruit", saisons: ETE, nutrition: { calories: 43, glucides: 9.6, proteines: 1.4, lipides: 0.5 } },
    { id: "myrtille", nom: "Myrtille", type: "Fruit", saisons: ETE, nutrition: { calories: 57, glucides: 14.5, proteines: 0.7, lipides: 0.3 } },
    { id: "cassis", nom: "Cassis", type: "Fruit", saisons: ETE, nutrition: { calories: 63, glucides: 15.4, proteines: 1.4, lipides: 0.4 } },
    { id: "groseille", nom: "Groseille", type: "Fruit", saisons: ETE, nutrition: { calories: 56, glucides: 13.8, proteines: 1.4, lipides: 0.2 } },
    { id: "prune", nom: "Prune", type: "Fruit", saisons: ETE, nutrition: { calories: 46, glucides: 11.4, proteines: 0.7, lipides: 0.3 } },
    { id: "figue-fraiche", nom: "Figue fraiche", type: "Fruit", saisons: ETE, nutrition: { calories: 74, glucides: 19, proteines: 0.8, lipides: 0.3 } },
    { id: "brugnon", nom: "Brugnon", type: "Fruit", saisons: ETE, nutrition: { calories: 44, glucides: 10.5, proteines: 1, lipides: 0.3 } },

    // Ete - Legumes
    { id: "tomate", nom: "Tomate", type: "Legume", saisons: ETE, nutrition: { calories: 18, glucides: 3.9, proteines: 0.9, lipides: 0.2 } },
    { id: "courgette", nom: "Courgette", type: "Legume", saisons: ETE, nutrition: { calories: 17, glucides: 3.1, proteines: 1.2, lipides: 0.3 } },
    { id: "aubergine", nom: "Aubergine", type: "Legume", saisons: ETE, nutrition: { calories: 25, glucides: 6, proteines: 1, lipides: 0.2 } },
    { id: "poivron", nom: "Poivron", type: "Legume", saisons: ETE, nutrition: { calories: 31, glucides: 6, proteines: 1, lipides: 0.3 } },
    { id: "concombre", nom: "Concombre", type: "Legume", saisons: ETE, nutrition: { calories: 16, glucides: 3.6, proteines: 0.7, lipides: 0.1 } },
    { id: "haricot-vert", nom: "Haricot vert", type: "Legume", saisons: ETE, nutrition: { calories: 31, glucides: 7, proteines: 1.8, lipides: 0.1 } },
    { id: "fenouil", nom: "Fenouil", type: "Legume", saisons: ETE, nutrition: { calories: 31, glucides: 7.3, proteines: 1.2, lipides: 0.2 } },
    { id: "mais-doux", nom: "Mais doux", type: "Legume", saisons: ETE, nutrition: { calories: 86, glucides: 19, proteines: 3.3, lipides: 1.4 } },
    { id: "laitue", nom: "Laitue", type: "Legume", saisons: ETE, nutrition: { calories: 15, glucides: 2.9, proteines: 1.4, lipides: 0.2 } },
    { id: "roquette", nom: "Roquette", type: "Legume", saisons: ETE, nutrition: { calories: 25, glucides: 3.7, proteines: 2.6, lipides: 0.7 } },
    { id: "betterave", nom: "Betterave", type: "Legume", saisons: ETE, nutrition: { calories: 43, glucides: 9.6, proteines: 1.6, lipides: 0.2 } },
    { id: "celeri-branche", nom: "Celeri branche", type: "Legume", saisons: ETE, nutrition: { calories: 16, glucides: 3, proteines: 0.7, lipides: 0.2 } },
    { id: "oignon-nouveau", nom: "Oignon nouveau", type: "Legume", saisons: ETE, nutrition: { calories: 40, glucides: 9.3, proteines: 1.1, lipides: 0.1 } },

    // Automne - Fruits
    { id: "pomme", nom: "Pomme", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 52, glucides: 14, proteines: 0.3, lipides: 0.2 } },
    { id: "poire", nom: "Poire", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 57, glucides: 15.2, proteines: 0.4, lipides: 0.1 } },
    { id: "raisin", nom: "Raisin", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 69, glucides: 18, proteines: 0.7, lipides: 0.2 } },
    { id: "coing", nom: "Coing", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 57, glucides: 15.3, proteines: 0.4, lipides: 0.1 } },
    { id: "chataigne", nom: "Chataigne", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 213, glucides: 45.5, proteines: 2.4, lipides: 2.2 } },
    { id: "noix", nom: "Noix", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 654, glucides: 14, proteines: 15, lipides: 65 } },
    { id: "noisette", nom: "Noisette", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 628, glucides: 17, proteines: 15, lipides: 61 } },
    { id: "kaki", nom: "Kaki", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 70, glucides: 18.6, proteines: 0.6, lipides: 0.2 } },
    { id: "grenade", nom: "Grenade", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 83, glucides: 18.7, proteines: 1.7, lipides: 1.2 } },
    { id: "mirabelle", nom: "Mirabelle", type: "Fruit", saisons: AUTOMNE, nutrition: { calories: 62, glucides: 15, proteines: 0.5, lipides: 0.2 } },

    // Automne - Legumes
    { id: "potiron", nom: "Potiron", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 26, glucides: 6.5, proteines: 1, lipides: 0.1 } },
    { id: "potimarron", nom: "Potimarron", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 38, glucides: 8.1, proteines: 1.2, lipides: 0.2 } },
    { id: "butternut", nom: "Butternut", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 45, glucides: 12, proteines: 1, lipides: 0.1 } },
    { id: "champignon-paris", nom: "Champignon de Paris", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 22, glucides: 3.3, proteines: 3.1, lipides: 0.3 } },
    { id: "cepe", nom: "Cepe", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 26, glucides: 3.7, proteines: 3.7, lipides: 0.4 } },
    { id: "brocoli", nom: "Brocoli", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 34, glucides: 7, proteines: 2.8, lipides: 0.4 } },
    { id: "chou-fleur", nom: "Chou-fleur", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 25, glucides: 5, proteines: 1.9, lipides: 0.3 } },
    { id: "chou-blanc", nom: "Chou blanc", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 25, glucides: 6, proteines: 1.3, lipides: 0.1 } },
    { id: "chou-rouge", nom: "Chou rouge", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 31, glucides: 7.4, proteines: 1.4, lipides: 0.2 } },
    { id: "chou-bruxelles", nom: "Chou de Bruxelles", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 43, glucides: 9, proteines: 3.4, lipides: 0.3 } },
    { id: "panais", nom: "Panais", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 75, glucides: 18, proteines: 1.2, lipides: 0.3 } },
    { id: "topinambour", nom: "Topinambour", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 73, glucides: 17.4, proteines: 2, lipides: 0 } },
    { id: "celeri-rave", nom: "Celeri-rave", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 42, glucides: 9.2, proteines: 1.5, lipides: 0.3 } },
    { id: "poireau", nom: "Poireau", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 61, glucides: 14, proteines: 1.5, lipides: 0.3 } },
    { id: "endive", nom: "Endive", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 17, glucides: 3.4, proteines: 1.1, lipides: 0.1 } },
    { id: "salsifis", nom: "Salsifis", type: "Legume", saisons: AUTOMNE, nutrition: { calories: 82, glucides: 18.6, proteines: 3.3, lipides: 0.2 } },

    // Hiver - Fruits
    { id: "orange", nom: "Orange", type: "Fruit", saisons: HIVER, nutrition: { calories: 47, glucides: 12, proteines: 0.9, lipides: 0.1 } },
    { id: "clementine", nom: "Clementine", type: "Fruit", saisons: HIVER, nutrition: { calories: 47, glucides: 12, proteines: 0.9, lipides: 0.1 } },
    { id: "mandarine", nom: "Mandarine", type: "Fruit", saisons: HIVER, nutrition: { calories: 53, glucides: 13.3, proteines: 0.8, lipides: 0.3 } },
    { id: "pamplemousse", nom: "Pamplemousse", type: "Fruit", saisons: HIVER, nutrition: { calories: 42, glucides: 10.7, proteines: 0.8, lipides: 0.1 } },
    { id: "citron", nom: "Citron", type: "Fruit", saisons: HIVER, nutrition: { calories: 29, glucides: 9.3, proteines: 1.1, lipides: 0.3 } },
    { id: "kiwi", nom: "Kiwi", type: "Fruit", saisons: HIVER, nutrition: { calories: 61, glucides: 15, proteines: 1.1, lipides: 0.5 } },
    { id: "pomelo", nom: "Pomelo", type: "Fruit", saisons: HIVER, nutrition: { calories: 38, glucides: 9.6, proteines: 0.6, lipides: 0.1 } },
    { id: "ananas", nom: "Ananas (importe, mais courant)", type: "Fruit", saisons: HIVER, nutrition: { calories: 50, glucides: 13, proteines: 0.5, lipides: 0.1 } },
    { id: "litchi", nom: "Litchi", type: "Fruit", saisons: HIVER, nutrition: { calories: 66, glucides: 16.5, proteines: 0.8, lipides: 0.4 } },

    // Hiver - Legumes
    { id: "carotte", nom: "Carotte", type: "Legume", saisons: HIVER, nutrition: { calories: 41, glucides: 10, proteines: 0.9, lipides: 0.2 } },
    { id: "pomme-de-terre", nom: "Pomme de terre", type: "Legume", saisons: HIVER, nutrition: { calories: 77, glucides: 17, proteines: 2, lipides: 0.1 } },
    { id: "patate-douce", nom: "Patate douce", type: "Legume", saisons: HIVER, nutrition: { calories: 86, glucides: 20, proteines: 1.6, lipides: 0.1 } },
    { id: "navet", nom: "Navet", type: "Legume", saisons: HIVER, nutrition: { calories: 28, glucides: 6.4, proteines: 0.9, lipides: 0.1 } },
    { id: "rutabaga", nom: "Rutabaga", type: "Legume", saisons: HIVER, nutrition: { calories: 38, glucides: 8.6, proteines: 1.2, lipides: 0.2 } },
    { id: "chou-frise", nom: "Chou frise (kale)", type: "Legume", saisons: HIVER, nutrition: { calories: 49, glucides: 9, proteines: 4.3, lipides: 0.9 } },
    { id: "mache", nom: "Mache", type: "Legume", saisons: HIVER, nutrition: { calories: 21, glucides: 3.6, proteines: 2, lipides: 0.4 } },
    { id: "scarole", nom: "Scarole", type: "Legume", saisons: HIVER, nutrition: { calories: 17, glucides: 3.4, proteines: 1.3, lipides: 0.2 } },
    { id: "frisee", nom: "Frisee", type: "Legume", saisons: HIVER, nutrition: { calories: 17, glucides: 3.4, proteines: 1.3, lipides: 0.2 } },
    { id: "chou-chinois", nom: "Chou chinois", type: "Legume", saisons: HIVER, nutrition: { calories: 13, glucides: 2.2, proteines: 1.5, lipides: 0.2 } },
    { id: "oignon", nom: "Oignon", type: "Legume", saisons: HIVER, nutrition: { calories: 40, glucides: 9.3, proteines: 1.1, lipides: 0.1 } },
    { id: "echalote", nom: "Echalote", type: "Legume", saisons: HIVER, nutrition: { calories: 72, glucides: 16.8, proteines: 2.5, lipides: 0.1 } },
    { id: "ail", nom: "Ail", type: "Legume", saisons: HIVER, nutrition: { calories: 149, glucides: 33, proteines: 6.4, lipides: 0.5 } },
    { id: "courge-spaghetti", nom: "Courge spaghetti", type: "Legume", saisons: HIVER, nutrition: { calories: 31, glucides: 7, proteines: 0.6, lipides: 0.6 } },
  ],
};

export function getIngredientsByCountry(countryCode = DEFAULT_COUNTRY) {
  return INGREDIENTS_BY_COUNTRY[countryCode] || INGREDIENTS_BY_COUNTRY[DEFAULT_COUNTRY];
}

export const INGREDIENTS = getIngredientsByCountry(DEFAULT_COUNTRY);