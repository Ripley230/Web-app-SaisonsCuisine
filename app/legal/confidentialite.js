import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, INTERACTION, TYPO } from "../../src/theme";
import {
  GDPR_CONTACT_EMAIL,
  LEGAL_POLICY_LAST_UPDATE,
  LEGAL_PUBLISHER_ADDRESS,
  LEGAL_PUBLISHER_ADDRESS_PUBLISHED,
  LEGAL_PUBLISHER_COUNTRY,
  LEGAL_PUBLISHER_NAME,
  OTHER_PROCESSORS_LINE,
  SUPABASE_REGION_LABEL,
} from "../../src/legalConfig";

function buildControllerBlock() {
  if (LEGAL_PUBLISHER_ADDRESS_PUBLISHED && LEGAL_PUBLISHER_ADDRESS.trim()) {
    return (
      `Le traitement des données personnelles est effectué par ${LEGAL_PUBLISHER_NAME}, ` +
      `${LEGAL_PUBLISHER_ADDRESS.trim()}, ${LEGAL_PUBLISHER_COUNTRY} (responsable du traitement, personne physique). ` +
      `Contact pour les données personnelles : ${GDPR_CONTACT_EMAIL}. ` +
      "Aucun délégué à la protection des données (DPO) n’a été désigné ; les demandes se font via cet e-mail."
    );
  }
  return (
    `Le traitement des données personnelles est effectué par ${LEGAL_PUBLISHER_NAME}, résidant en ${LEGAL_PUBLISHER_COUNTRY}, ` +
    "agissant à titre personnel (responsable du traitement). " +
    "L’adresse postale précise n’est pas publiée dans l’application ; pour l’exercice de vos droits ou les demandes prévues par la loi, écrivez à : " +
    `${GDPR_CONTACT_EMAIL}. ` +
    "Aucun délégué à la protection des données (DPO) n’a été désigné ; les demandes relatives aux données personnelles se font via cet e-mail."
  );
}

const SECTIONS = [
  {
    title: "1. Responsable du traitement",
    body: buildControllerBlock(),
  },
  {
    title: "2. Données collectées",
    body:
      "Compte : adresse e-mail, mot de passe (haché côté prestataire d’authentification), identifiant utilisateur.\n" +
      "Profil public : pseudo, biographie éventuelle, photo de profil éventuelle.\n" +
      "Contenus : recettes (titre, ingrédients, textes, images), commentaires, likes, abonnements entre utilisateurs.\n" +
      "Signalements et bugs : motifs et textes que vous saisissez.\n" +
      "Données locales sur l’appareil : préférences (ex. pays, favoris en cache) via stockage local sécurisé par l’OS.",
  },
  {
    title: "3. Finalités",
    body:
      "Fournir le service (compte, publication, consultation des recettes et profils, interactions sociales).\n" +
      "Assurer la sécurité et la modération (traitement des signalements).\n" +
      "Améliorer le service de manière proportionnée (correction de bugs remontés).\n" +
      "Respecter les obligations légales applicables.\n" +
      "Il n’y a pas de newsletter, pas de publicité dans l’app et pas de profilage à des fins marketing ou de recommandation automatisée dans l’état actuel du service.",
  },
  {
    title: "4. Bases légales (résumé)",
    body:
      "Exécution du contrat ou mesures précontractuelles : création et gestion du compte, publication des contenus que vous choisissez de rendre visibles.\n" +
      "Intérêt légitime lorsque applicable : sécurité, lutte contre les abus, modération — dans le respect de vos droits et de l’équilibre des intérêts.\n" +
      "Consentement lorsque la loi l’exige : cases cochées à l’inscription (politique de confidentialité, âge minimal 16 ans).",
  },
  {
    title: "5. Destinataires et hébergement",
    body:
      `Les données sont hébergées et traitées via la plateforme Supabase (base de données, authentification, stockage de fichiers), en ${SUPABASE_REGION_LABEL}. ` +
      "Conformez-vous au Data Processing Agreement (DPA) et à la configuration de votre projet dans la console Supabase.\n" +
      `${OTHER_PROCESSORS_LINE}\n` +
      "Les autres utilisateurs peuvent voir les contenus que vous publiez volontairement (recettes, commentaires, profil public).\n" +
      "Les recettes et photos publiées par les utilisateurs sont destinées à l’usage du service dans l’application ; aucune réutilisation promotionnelle (réseaux sociaux, mise en avant externe) n’est prévue dans l’état actuel.",
  },
  {
    title: "6. Durées de conservation (principes)",
    body:
      "Données de compte et contenus : conservées tant que le compte existe ; aucune suppression automatique du seul fait de l’inactivité n’est prévue pour l’instant. La suppression du compte dans l’application déclenche la suppression des données associées dans la mesure du possible techniquement et légalement.\n" +
      "Signalements et données de modération : conservées le temps nécessaire à la gestion des signalements et à la sécurité du service ; aucune durée fixe unique n’a été définie à ce stade.\n" +
      "Certaines données peuvent être conservées une durée limitée si la loi l’impose ou sous forme anonymisée pour statistiques.\n" +
      "Sauvegardes techniques : délais liés à l’hébergeur ; elles ne prolongent pas l’usage actif des données au-delà du nécessaire.",
  },
  {
    title: "7. Vos droits (RGPD)",
    body:
      `Droit d’accès, de rectification, d’effacement, à la limitation du traitement, à la portabilité des données que vous avez fournies (lorsque applicable), d’opposition pour motifs légitimes, et le droit de retirer votre consentement lorsque le traitement est fondé sur le consentement.\n` +
      `Pour exercer vos droits : écrivez à ${GDPR_CONTACT_EMAIL}. Une réponse sera apportée dans les délais prévus par la loi.\n` +
      "Vous pouvez aussi déposer une réclamation auprès de l’autorité de protection des données (ex. CNIL en France : www.cnil.fr).",
  },
  {
    title: "8. Sécurité",
    body:
      "Des mesures techniques et organisationnelles raisonnables sont mises en œuvre (authentification, contrôle d’accès, chiffrement en transit selon les standards du prestataire). Aucun système n’est exempt de risque.",
  },
  {
    title: "9. Mineurs",
    body:
      "Le service s’adresse aux personnes d’au moins 16 ans (confirmation à l’inscription). Si vous estimez qu’un mineur a fourni des données, contactez-nous pour suppression.",
  },
  {
    title: "10. Évolution de la politique",
    body:
      "Cette politique peut être mise à jour. La version affichée dans l’application fait foi ; en cas de changement majeur, un affichage ou une information dans l’app pourra être utilisé.",
  },
];

export default function ConfidentialiteScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Politique de confidentialité</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          Document d’information (modèle à faire relire par un professionnel du droit si besoin). Dernière mise à jour
          indiquée : {LEGAL_POLICY_LAST_UPDATE}.
        </Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.block}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
        <Text style={styles.footer}>Pour toute question : {GDPR_CONTACT_EMAIL}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  back: { color: COLORS.primary, fontWeight: "700", marginBottom: 8 },
  title: { ...TYPO.h2, color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  intro: { color: COLORS.textMuted, marginBottom: 16, lineHeight: 20 },
  block: { marginBottom: 18 },
  sectionTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 8, fontSize: 15 },
  body: { color: COLORS.text, lineHeight: 22, fontSize: 14 },
  footer: { marginTop: 8, color: COLORS.textMuted, fontWeight: "600" },
});
