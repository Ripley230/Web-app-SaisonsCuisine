import { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Link, useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../src/supaCore";
import { getAuthErrorMessage } from "../../src/authErrors";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, INTERACTION, TYPO } from "../../src/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const showError = (msg) => {
    setErrorMsg(msg);
    Alert.alert("Connexion impossible", msg);
  };

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const { count, error } = await supabase
          .from("profiles")
          .select("user_id", { count: "exact", head: true });

        if (!mounted) return;
        if (!error && typeof count === "number") {
          setUserCount(count);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const onLogin = async () => {
    setErrorMsg("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      return showError("Email et mot de passe obligatoires.");
    }
    if (!cleanEmail.includes("@")) {
      return showError("Format d'email invalide.");
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });
      if (error) return showError(getAuthErrorMessage(error, "Connexion impossible."));

      const currentUser = data?.user;
      if (currentUser?.id) {
        const preferredUsername = String(currentUser.user_metadata?.username || "").trim();
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("username,bio,avatar_url")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        const profileUsername = String(existingProfile?.username || "").trim();
        const fallbackUsername =
          preferredUsername || profileUsername || `user-${currentUser.id.slice(0, 6)}`;
        await supabase.from("profiles").upsert({
          user_id: currentUser.id,
          username: fallbackUsername,
          bio: existingProfile?.bio ?? "",
          avatar_url: existingProfile?.avatar_url ?? null,
        });
      }

      router.replace("/(tabs)");
    } catch (e) {
      showError(getAuthErrorMessage(e, "Connexion impossible."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Connexion</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.inputPlaceholder}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor={COLORS.inputPlaceholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={onLogin} disabled={loading} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.btnText}>{loading ? "Connexion..." : "Se connecter"}</Text>
        </TouchableOpacity>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        {typeof userCount === "number" ? (
          <Text style={styles.counter}>
            {userCount} utilisateur{userCount > 1 ? "s" : ""} sur l{"'"}app
          </Text>
        ) : null}
        <Link href="/auth/signup" asChild><TouchableOpacity><Text style={styles.link}>Pas de compte ? S{"'"}inscrire</Text></TouchableOpacity></Link>
        <TouchableOpacity onPress={() => router.push("/legal/confidentialite")} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.privacyLink}>Politique de confidentialite</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/legal/cgu")} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.privacyLink}>Conditions d{"'"}utilisation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: COLORS.bg },
  title: { ...TYPO.h1, marginBottom: 12 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, marginBottom: 10 },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 12, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  errorText: { marginTop: 10, color: COLORS.danger, fontWeight: "600", textAlign: "center" },
  counter: { marginTop: 10, textAlign: "center", color: COLORS.textMuted, fontWeight: "600" },
  link: { marginTop: 12, color: COLORS.primary, textAlign: "center", fontWeight: "600" },
  privacyLink: {
    marginTop: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});