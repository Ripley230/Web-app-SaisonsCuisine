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
  SUPABASE_REGION_LABEL,
} from "../../src/legalConfig";

function buildMentionsBody() {
  const editorBlock = LEGAL_PUBLISHER_ADDRESS_PUBLISHED && LEGAL_PUBLISHER_ADDRESS.trim()
    ? `Éditeur du service (application) : ${LEGAL_PUBLISHER_NAME}, ${LEGAL_PUBLISHER_ADDRESS.trim()}, ${LEGAL_PUBLISHER_COUNTRY}.\n\n` +
      `Contact : ${GDPR_CONTACT_EMAIL}.\n\n`
    : `Éditeur du service (application) : ${LEGAL_PUBLISHER_NAME}, agissant à titre personnel, résidant en ${LEGAL_PUBLISHER_COUNTRY}.\n` +
      `L’adresse postale n’est pas publiée dans l’application. Contact : ${GDPR_CONTACT_EMAIL}.\n\n`;

  return (
    editorBlock +
    `Hébergement des données : Supabase Inc., données traitées en ${SUPABASE_REGION_LABEL} (vérifier la configuration exacte dans la console Supabase).\n\n` +
    "Propriété intellectuelle : les contenus publiés par les utilisateurs restent leur propriété ; l’éditeur assure l’hébergement et l’affichage dans l’application dans le cadre du service, sans réutilisation promotionnelle externe prévue dans l’état actuel.\n\n" +
    "Litiges : tribunaux compétents selon le droit applicable (souvent en France pour un éditeur résidant en France) — à affiner avec un conseil.\n\n" +
    `Dernière mise à jour des mentions : ${LEGAL_POLICY_LAST_UPDATE}.\n\n` +
    "Ce texte est un modèle : faites-le valider par un professionnel du droit avant diffusion large."
  );
}

export default function MentionsLegalesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mentions légales</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.body}>{buildMentionsBody()}</Text>
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
  body: { color: COLORS.text, lineHeight: 22, fontSize: 14 },
});
