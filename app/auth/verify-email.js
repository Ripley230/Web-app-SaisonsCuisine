import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, INTERACTION, TYPO } from "../../src/theme";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Verification email</Text>
        <Text style={styles.text}>
          Un email de validation a ete envoye a:
        </Text>
        <Text style={styles.email}>{String(email || "")}</Text>

        <Text style={styles.text}>
          Ouvre ce mail et clique sur le lien pour activer ton compte.
        </Text>
        <Text style={styles.hint}>
          Pense a verifier aussi les spams / courriers indesirables.
        </Text>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace("/auth/login")}
          activeOpacity={INTERACTION.activeOpacity}
        >
          <Text style={styles.btnText}>Aller a la connexion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16, justifyContent: "center" },
  title: { ...TYPO.h1, color: COLORS.text, marginBottom: 10 },
  text: { color: COLORS.textMuted, marginBottom: 8 },
  email: {
    color: COLORS.primary,
    fontWeight: "800",
    marginBottom: 12,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.sm,
    padding: 10,
  },
  hint: { color: "#92400e", marginBottom: 14 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
