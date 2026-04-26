import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { saveCountry } from "../../src/preferences";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../../src/theme";

export default function CountryOnboardingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onSelectFrance = async () => {
    setLoading(true);
    try {
      await saveCountry("FR");
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible d'enregistrer le pays.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Bienvenue</Text>
        <Text style={styles.subtitle}>
          Choisis ton pays pour afficher les fruits et legumes de saison adaptes.
        </Text>

        <TouchableOpacity
          style={[styles.countryBtn, loading && styles.countryBtnDisabled]}
          onPress={onSelectFrance}
          disabled={loading}
        >
          <Text style={styles.countryTitle}>🇫🇷 France</Text>
          <Text style={styles.countryText}>Utiliser les saisons francaises</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  countryBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    padding: 14,
  },
  countryBtnDisabled: { opacity: 0.6 },
  countryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 4,
  },
  countryText: { color: COLORS.textMuted },
});
