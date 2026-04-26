import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/supaCore";
import { COLORS, RADIUS, INTERACTION, TYPO } from "../src/theme";

const BUG_TYPES = [
  "Crash application",
  "Bug affichage",
  "Probleme navigation",
  "Probleme performance",
  "Autre",
];

export default function ReportBugScreen() {
  const router = useRouter();
  const [bugType, setBugType] = useState(BUG_TYPES[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const submitBug = async () => {
    const cleanDetails = details.trim();
    if (cleanDetails.length < 8) {
      return Alert.alert("Info", "Ajoute un peu plus de details pour aider l'equipe.");
    }

    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error(userErr?.message || "Utilisateur non connecte.");

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: "bug",
        target_id: "app",
        reason: bugType,
        details: cleanDetails,
      });
      if (error) throw error;

      Alert.alert("Merci", "Ton bug a bien ete envoye aux admins.");
      router.back();
    } catch (e) {
      Alert.alert("Erreur remontée", e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Signaler un bug</Text>
        <Text style={styles.subtitle}>
          Aide-nous a ameliorer l'app en decrivant le probleme rencontre.
        </Text>

        <Text style={styles.label}>Type de bug</Text>
        {BUG_TYPES.map((type) => {
          const active = bugType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, active && styles.typeBtnActive]}
              onPress={() => setBugType(type)}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={[styles.typeText, active && styles.typeTextActive]}>{type}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={styles.textarea}
          multiline
          value={details}
          onChangeText={setDetails}
          placeholder="Que faisais-tu ? Que s'est-il passe ?"
          placeholderTextColor={COLORS.inputPlaceholder}
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={submitBug}
          disabled={loading}
          activeOpacity={INTERACTION.activeOpacity}
        >
          <Text style={styles.submitText}>{loading ? "Envoi..." : "Envoyer le bug"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { ...TYPO.h2, color: COLORS.text, marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, marginBottom: 12 },
  label: { fontWeight: "700", color: COLORS.text, marginBottom: 6, marginTop: 6 },
  typeBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 8,
  },
  typeBtnActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primaryBorder },
  typeText: { color: COLORS.text },
  typeTextActive: { color: COLORS.primary, fontWeight: "700" },
  textarea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    minHeight: 120,
    textAlignVertical: "top",
    padding: 10,
  },
  submitBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700" },
});
