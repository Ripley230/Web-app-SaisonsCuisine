export function getAuthErrorMessage(error, fallback = "Une erreur est survenue.") {
  const rawMessage = String(error?.message || "").trim();
  const raw = rawMessage.toLowerCase();
  const code = (error?.code || "").toLowerCase();

  if (code === "invalid_credentials" || raw.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }

  if (raw.includes("email not confirmed")) {
    return "Confirme ton email avant de te connecter.";
  }

  if (raw.includes("user already registered")) {
    return "Cet email est deja utilise.";
  }

  if (raw.includes("password should be at least")) {
    return "Le mot de passe doit contenir au moins 6 caracteres.";
  }

  if (raw.includes("unable to validate email address")) {
    return "Adresse email invalide.";
  }

  if (raw.includes("network") || raw.includes("failed to fetch")) {
    return "Probleme reseau. Verifie ta connexion puis reessaie.";
  }

  if (rawMessage || code) {
    const detail = rawMessage || `code=${code}`;
    return `${fallback}\n\nDetail: ${detail}`;
  }

  return fallback;
}
