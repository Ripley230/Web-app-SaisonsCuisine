import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "../../src/supaCore";
import { getAuthErrorMessage } from "../../src/authErrors";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, INTERACTION, TYPO } from "../../src/theme";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);

  const showError = (msg) => {
    setErrorMsg(msg);
    Alert.alert("Info", msg);
  };

  const onSignup = async () => {
    setErrorMsg("");
    if (!acceptPrivacy) {
      return showError("Tu dois accepter la politique de confidentialite pour t'inscrire.");
    }
    if (!acceptTerms) {
      return showError("Tu dois accepter les conditions d'utilisation pour t'inscrire.");
    }
    if (!acceptAge) {
      return showError("Tu dois confirmer avoir au moins 16 ans.");
    }
    const cleanUsername = username.trim();
    if (!cleanUsername) return showError("Pseudo obligatoire.");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) return showError("Email et mot de passe obligatoires.");
    if (!cleanEmail.includes("@")) return showError("Format d'email invalide.");
    if (cleanPassword.length < 6) return showError("Mot de passe minimum 6 caracteres.");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            username: cleanUsername,
          },
        },
      });
      if (error) {
        return showError(getAuthErrorMessage(error, "Inscription impossible."));
      }

      // Supabase can return an obfuscated user with no identities when the email
      // already exists (anti-enumeration behavior, often with email confirmation on).
      if (data?.user && (!Array.isArray(data.user.identities) || data.user.identities.length === 0)) {
        return showError("Cet email est deja utilise. Connecte-toi ou reinitialise ton mot de passe.");
      }

      if (data?.user?.id) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          user_id: data.user.id,
          username: cleanUsername,
          bio: "",
        });
        if (profileError) {
          // Do not block signup flow if profile RLS is restrictive.
          router.replace(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}`);
          return;
        }
      }

      router.replace(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}`);
    } catch (e) {
      showError(getAuthErrorMessage(e, "Inscription impossible."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Inscription</Text>
        <TextInput
          style={styles.input}
          placeholder="Pseudo"
          placeholderTextColor={COLORS.inputPlaceholder}
          value={username}
          onChangeText={setUsername}
        />
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

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAcceptPrivacy((v) => !v)}
          activeOpacity={INTERACTION.activeOpacity}
        >
          <View style={[styles.checkBox, acceptPrivacy && styles.checkBoxOn]} />
          <Text style={styles.checkLabel}>
            J’accepte la{" "}
            <Text style={styles.checkLink} onPress={() => router.push("/legal/confidentialite")}>
              politique de confidentialite
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAcceptTerms((v) => !v)}
          activeOpacity={INTERACTION.activeOpacity}
        >
          <View style={[styles.checkBox, acceptTerms && styles.checkBoxOn]} />
          <Text style={styles.checkLabel}>
            J{"'"}accepte les{" "}
            <Text style={styles.checkLink} onPress={() => router.push("/legal/cgu")}>
              conditions d{"'"}utilisation
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAcceptAge((v) => !v)}
          activeOpacity={INTERACTION.activeOpacity}
        >
          <View style={[styles.checkBox, acceptAge && styles.checkBoxOn]} />
          <Text style={styles.checkLabel}>J’ai au moins 16 ans.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={onSignup} disabled={loading} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.btnText}>{loading ? "Inscription..." : "S'inscrire"}</Text>
        </TouchableOpacity>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        <Link href="/auth/login" asChild><TouchableOpacity><Text style={styles.link}>Deja un compte ? Se connecter</Text></TouchableOpacity></Link>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.bg,
  },
  title: { ...TYPO.h1, marginBottom: 12 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, marginBottom: 10 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, gap: 10 },
  checkBox: {
    width: 22,
    height: 22,
    marginTop: 2,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  checkBoxOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  checkLabel: { flex: 1, color: COLORS.text, lineHeight: 22 },
  checkLink: { color: COLORS.primary, fontWeight: "700", textDecorationLine: "underline" },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 12, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  errorText: { marginTop: 10, color: COLORS.danger, fontWeight: "600", textAlign: "center" },
  link: { marginTop: 12, color: COLORS.primary, textAlign: "center", fontWeight: "600" },
});