import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/supaCore";
import { COLORS, RADIUS, SHADOW, TYPO, INTERACTION } from "../../src/theme";
import { UserAvatar } from "../../components/UserAvatar";

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const targetUserId = useMemo(
    () => String(Array.isArray(id) ? id[0] ?? "" : id ?? "").trim(),
    [id]
  );
  const [profile, setProfile] = useState(null);
  const [isAdminProfile, setIsAdminProfile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [recipes, setRecipes] = useState([]);
  const [meId, setMeId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [savingFollow, setSavingFollow] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let me =
        (await supabase.auth.getUser()).data.user ||
        (await supabase.auth.getSession()).data.session?.user ||
        null;
      const myId = me?.id ? String(me.id).trim() : null;
      setMeId(myId);

      let p = null;
      let pErr = null;
      {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id,username,bio,is_admin,avatar_url")
          .eq("user_id", targetUserId)
          .maybeSingle();
        p = data;
        pErr = error;
      }
      if (pErr) {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id,username,bio,avatar_url")
          .eq("user_id", targetUserId)
          .maybeSingle();
        p = data;
        pErr = error;
      }
      if (pErr) throw pErr;

      const profileUserId = String(p?.user_id ?? targetUserId).trim();

      const { data: r, error: rErr } = await supabase
        .from("recipes")
        .select("id,title,created_at")
        .eq("user_id", profileUserId)
        .order("created_at", { ascending: false });
      if (rErr) throw rErr;

      const { count: followersExact } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileUserId);

      const { count: followingExact } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileUserId);

      if (myId && myId !== profileUserId) {
        const { data: myFollow } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", myId)
          .eq("following_id", profileUserId)
          .maybeSingle();
        setIsFollowing(!!myFollow);
      } else {
        setIsFollowing(false);
      }

      setProfile(p);
      setRecipes(r || []);
      setIsAdminProfile(p?.is_admin === true);
      setFollowersCount(followersExact || 0);
      setFollowingCount(followingExact || 0);
    } catch (e) {
      Alert.alert("Erreur profil", e.message || "Impossible de charger ce profil.");
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleFollow = async () => {
    if (!meId) return Alert.alert("Info", "Connecte-toi pour suivre ce profil.");
    const otherId = String(profile?.user_id ?? targetUserId).trim();
    if (!otherId || meId === otherId) return;
    setSavingFollow(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", meId)
          .eq("following_id", otherId);
        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(prev - 1, 0));
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: meId,
          following_id: otherId,
        });
        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (e) {
      Alert.alert("Erreur follow", e.message || "Action impossible.");
    } finally {
      setSavingFollow(false);
    }
  };

  const otherUserId = String(profile?.user_id ?? targetUserId).trim();
  const isOwnProfile = !!meId && meId === otherUserId;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Profil</Text>

        {!targetUserId ? (
          <Text style={styles.meta}>Profil introuvable.</Text>
        ) : loading ? (
          <Text style={styles.meta}>Chargement...</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.profileTop}>
                <UserAvatar uri={profile?.avatar_url} size={80} />
                <View style={styles.profileTopText}>
                  <View style={styles.usernameRow}>
                    <Text style={styles.username}>
                      {profile?.username && profile.username.trim() && !profile.username.includes("@")
                        ? profile.username
                        : `user-${String(targetUserId).slice(0, 6)}`}
                    </Text>
                    {isAdminProfile ? <Text style={styles.adminBadge}>ADMIN</Text> : null}
                  </View>
                </View>
              </View>
              <Text style={styles.meta}>ID: {targetUserId}</Text>
              <Text style={styles.meta}>Abonnes: {followersCount}</Text>
              <Text style={styles.meta}>Personnes suivies: {followingCount}</Text>
              <Text style={styles.bio}>{profile?.bio || "Bio vide"}</Text>
              {isOwnProfile ? (
                <Text style={styles.selfHint}>{"C'est ton profil"}</Text>
              ) : !meId ? (
                <TouchableOpacity
                  style={styles.followBtn}
                  onPress={() => router.push("/auth/login")}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.followBtnText}>Se connecter pour suivre</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.unfollowBtn]}
                  onPress={toggleFollow}
                  disabled={savingFollow}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.followBtnText}>
                    {savingFollow ? "..." : isFollowing ? "Ne plus suivre" : "Suivre"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.section}>Recettes de cet utilisateur</Text>
            <FlatList
              data={recipes}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.meta}>Aucune recette.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recipeCard}
                  onPress={() => router.push(`/recipe/${item.id}`)}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.recipeTitle}>{item.title}</Text>
                  <Text style={styles.meta}>{new Date(item.created_at).toLocaleString("fr-FR")}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { ...TYPO.h2, color: COLORS.text, marginBottom: 10 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 10,
    ...SHADOW.card,
  },
  profileTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  profileTopText: { flex: 1, marginLeft: 12 },
  usernameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 6 },
  username: { fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 0, flexShrink: 1 },
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
  bio: { color: COLORS.textMuted, marginTop: 4 },
  section: { ...TYPO.section, color: COLORS.text, marginBottom: 8 },
  recipeCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  recipeTitle: { color: COLORS.text, fontWeight: "700", marginBottom: 4 },
  meta: { color: COLORS.textMuted },
  followBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
    alignItems: "center",
  },
  unfollowBtn: { backgroundColor: COLORS.danger },
  followBtnText: { color: "#fff", fontWeight: "700" },
  selfHint: { marginTop: 10, color: COLORS.textMuted, fontWeight: "600" },
});
