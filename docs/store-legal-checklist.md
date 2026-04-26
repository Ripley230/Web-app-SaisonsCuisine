# Checklist pre-publication (App Store + Google Play)

## 1) Juridique (indispensable)
- [ ] Faire relire `app/legal/confidentialite.js`, `app/legal/mentions.js`, `app/legal/cgu.js` par un professionnel du droit.
- [ ] Verifier que `src/legalConfig.js` contient les informations finales exactes.
- [ ] Definir un process de reponse aux demandes RGPD (acces, suppression, rectification) via l'email de contact.
- [ ] Definir une procedure de gestion d'incident de securite (qui fait quoi, sous quel delai).

## 2) Donnees & sous-traitants
- [ ] Verifier la region Supabase et conserver une capture de configuration.
- [ ] Verifier/archiver le DPA Supabase accepte sur le projet.
- [ ] Documenter les durees de conservation reelles (BDD, backups, journaux).
- [ ] Verifier qu'aucun SDK tiers non declare n'est present (analytics, ads, crash).

## 3) Store compliance
- [ ] Google Play: remplir "Data safety" avec les donnees effectivement collectees et partagees.
- [ ] App Store Connect: remplir les "Privacy Nutrition Labels" de maniere exacte.
- [ ] Fournir une URL publique de politique de confidentialite si exigee par le store/compte dev.
- [ ] Verifier les metadonnees age/rating en coherence avec age minimum 16 ans.

## 4) Produit (dans l'app)
- [ ] Verifier les parcours: inscription, consentement, suppression compte, export donnees.
- [ ] Verifier l'accessibilite des pages legales sans connexion.
- [ ] Tester l'envoi e-mail "Contacter le responsable" sur Android et iOS.
- [ ] Tester les textes et liens legaux en FR sur petits et grands ecrans.

## 5) Preuve & tracabilite (recommande)
- [ ] Garder un changelog des mises a jour legales (date + motif).
- [ ] Conserver une copie de la version publiee des textes legaux.
- [ ] Archiver les captures de formulaires Store completes avant soumission.
