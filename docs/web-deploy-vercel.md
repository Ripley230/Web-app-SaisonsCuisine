# Deploy web gratuit (Option A)

Objectif : tester ton app sur iPhone/Android via navigateur, sans laisser ton PC allume.

## 1) Preparer une build web locale

```bash
npm install
npm run build:web
```

Le site statique est genere dans `dist/`.

## 2) Tester en local (optionnel)

```bash
npm run serve:web
```

Puis ouvrir l'URL locale affichee.

## 3) Deploy gratuit sur Vercel (recommande)

1. Cree un compte Vercel (gratuit) puis connecte ton repo GitHub.
2. Importe le projet.
3. Vercel detecte `vercel.json` et utilise automatiquement :
   - `buildCommand`: `npm run build:web`
   - `outputDirectory`: `dist`
4. Lance le deploy.
5. Tu obtiens une URL publique (`https://...vercel.app`) testable sur iPhone sans PC allume.

## 4) Ajouter au besoin sur ecran d'accueil iPhone

Dans Safari :
- Ouvrir l'URL Vercel
- Bouton partager
- "Sur l'ecran d'accueil"

## 5) Workflow ensuite

- Tu modifies le code
- Tu pushes sur GitHub
- Vercel redeploie automatiquement
- Tes testeurs gardent la meme URL

## Notes importantes

- Cette option est parfaite pour iterer produit a cout zero.
- Ce n'est pas equivalent a une app iOS native/TestFlight.
- Pour publication App Store plus tard, il faudra toujours passer par Apple Developer + TestFlight/App Store Connect.
