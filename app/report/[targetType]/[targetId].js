import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../src/supaCore";
import { COLORS } from "../../../src/theme";

const REASONS = [
  "Contenu inapproprie",
  "Spam",
  "Harcèlement",
  "Faux contenu",
  "Autre",
];

export default function ReportScreen() {
  const router = useRouter();
  const { targetType, targetId } = useLocalSearchParams();

  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const submitReport = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) throw new Error(userErr?.message || "Utilisateur non connecte.");
      if (!targetType || !targetId) throw new Error("Cible de signalement invalide.");

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: String(targetType),
        target_id: String(targetId),
        reason,
        details: details.trim() || null,
      });

      if (error) throw error;

      Alert.alert("Merci", "Signalement envoye.");
      router.back();
    } catch (e) {
      Alert.alert("Erreur signalement", e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signaler</Text>
      <Text style={styles.sub}>
        Type: {String(targetType)} | ID: {String(targetId)}
      </Text>

      <Text style={styles.label}>Motif</Text>
      {REASONS.map((r) => {
        const active = reason === r;
        return (
          <TouchableOpacity
            key={r}
            onPress={() => setReason(r)}
            style={[styles.reasonBtn, active && styles.reasonBtnActive]}
          >
            <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{r}</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.label}>Details (optionnel)</Text>
      <TextInput
        style={styles.textarea}
        multiline
        value={details}
        onChangeText={setDetails}
        placeholder="Ajoute un contexte si besoin..."
        placeholderTextColor={COLORS.inputPlaceholder}
      />

      <TouchableOpacity
        style={[styles.submit, loading && { opacity: 0.6 }]}
        onPress={submitReport}
        disabled={loading}
      >
        <Text style={styles.submitText}>{loading ? "Envoi..." : "Envoyer signalement"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f9f8", padding: 16 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  sub: { color: "#6b7280", marginBottom: 10 },
  label: { fontWeight: "700", marginBottom: 6, marginTop: 8 },
  reasonBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  reasonBtnActive: { borderColor: "#166534", backgroundColor: "#ecfdf5" },
  reasonText: { color: "#111827" },
  reasonTextActive: { color: "#166534", fontWeight: "700" },
  textarea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    minHeight: 100,
    textAlignVertical: "top",
    padding: 10,
  },
  submit: {
    marginTop: 12,
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700" },
});
