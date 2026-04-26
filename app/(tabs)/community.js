import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/supaCore";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../../src/theme";
import { isUserAdmin } from "../../src/authz";
import { UserAvatar } from "../../components/UserAvatar";
import { deleteProfileAvatarFile } from "../../src/profileAvatar";

export default function CommunityScreen() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [followsSet, setFollowsSet] = useState(new Set());
  const [followersByUser, setFollowersByUser] = useState({});
  const [search, setSearch] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminDeleteModalVisible, setAdminDeleteModalVisible] = useState(false);
  const [adminDeleteReason, setAdminDeleteReason] = useState("");
  const [profilePendingDelete, setProfilePendingDelete] = useState(null);

  const loadData = async () => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return;
    setMe(user);
    setAdminMode(isUserAdmin(user));

    const { data: allProfiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id,username,bio,avatar_url")
      .order("created_at", { ascending: false });

    if (pErr) {
      Alert.alert("Erreur profils", pErr.message);
      return;
    }

    // auto-create profil si absent
    const myProfileExists = (allProfiles || []).some((p) => p.user_id === user.id);
    if (!myProfileExists) {
      const fallbackUsername =
        user.user_metadata?.username?.trim() || `user-${user.id.slice(0, 6)}`;
      await supabase.from("profiles").upsert({
        user_id: user.id,
        username: fallbackUsername,
        bio: "",
      });
    }

    let profilesAfterUpsert = [];
    let p2Err = null;
    {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,username,bio,is_admin,avatar_url")
        .order("created_at", { ascending: false });
      profilesAfterUpsert = data || [];
      p2Err = error;
    }

    if (p2Err) {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,username,bio,avatar_url")
        .order("created_at", { ascending: false });
      profilesAfterUpsert = data || [];
      p2Err = error;
    }

    if (p2Err) {
      Alert.alert("Erreur profils", p2Err.message);
      return;
    }

    const visibleProfiles = (profilesAfterUpsert || []).filter((p) => p.user_id !== user.id);
    setProfiles(visibleProfiles);

    const profileIds = visibleProfiles.map((p) => p.user_id);
    if (profileIds.length > 0) {
      const { data: followersRows, error: followersErr } = await supabase
        .from("follows")
        .select("following_id")
        .in("following_id", profileIds);
      if (followersErr) {
        Alert.alert("Erreur abonnes", followersErr.message);
      } else {
        const nextCounts = {};
        for (const row of followersRows || []) {
          nextCounts[row.following_id] = (nextCounts[row.following_id] || 0) + 1;
        }
        setFollowersByUser(nextCounts);
      }
    } else {
      setFollowersByUser({});
    }

    const { data: follows, error: fErr } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (fErr) {
      Alert.alert("Erreur follows", fErr.message);
      return;
    }

    setFollowsSet(new Set((follows || []).map((f) => f.following_id)));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const u = (p.username || "").toLowerCase();
      const b = (p.bio || "").toLowerCase();
      return u.includes(q) || b.includes(q);
    });
  }, [profiles, search]);

  const getDisplayUsername = (rawUsername, userId) => {
    const base = String(rawUsername || "").trim();
    if (!base) return `user-${String(userId || "").slice(0, 6)}`;
    if (base.includes("@")) return `user-${String(userId || "").slice(0, 6)}`;
    return base;
  };

  const getDisplayBio = (rawBio) => {
    const base = String(rawBio || "").trim();
    if (!base) return "Bio non renseignee";
    return base;
  };

  const follow = async (targetUserId) => {
    if (!me) return;
    const { error } = await supabase.from("follows").insert({
      follower_id: me.id,
      following_id: targetUserId,
    });
    if (error) return Alert.alert("Erreur follow", error.message);

    setFollowsSet((prev) => new Set(prev).add(targetUserId));
    setFollowersByUser((prev) => ({
      ...prev,
      [targetUserId]: (prev[targetUserId] || 0) + 1,
    }));
  };

  const unfollow = async (targetUserId) => {
    if (!me) return;
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", me.id)
      .eq("following_id", targetUserId);

    if (error) return Alert.alert("Erreur unfollow", error.message);

    setFollowsSet((prev) => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
    setFollowersByUser((prev) => ({
      ...prev,
      [targetUserId]: Math.max((prev[targetUserId] || 1) - 1, 0),
    }));
  };

  const notifyUserAfterAdminProfileDelete = async (targetUserId, reason) => {
    if (!me?.id || !targetUserId) return;
    await supabase.from("reports").insert({
      reporter_id: me.id,
      target_type: "admin_reply",
      target_id: String(targetUserId),
      reason: "Suppression profil par admin",
      details: `Ton profil a ete supprime par un administrateur. Motif: ${reason}.`,
      status: "open",
    });
  };

  const deleteProfileAsAdmin = async (targetUserId, reason) => {
    try {
      await notifyUserAfterAdminProfileDelete(targetUserId, reason);

      const { data: targetProf } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (targetProf?.avatar_url) {
        try {
          await deleteProfileAvatarFile(targetProf.avatar_url);
        } catch (_) {
          /* ignore storage errors */
        }
      }

      const { data: targetRecipes } = await supabase
        .from("recipes")
        .select("id")
        .eq("user_id", targetUserId);
      const targetRecipeIds = (targetRecipes || []).map((r) => r.id);
      if (targetRecipeIds.length > 0) {
        await supabase.from("recipe_likes").delete().in("recipe_id", targetRecipeIds);
        await supabase.from("comments").delete().in("recipe_id", targetRecipeIds);
      }

      await supabase.from("recipe_likes").delete().eq("user_id", targetUserId);
      await supabase.from("comments").delete().eq("user_id", targetUserId);
      await supabase.from("follows").delete().eq("follower_id", targetUserId);
      await supabase.from("follows").delete().eq("following_id", targetUserId);
      await supabase.from("reports").delete().eq("reporter_id", targetUserId);
      await supabase.from("reports").delete().eq("target_type", "profile").eq("target_id", targetUserId);
      await supabase.from("recipes").delete().eq("user_id", targetUserId);
      await supabase.from("profiles").delete().eq("user_id", targetUserId);

      setProfiles((prev) => prev.filter((p) => p.user_id !== targetUserId));
      setFollowersByUser((prev) => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });
      setFollowsSet((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      Alert.alert("OK", "Profil supprime et utilisateur notifie.");
    } catch (e) {
      Alert.alert("Erreur suppression", e.message || "Suppression impossible.");
    }
  };

  const confirmAdminDeleteProfile = (targetUserId) => {
    const reasons = [
      "Comportement inapproprie",
      "Spam / faux profil",
      "Non respect des regles",
    ];
    Alert.alert("Supprimer profil (Admin)", "Choisis un motif:", [
      { text: "Annuler", style: "cancel" },
      ...reasons.map((reason) => ({
        text: reason,
        style: "destructive",
        onPress: async () => deleteProfileAsAdmin(targetUserId, reason),
      })),
      {
        text: "Autre motif...",
        onPress: () => {
          setProfilePendingDelete(targetUserId);
          setAdminDeleteReason("");
          setAdminDeleteModalVisible(true);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Modal
          visible={adminDeleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAdminDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Motif personnalise</Text>
              <TextInput
                style={[styles.input, styles.modalInput]}
                placeholder="Ecris la raison de suppression..."
                placeholderTextColor={COLORS.inputPlaceholder}
                value={adminDeleteReason}
                onChangeText={setAdminDeleteReason}
                multiline
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setAdminDeleteModalVisible(false)}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={async () => {
                    const reason = adminDeleteReason.trim();
                    if (!reason) return Alert.alert("Info", "Motif obligatoire.");
                    const pending = profilePendingDelete;
                    setAdminDeleteModalVisible(false);
                    setProfilePendingDelete(null);
                    await deleteProfileAsAdmin(pending, reason);
                  }}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.modalConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Text style={styles.title}>Communaute</Text>

      <TextInput
        style={styles.input}
        placeholder="Rechercher un utilisateur..."
        placeholderTextColor={COLORS.inputPlaceholder}
        value={search}
        onChangeText={setSearch}
      />

        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={<Text>Aucun profil trouve.</Text>}
          renderItem={({ item }) => {
            const isFollowing = followsSet.has(item.user_id);
            const isAdminProfile = item?.is_admin === true;
            return (
              <View style={styles.card}>
                <TouchableOpacity
                  onPress={() => router.push(`/user/${item.user_id}`)}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <View style={styles.cardPersonRow}>
                    <UserAvatar uri={item.avatar_url} size={52} />
                    <View style={styles.cardPersonBody}>
                      <View style={styles.usernameRow}>
                        <Text style={styles.username}>
                          {getDisplayUsername(item.username, item.user_id)}
                        </Text>
                        {isAdminProfile ? <Text style={styles.adminBadge}>ADMIN</Text> : null}
                      </View>
                      <Text style={styles.bio}>{getDisplayBio(item.bio)}</Text>
                      <Text style={styles.followersCount}>
                        Abonnes: {followersByUser[item.user_id] || 0}
                      </Text>
                      <Text style={styles.viewProfileHint}>Voir le profil</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.unfollowBtn]}
                  onPress={() =>
                    isFollowing ? unfollow(item.user_id) : follow(item.user_id)
                  }
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.followBtnText}>
                    {isFollowing ? "Ne plus suivre" : "Suivre"}
                  </Text>
                </TouchableOpacity>
                {adminMode && !isAdminProfile ? (
                  <TouchableOpacity
                    style={styles.adminDeleteBtn}
                    onPress={() => confirmAdminDeleteProfile(item.user_id)}
                    activeOpacity={INTERACTION.activeOpacity}
                  >
                    <Text style={styles.adminDeleteBtnText}>Supprimer profil (Admin)</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { ...TYPO.h2, color: COLORS.text, marginBottom: 10 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  cardPersonRow: { flexDirection: "row", alignItems: "flex-start" },
  cardPersonBody: { flex: 1, marginLeft: 12 },
  usernameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  username: { fontSize: 16, fontWeight: "800", color: COLORS.text },
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
  bio: { color: COLORS.textMuted, marginTop: 4, marginBottom: 10, lineHeight: 20 },
  followersCount: { color: COLORS.textMuted, marginBottom: 10, fontWeight: "600" },
  viewProfileHint: { color: COLORS.primary, fontWeight: "700", marginBottom: 10 },
  followBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: "center",
  },
  unfollowBtn: { backgroundColor: COLORS.danger },
  followBtnText: { color: "#fff", fontWeight: "700" },
  adminDeleteBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: "center",
  },
  adminDeleteBtnText: { color: COLORS.danger, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  modalTitle: { ...TYPO.section, marginBottom: 8 },
  modalInput: { minHeight: 90, textAlignVertical: "top", marginBottom: 10 },
  modalActions: { flexDirection: "row" },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    paddingVertical: 10,
    marginRight: 8,
  },
  modalCancelText: { color: COLORS.text, fontWeight: "700" },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalConfirmText: { color: "#fff", fontWeight: "700" },
});