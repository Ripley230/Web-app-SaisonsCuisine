import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, INTERACTION, TYPO } from "../../src/theme";
import {
  GDPR_CONTACT_EMAIL,
  LEGAL_POLICY_LAST_UPDATE,
  LEGAL_PUBLISHER_NAME,
} from "../../src/legalConfig";

const SECTIONS = [
  {
    title: "1. Objet",
    body:
      "Les presentes conditions generales d'utilisation (CGU) encadrent l'acces et l'usage de l'application par ses utilisateurs.",
  },
  {
    title: "2. Compte utilisateur",
    body:
      "L'inscription est reservee aux personnes d'au moins 16 ans. L'utilisateur est responsable de la confidentialite de ses identifiants et des activites realisees depuis son compte.",
  },
  {
    title: "3. Contenus publies",
    body:
      "Les recettes, commentaires et autres contenus publies restent la propriete de leurs auteurs. En publiant, l'utilisateur accorde une licence non exclusive d'hebergement et d'affichage dans l'application, uniquement pour le fonctionnement du service.",
  },
  {
    title: "4. Comportements interdits",
    body:
      "Sont interdits : contenus illicites, haineux, diffamatoires, violents, portant atteinte aux droits de tiers ou aux lois applicables, ainsi que toute tentative de perturber la securite du service.",
  },
  {
    title: "5. Moderation et suspension",
    body:
      "L'editeur peut retirer un contenu, limiter ou suspendre un compte en cas d'abus, de signalement justifie ou de non-respect des CGU, de maniere proportionnee.",
  },
  {
    title: "6. Disponibilite et responsabilite",
    body:
      "Le service est fourni en l'etat, sans garantie d'absence d'interruption ou d'erreur. L'editeur met en oeuvre des moyens raisonnables pour assurer le bon fonctionnement, sans obligation de resultat.",
  },
  {
    title: "7. Donnees personnelles",
    body:
      "Le traitement des donnees personnelles est detaille dans la Politique de confidentialite, accessible depuis l'application.",
  },
  {
    title: "8. Contact",
    body: `Pour toute question relative au service ou aux CGU : ${GDPR_CONTACT_EMAIL}.`,
  },
  {
    title: "9. Evolution des CGU",
    body:
      "Les CGU peuvent etre modifiees. La version affichee dans l'application fait foi. En cas de changement majeur, une information pourra etre affichee dans l'app.",
  },
];

export default function CguScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Conditions d{"'"}utilisation</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          Ces CGU s{"'"}appliquent au service edite par {LEGAL_PUBLISHER_NAME}. Derniere mise a jour :{" "}
          {LEGAL_POLICY_LAST_UPDATE}.
        </Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.block}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
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
});
