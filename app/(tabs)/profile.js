import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Image } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../../src/theme";
import { supabase } from "../../src/supaCore";
import { loadFavoris, saveFavoris } from "../../src/storage";
import { loadCountry } from "../../src/preferences";
import { COUNTRIES, DEFAULT_COUNTRY } from "../../src/data";
import { isUserAdmin } from "../../src/authz";
import { UserAvatar } from "../../components/UserAvatar";

export default function ProfileScreen() {
  const router = useRouter();
  const [countFav, setCountFav] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [totalLikesReceived, setTotalLikesReceived] = useState(0);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);
  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const fav = await loadFavoris(user?.id);
      const savedCountry = await loadCountry();

      setCountFav(fav.length);
      setCountryCode(savedCountry || DEFAULT_COUNTRY);

      if (!user?.id) return;

      const fallbackUsername =
        user.user_metadata?.username?.trim() ||
        `user-${user.id.slice(0, 6)}`;

      const { data: myProfile, error: profileErr } = await supabase
        .from("profiles")
        .select("username,bio,avatar_url")
        .eq("user_id", user.id)
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
        setAvatarUrl(myProfile?.avatar_url || null);

        if (!myProfile || rawUsername.includes("@")) {
          await supabase.from("profiles").upsert({
            user_id: user.id,
            username,
            bio: "",
            avatar_url: myProfile?.avatar_url ?? null,
          });
        }
      }

      setIsAdmin(isUserAdmin(user));

      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);
      setFollowersCount(count || 0);

      const { count: followingExact } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);
      setFollowingCount(followingExact || 0);

      const { data: myRecipes, error: recipesErr } = await supabase
        .from("recipes")
        .select("id,title,image_url,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (recipesErr) throw recipesErr;
      const recipeRows = myRecipes || [];
      setRecipes(recipeRows);

      if (recipeRows.length === 0) {
        setTotalLikesReceived(0);
      } else {
        const ids = recipeRows.map((r) => r.id);
        const { count: likesCount } = await supabase
          .from("recipe_likes")
          .select("*", { count: "exact", head: true })
          .in("recipe_id", ids);
        setTotalLikesReceived(likesCount || 0);
      }

      if (fav.length === 0) {
        setFavoriteRecipes([]);
      } else {
        const { data: favRecipes, error: favErr } = await supabase
          .from("recipes")
          .select("id,title,image_url,created_at")
          .in("id", fav);
        if (favErr) throw favErr;

        const orderMap = new Map(fav.map((id, idx) => [id, idx]));
        const sortedFavs = (favRecipes || []).sort(
          (a, b) => (orderMap.get(a.id) ?? 99999) - (orderMap.get(b.id) ?? 99999)
        );
        setFavoriteRecipes(sortedFavs);
      }
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFavorite = async (recipeId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentFavs = await loadFavoris(user?.id);
      const nextFavs = currentFavs.filter((id) => id !== recipeId);
      await saveFavoris(nextFavs, user?.id);
      setCountFav(nextFavs.length);
      setFavoriteRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible de retirer ce favori.");
    }
  };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const deleteRecipe = async (recipeId) => {
    Alert.alert(
      "Suppression",
      "Supprimer cette recette ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
              if (error) return Alert.alert("Erreur suppression", error.message);
              setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
              await loadAll();
            } catch (e) {
              Alert.alert("Erreur", e.message || "Suppression impossible.");
            }
          },
        },
      ]
    );
  };

  const countryLabel =
    COUNTRIES.find((c) => c.code === countryCode)?.label || countryCode;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={loadAll}
          ListHeaderComponent={
            <>
              <Text style={styles.title}>Profil</Text>

              <View style={styles.card}>
                <View style={styles.profileHeadRow}>
                  <UserAvatar uri={avatarUrl} size={72} />
                  <View style={styles.profileHeadText}>
                    <View style={styles.nameRow}>
                      <Text style={styles.pseudo}>{pseudo}</Text>
                      {isAdmin ? <Text style={styles.adminBadge}>ADMIN</Text> : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push("/settings")}
                      activeOpacity={INTERACTION.activeOpacity}
                    >
                      <Text style={styles.photoLink}>Changer ma photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.bio}>{bio}</Text>
                <Text style={styles.meta}>Pays: {countryLabel}</Text>
                <Text style={styles.meta}>Favoris: {countFav}</Text>
                <Text style={styles.meta}>Abonnes: {followersCount}</Text>
                <Text style={styles.meta}>Personnes suivies: {followingCount}</Text>
                <Text style={styles.meta}>J'aime recus (total): {totalLikesReceived}</Text>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recettes favorites</Text>
              </View>

              {favoriteRecipes.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.emptyTitle}>Aucun favori</Text>
                  <Text style={styles.emptyText}>Ajoute des recettes en favoris pour les retrouver ici.</Text>
                </View>
              ) : (
                <View style={styles.favoritesWrap}>
                  {favoriteRecipes.map((item) => (
                    <View key={item.id} style={styles.favRowCard}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.favRowImage} />
                      ) : (
                        <View style={styles.favRowImagePlaceholder}>
                          <Text style={styles.favRowPlaceholderText}>🍽️</Text>
                        </View>
                      )}
                      <View style={styles.favRowContent}>
                        <Text style={styles.favTitle} numberOfLines={1} ellipsizeMode="tail">
                          {item.title}
                        </Text>
                        <Text style={styles.favDate}>
                          {new Date(item.created_at).toLocaleDateString("fr-FR")}
                        </Text>
                        <View style={styles.favActions}>
                          <TouchableOpacity
                            style={styles.favActionBtn}
                            onPress={() => router.push(`/recipe/${item.id}`)}
                            activeOpacity={INTERACTION.activeOpacity}
                          >
                            <Text style={styles.favActionText}>Voir</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.favRemoveBtn}
                            onPress={() => removeFavorite(item.id)}
                            activeOpacity={INTERACTION.activeOpacity}
                          >
                            <Text style={styles.favRemoveText}>Retirer</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mes recettes</Text>
                <Link href="/add-recipe" asChild>
                  <TouchableOpacity style={styles.addBtn} activeOpacity={INTERACTION.activeOpacity}>
                    <Text style={styles.addBtnText}>+ Ajouter</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>Aucune recette</Text>
              <Text style={styles.emptyText}>Ajoute ta premiere recette pour la voir ici.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}
              <Text style={styles.recipeTitle}>{item.title}</Text>
              <Text style={styles.meta}>
                {new Date(item.created_at).toLocaleString("fr-FR")}
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.rowSecondaryBtn}
                  onPress={() => router.push(`/recipe/${item.id}`)}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.secondaryBtnText}>Voir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rowSecondaryBtn}
                  onPress={() => router.push(`/edit-recipe/${item.id}`)}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.secondaryBtnText}>Modifier</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteRecipe(item.id)}
                activeOpacity={INTERACTION.activeOpacity}
              >
                <Text style={styles.deleteBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { ...TYPO.h2, marginBottom: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
    marginBottom: 10,
  },
  profileHeadRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  profileHeadText: { flex: 1, marginLeft: 12 },
  photoLink: { color: COLORS.primary, fontWeight: "700", fontSize: 13, marginTop: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  pseudo: { fontSize: 20, fontWeight: "800", marginBottom: 0, flexShrink: 1 },
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
  meta: { color: COLORS.textMuted, marginBottom: 10 },
  secondaryBtnText: { color: COLORS.text, fontWeight: "700" },
  sectionHeader: { marginTop: 4, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { ...TYPO.section },
  favoritesWrap: { marginBottom: 6 },
  favRowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    ...SHADOW.card,
    flexDirection: "row",
    alignItems: "center",
  },
  favRowImage: { width: 74, height: 74, borderRadius: RADIUS.md, marginRight: 10 },
  favRowImagePlaceholder: {
    width: 74,
    height: 74,
    borderRadius: RADIUS.md,
    marginRight: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  favRowPlaceholderText: { fontSize: 22 },
  favRowContent: { flex: 1 },
  favTitle: { color: COLORS.text, fontWeight: "800", marginBottom: 4 },
  favDate: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  favActions: { flexDirection: "row" },
  favActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: "center",
    marginRight: 8,
  },
  favActionText: { color: COLORS.text, fontWeight: "700" },
  favRemoveBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: COLORS.dangerSoft,
  },
  favRemoveText: { color: COLORS.danger, fontWeight: "700" },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "800" },
  image: { width: "100%", height: 150, borderRadius: RADIUS.md, marginBottom: 8 },
  recipeTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 4 },
  actionsRow: { flexDirection: "row", gap: 8 },
  rowSecondaryBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: "center" },
  deleteBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  deleteBtnText: { color: COLORS.danger, fontWeight: "800" },
  emptyTitle: { color: COLORS.text, fontWeight: "800", marginBottom: 4 },
  emptyText: { color: COLORS.textMuted },
});