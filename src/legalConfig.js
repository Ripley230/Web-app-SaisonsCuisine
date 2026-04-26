/**
 * Identité et contact — informations affichées dans l’app (mentions, politique, export).
 * Textes à faire relire par un professionnel du droit si diffusion large.
 */

export const GDPR_CONTACT_EMAIL = "quentinhartmann13@gmail.com";

/** Responsable du traitement / éditeur (personne physique). */
export const LEGAL_PUBLISHER_NAME = "HARTMANN Quentin";

export const LEGAL_PUBLISHER_COUNTRY = "France";

/**
 * Si true, LEGAL_PUBLISHER_ADDRESS est affichée dans l’app.
 * Si false, seul le pays et l’email de contact figurent (adresse non communiquée sur la page).
 */
export const LEGAL_PUBLISHER_ADDRESS_PUBLISHED = false;

/** Renseigner uniquement si LEGAL_PUBLISHER_ADDRESS_PUBLISHED est true. */
export const LEGAL_PUBLISHER_ADDRESS = "";

/** Région du projet Supabase (dashboard). */
export const SUPABASE_REGION_LABEL = "Ireland (Union européenne — infrastructure Supabase)";

/** Autres sous-traitants recevant des données perso (hors Supabase). */
export const OTHER_PROCESSORS_LINE =
  "Aucun autre service (analytics, publicité, profilage, e-mail transactionnel tiers) n’est intégré à l’application dans l’état actuel du code.";

/** Affichée en en-tête de politique / suivi des versions. */
export const LEGAL_POLICY_LAST_UPDATE = "avril 2026";
