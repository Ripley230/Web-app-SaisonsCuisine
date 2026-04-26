import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
  Linking,
} from "react-native";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { loadFavoris, saveFavoris } from "../src/storage";
import { supabase } from "../src/supaCore";
import { clearCountry, loadCountry } from "../src/preferences";
import { COUNTRIES, DEFAULT_COUNTRY } from "../src/data";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../src/theme";
import { isUserAdmin } from "../src/authz";
import { UserAvatar } from "../components/UserAvatar";
import {
  deleteProfileAvatarFile,
  uploadProfileAvatar,
} from "../src/profileAvatar";
import { buildGdprExportPackage } from "../src/gdprExport";
import { GDPR_CONTACT_EMAIL } from "../src/legalConfig";

export default function SettingsScreen() {
  const router = useRouter();

  const [countFav, setCountFav] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);

  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [draftPseudo, setDraftPseudo] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [pickedAvatarUri, setPickedAvatarUri] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingGdpr, setExportingGdpr] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const fav = await loadFavoris(session?.user?.id);
      const savedCountry = await loadCountry();

      setCountFav(fav.length);
      setMyUserId(session?.user?.id || null);
      setCountryCode(savedCountry || DEFAULT_COUNTRY);

      if (session?.user?.id) {
        const fallbackUsername =
          session.user.user_metadata?.username?.trim() ||
          `user-${session.user.id.slice(0, 6)}`;

        const { data: myProfile, error: profileErr } = await supabase
          .from("profiles")
          .select("username,bio,avatar_url")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profileErr) {
          Alert.alert("Erreur profil", profileErr.message);
        } else {
          const rawUsername = String(myProfile?.username || "").trim();
          const username =
            !rawUsername || rawUsername.includes("@") ? fallbackUsername : rawUsername;
          const profileBio = myProfile?.bio || "Bio non renseignee";
          setPseudo(username);
          setBio(profileBio);
          setDraftPseudo(username);
          setDraftBio(profileBio);
          setAvatarUrl(myProfile?.avatar_url || null);

          if (!myProfile || rawUsername.includes("@")) {
            await supabase.from("profiles").upsert({
              user_id: session.user.id,
              username,
              bio: "",
              avatar_url: myProfile?.avatar_url ?? null,
            });
          }
        }

        setIsAdmin(isUserAdmin(session.user));

        const { count } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", session.user.id);
        setFollowersCount(count || 0);

        const { count: followingExact } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", session.user.id);
        setFollowingCount(followingExact || 0);
      }
    })();
  }, []);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Autorise l'acces photos pour continuer.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      setAvatarRemoved(false);
      setPickedAvatarUri(result.assets[0].uri);
    }
  };

  const onSave = async () => {
    const nextPseudo = draftPseudo.trim();
    const nextBio = draftBio.trim();

    if (!nextPseudo) return Alert.alert("Info", "Pseudo obligatoire.");
    if (!myUserId) return Alert.alert("Erreur", "Utilisateur non connecte.");

    setSaving(true);
    try {
      let finalAvatar = avatarUrl;
      if (avatarRemoved) {
        if (avatarUrl) await deleteProfileAvatarFile(avatarUrl);
        finalAvatar = null;
      } else if (pickedAvatarUri) {
        finalAvatar = await uploadProfileAvatar(myUserId, pickedAvatarUri);
      }

      const { error } = await supabase.from("profiles").upsert({
        user_id: myUserId,
        username: nextPseudo,
        bio: nextBio || "",
        avatar_url: finalAvatar,
      });
      if (error) return Alert.alert("Erreur profil", error.message);

      setAvatarUrl(finalAvatar);
      setPickedAvatarUri(null);
      setAvatarRemoved(false);
      setPseudo(nextPseudo);
      setBio(nextBio || "Bio non renseignee");
      setIsEditing(false);
      Alert.alert("OK", "Profil mis a jour");
    } catch (e) {
      Alert.alert("Erreur", e.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return Alert.alert("Erreur", error.message);
    router.replace("/auth/login");
  };

  const deleteMyProfile = async () => {
    if (!myUserId) return Alert.alert("Erreur", "Utilisateur non connecte.");

    Alert.alert(
      "Suppression du profil",
      "Cette action va supprimer ton profil et tes donnees associees. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              if (avatarUrl) {
                try {
                  await deleteProfileAvatarFile(avatarUrl);
                } catch (_) {
                  /* fichier deja absent ou RLS */
                }
              }
              const { data: myRecipes } = await supabase
                .from("recipes")
                .select("id")
                .eq("user_id", myUserId);

              const myRecipeIds = (myRecipes || []).map((r) => r.id);
              if (myRecipeIds.length > 0) {
                await supabase.from("recipe_likes").delete().in("recipe_id", myRecipeIds);
                await supabase.from("comments").delete().in("recipe_id", myRecipeIds);
              }

              await supabase.from("recipe_likes").delete().eq("user_id", myUserId);
              await supabase.from("comments").delete().eq("user_id", myUserId);
              await supabase.from("follows").delete().eq("follower_id", myUserId);
              await supabase.from("follows").delete().eq("following_id", myUserId);
              await supabase.from("reports").delete().eq("reporter_id", myUserId);
              await supabase.from("reports").delete().eq("target_type", "profile").eq("target_id", myUserId);
              await supabase.from("recipes").delete().eq("user_id", myUserId);
              await supabase.from("profiles").delete().eq("user_id", myUserId);

              await saveFavoris([], myUserId);
              await clearCountry();
              await supabase.auth.signOut();
              Alert.alert("Profil supprime", "Ton profil a bien ete supprime.");
              router.replace("/auth/login");
            } catch (e) {
              Alert.alert("Erreur suppression", e.message || "Suppression impossible.");
            }
          },
        },
      ]
    );
  };

  const countryLabel =
    COUNTRIES.find((c) => c.code === countryCode)?.label || countryCode;

  const onExportGdpr = async () => {
    if (!myUserId) return Alert.alert("Erreur", "Utilisateur non connecte.");
    setExportingGdpr(true);
    try {
      const pkg = await buildGdprExportPackage(myUserId);
      const json = JSON.stringify(pkg, null, 2);
      const exportFile = new File(Paths.cache, `export-rgpd-${Date.now()}.json`);
      exportFile.write(json, { encoding: "utf8" });
      const shareUrl = exportFile.uri;
      const result = await Share.share({
        title: "Export donnees personnelles",
        message: "Export JSON (RGPD / portabilite)",
        url: shareUrl,
      });
      if (result.action === Share.dismissedAction) {
        /* utilisateur a ferme la feuille de partage */
      }
    } catch (e) {
      Alert.alert("Export impossible", e?.message || "Reessaie plus tard.");
    } finally {
      setExportingGdpr(false);
    }
  };

  const onOpenGdprContact = () => {
    const mail = GDPR_CONTACT_EMAIL?.trim();
    if (!mail || mail.includes("exemple")) {
      return Alert.alert(
        "Contact",
        "Configure l'adresse de contact RGPD dans src/legalConfig.js (GDPR_CONTACT_EMAIL)."
      );
    }
    Linking.openURL(`mailto:${mail}?subject=${encodeURIComponent("Demande RGPD")}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Reglages</Text>

        {!isEditing ? (
          <View style={styles.card}>
            <View style={styles.profileHeadRow}>
              <UserAvatar uri={avatarUrl} size={72} />
              <View style={styles.profileHeadText}>
                <View style={styles.nameRow}>
                  <Text style={styles.pseudo}>{pseudo}</Text>
                  {isAdmin ? <Text style={styles.adminBadge}>ADMIN</Text> : null}
                </View>
              </View>
            </View>
            <Text style={styles.bio}>{bio}</Text>
            <Text style={styles.meta}>Pays: {countryLabel}</Text>
            <Text style={styles.meta}>Favoris: {countFav}</Text>
            <Text style={styles.meta}>Abonnes: {followersCount}</Text>
            <Text style={styles.meta}>Personnes suivies: {followingCount}</Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setPickedAvatarUri(null);
                setAvatarRemoved(false);
                setIsEditing(true);
              }}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.primaryBtnText}>Modifier profil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/onboarding/country")}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.secondaryBtnText}>Changer de pays</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Donnees personnelles (RGPD)</Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/legal/confidentialite")}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.secondaryBtnText}>Politique de confidentialite</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/legal/mentions")}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.secondaryBtnText}>Mentions legales</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/legal/cgu")}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.secondaryBtnText}>Conditions d{"'"}utilisation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, exportingGdpr && styles.btnDisabled]}
              onPress={onExportGdpr}
              disabled={exportingGdpr}
              activeOpacity={INTERACTION.activeOpacity}
            >
              {exportingGdpr ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.secondaryBtnText}>Exporter mes donnees (JSON)</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onOpenGdprContact}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.secondaryBtnText}>Contacter le responsable (email)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bugBtn}
              onPress={() => router.push("/report-bug")}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.bugBtnText}>Remonter un bug</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.consoleBtn}
              onPress={() => router.push("/reports-console")}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.consoleBtnText}>Console bugs & signalements</Text>
            </TouchableOpacity>

            {isAdmin ? (
              <TouchableOpacity style={styles.adminBtn} onPress={() => router.push("/admin")} activeOpacity={INTERACTION.activeOpacity}>
                <Text style={styles.adminBtnText}>Ouvrir Admin</Text>
              </TouchableOpacity>
            ) : null}

            {myUserId ? (
              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => router.push(`/report/profile/${myUserId}`)}
                activeOpacity={INTERACTION.activeOpacity}
              >
                <Text style={styles.reportBtnText}>Signaler ce profil</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={INTERACTION.activeOpacity}>
              <Text style={styles.logoutBtnText}>Se deconnecter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteProfileBtn} onPress={deleteMyProfile} activeOpacity={INTERACTION.activeOpacity}>
              <Text style={styles.deleteProfileBtnText}>Supprimer mon profil</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Photo de profil</Text>
            <View style={styles.avatarEditRow}>
              <UserAvatar
                uri={avatarRemoved ? null : pickedAvatarUri || avatarUrl}
                size={88}
              />
            </View>
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickAvatar} activeOpacity={INTERACTION.activeOpacity}>
              <Text style={styles.secondaryBtnText}>Choisir une photo</Text>
            </TouchableOpacity>
            {(avatarUrl || pickedAvatarUri) && !avatarRemoved ? (
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => {
                  setPickedAvatarUri(null);
                  setAvatarRemoved(true);
                }}
                activeOpacity={INTERACTION.activeOpacity}
              >
                <Text style={styles.removePhotoBtnText}>Retirer la photo</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.label}>Pseudo</Text>
            <TextInput
              value={draftPseudo}
              onChangeText={setDraftPseudo}
              style={styles.input}
              placeholder="Ton pseudo"
              placeholderTextColor={COLORS.inputPlaceholder}
            />
            <Text style={styles.label}>Bio</Text>
            <TextInput
              value={draftBio}
              onChangeText={setDraftBio}
              style={[styles.input, styles.textarea]}
              multiline
              placeholder="Ta bio"
              placeholderTextColor={COLORS.inputPlaceholder}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={onSave}
              disabled={saving}
              activeOpacity={INTERACTION.activeOpacity}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setPickedAvatarUri(null);
                setAvatarRemoved(false);
                setIsEditing(false);
              }}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.secondaryBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: COLORS.bg, padding: 16, paddingBottom: 28 },
  title: { ...TYPO.h2, marginBottom: 12 },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontWeight: "800",
    fontSize: 15,
    color: COLORS.text,
  },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  profileHeadRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  profileHeadText: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  pseudo: { fontSize: 20, fontWeight: "800", marginBottom: 4, flexShrink: 1 },
  avatarEditRow: { alignItems: "center", marginBottom: 10 },
  removePhotoBtn: { marginTop: 8, alignItems: "center", paddingVertical: 8 },
  removePhotoBtnText: { color: COLORS.danger, fontWeight: "700" },
  btnDisabled: { opacity: 0.65 },
  adminBadge: {
    marginLeft: 8,
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "800",
  },
  bio: { color: COLORS.textMuted, marginBottom: 10 },
  meta: { color: COLORS.textMuted, marginBottom: 12 },
  label: { fontWeight: "700", marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, marginBottom: 10 },
  textarea: { minHeight: 88, textAlignVertical: "top" },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: { marginTop: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: "center" },
  secondaryBtnText: { color: COLORS.text, fontWeight: "700" },
  adminBtn: { marginTop: 10, backgroundColor: "#1d4ed8", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  adminBtnText: { color: "#fff", fontWeight: "700" },
  bugBtn: { marginTop: 10, borderWidth: 1, borderColor: "#f59e0b", borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: "center", backgroundColor: "#fffbeb" },
  bugBtnText: { color: "#92400e", fontWeight: "700" },
  consoleBtn: { marginTop: 10, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: "center", backgroundColor: "#f8fafc" },
  consoleBtnText: { color: "#1f2937", fontWeight: "700" },
  reportBtn: { marginTop: 10, borderWidth: 1, borderColor: "#f59e0b", borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: "center" },
  reportBtnText: { color: "#92400e", fontWeight: "700" },
  logoutBtn: { marginTop: 10, borderWidth: 1, borderColor: COLORS.dangerBorder, borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: "center", backgroundColor: COLORS.dangerSoft },
  logoutBtnText: { color: COLORS.danger, fontWeight: "700" },
  deleteProfileBtn: { marginTop: 10, backgroundColor: COLORS.danger, borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: "center" },
  deleteProfileBtnText: { color: "#fff", fontWeight: "700" },
});
