import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Modal,
} from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/supaCore";
import { INGREDIENTS } from "../../src/data";
import { loadFavoris, saveFavoris } from "../../src/storage";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../../src/theme";
import { isUserAdmin } from "../../src/authz";
import { UserAvatar } from "../../components/UserAvatar";

export default function RecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [favoris, setFavoris] = useState([]);
  const [search, setSearch] = useState("");
  const [activeIngredientId, setActiveIngredientId] = useState("all");
  const [likeCounts, setLikeCounts] = useState({});
  const [likedByMe, setLikedByMe] = useState(new Set());
  const [me, setMe] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminDeleteModalVisible, setAdminDeleteModalVisible] = useState(false);
  const [adminDeleteReason, setAdminDeleteReason] = useState("");
  const [recipePendingDelete, setRecipePendingDelete] = useState(null);
  const [authorsByUser, setAuthorsByUser] = useState({});

  const loadRecipes = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setMe(user);
    setAdminMode(isUserAdmin(user));

    const { data, error } = await supabase
      .from("recipes")
      .select("id,title,ingredient_ids,created_at,image_url,user_id")
      .order("created_at", { ascending: false });

    if (error) return Alert.alert("Erreur", error.message);

    const rows = data || [];
    setRecipes(rows);

    const authorIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    if (authorIds.length > 0) {
      const { data: authorProfiles } = await supabase
        .from("profiles")
        .select("user_id,username,avatar_url")
        .in("user_id", authorIds);
      const map = {};
      for (const p of authorProfiles || []) {
        map[p.user_id] = {
          username: p.username,
          avatar_url: p.avatar_url || null,
        };
      }
      setAuthorsByUser(map);
    } else {
      setAuthorsByUser({});
    }

    if (rows.length === 0) {
      setLikeCounts({});
      setLikedByMe(new Set());
      return;
    }

    const ids = rows.map((r) => r.id);
    const { data: likesRows, error: likesErr } = await supabase
      .from("recipe_likes")
      .select("recipe_id,user_id")
      .in("recipe_id", ids);

    if (likesErr) return Alert.alert("Erreur likes", likesErr.message);

    const counts = {};
    const mine = new Set();
    for (const l of likesRows || []) {
      counts[l.recipe_id] = (counts[l.recipe_id] || 0) + 1;
      if (l.user_id === user.id) mine.add(l.recipe_id);
    }
    setLikeCounts(counts);
    setLikedByMe(mine);
  };

  const refresh = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setFavoris(await loadFavoris(user?.id));
    await loadRecipes();
  };

  useEffect(() => {
    refresh();
  }, []);

  useFocusEffect(() => {
    refresh();
  });

  const filtered = useMemo(() => {
    return recipes
      .filter((r) => {
        const okSearch = r.title.toLowerCase().includes(search.toLowerCase());
        const okIng =
          activeIngredientId === "all" ||
          (r.ingredient_ids || []).includes(activeIngredientId);
        return okSearch && okIng;
      })
      .sort((a, b) => {
        const likesDiff = (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0);
        if (likesDiff !== 0) return likesDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [recipes, search, activeIngredientId, likeCounts]);

  const toggleFav = async (id) => {
    if (!me?.id) return;
    const next = favoris.includes(id)
      ? favoris.filter((x) => x !== id)
      : [...favoris, id];
    setFavoris(next);
    await saveFavoris(next, me.id);
  };

  const toggleLike = async (recipeId) => {
    if (!me) return;
    const hasLiked = likedByMe.has(recipeId);

    if (hasLiked) {
      const { error } = await supabase
        .from("recipe_likes")
        .delete()
        .eq("user_id", me.id)
        .eq("recipe_id", recipeId);
      if (error) return Alert.alert("Erreur unlike", error.message);

      setLikedByMe((prev) => {
        const n = new Set(prev);
        n.delete(recipeId);
        return n;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [recipeId]: Math.max((prev[recipeId] || 1) - 1, 0),
      }));
    } else {
      const { error } = await supabase.from("recipe_likes").insert({
        user_id: me.id,
        recipe_id: recipeId,
      });
      if (error) return Alert.alert("Erreur like", error.message);

      setLikedByMe((prev) => new Set(prev).add(recipeId));
      setLikeCounts((prev) => ({
        ...prev,
        [recipeId]: (prev[recipeId] || 0) + 1,
      }));
    }
  };

  const ingredientNameFromId = (id) =>
    INGREDIENTS.find((i) => i.id === id)?.nom || id;

  const getDisplayUsername = (username, userId) => {
    const value = String(username || "").trim();
    if (!value || value.includes("@")) return `user-${String(userId || "").slice(0, 6)}`;
    return value;
  };

  const extractStoragePathFromPublicUrl = (publicUrl) => {
    const marker = "/storage/v1/object/public/recipe-images/";
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.substring(idx + marker.length);
  };

  const deleteRecipe = async (recipe) => {
    Alert.alert("Confirmation", "Supprimer cette recette ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            if (recipe.image_url) {
              const filePath = extractStoragePathFromPublicUrl(recipe.image_url);
              if (filePath) await supabase.storage.from("recipe-images").remove([filePath]);
            }

            const { data: deletedRows, error } = await supabase
              .from("recipes")
              .delete()
              .eq("id", recipe.id)
              .select("id");
            if (error) return Alert.alert("Erreur suppression", error.message);
            if (!deletedRows || deletedRows.length === 0) {
              return Alert.alert(
                "Suppression refusee",
                "La base a refuse la suppression (policy RLS)."
              );
            }

            setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
            const nextFav = favoris.filter((f) => f !== recipe.id);
            setFavoris(nextFav);
            await saveFavoris(nextFav, me?.id);
          } catch (e) {
            Alert.alert("Erreur", e.message || "Suppression impossible.");
          }
        },
      },
    ]);
  };

  const notifyUserAfterAdminRecipeDelete = async (targetUserId, recipeTitle, reason) => {
    if (!me?.id || !targetUserId) return;
    await supabase.from("reports").insert({
      reporter_id: me.id,
      target_type: "admin_reply",
      target_id: String(targetUserId),
      reason: "Suppression recette par admin",
      details: `Ta recette "${recipeTitle || "Recette"}" a ete supprimee par un administrateur. Motif: ${reason}.`,
      status: "open",
    });
  };

  const performAdminDeleteRecipe = async (recipe, reason) => {
    try {
      if (recipe.image_url) {
        const filePath = extractStoragePathFromPublicUrl(recipe.image_url);
        if (filePath) await supabase.storage.from("recipe-images").remove([filePath]);
      }
      const { data: deletedRows, error } = await supabase
        .from("recipes")
        .delete()
        .eq("id", recipe.id)
        .select("id");
      if (error) return Alert.alert("Erreur suppression", error.message);
      if (!deletedRows || deletedRows.length === 0) {
        return Alert.alert(
          "Suppression refusee",
          "La base a refuse la suppression admin (policy RLS)."
        );
      }

      await notifyUserAfterAdminRecipeDelete(recipe.user_id, recipe.title, reason);
      setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
      Alert.alert("OK", "Recette supprimee et utilisateur notifie.");
    } catch (e) {
      Alert.alert("Erreur", e.message || "Suppression impossible.");
    }
  };

  const confirmAdminDeleteRecipe = (recipe) => {
    const reasons = [
      "Contenu inapproprie",
      "Informations trompeuses",
      "Non respect des regles",
    ];

    Alert.alert("Supprimer recette (Admin)", "Choisis un motif:", [
      { text: "Annuler", style: "cancel" },
      ...reasons.map((reason) => ({
        text: reason,
        style: "destructive",
        onPress: async () => performAdminDeleteRecipe(recipe, reason),
      })),
      {
        text: "Autre motif...",
        onPress: () => {
          setRecipePendingDelete(recipe);
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
                    const pending = recipePendingDelete;
                    setAdminDeleteModalVisible(false);
                    setRecipePendingDelete(null);
                    await performAdminDeleteRecipe(pending, reason);
                  }}
                  activeOpacity={INTERACTION.activeOpacity}
                >
                  <Text style={styles.modalConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.hero}>
          <Text style={styles.title}>Recettes</Text>
          <Text style={styles.subtitle}>
            Retrouve, filtre et decouvre les recettes de la communaute.
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Rechercher une recette..."
          placeholderTextColor={COLORS.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
          <TouchableOpacity
            onPress={() => setActiveIngredientId("all")}
            style={[styles.pill, activeIngredientId === "all" && styles.pillActive]}
            activeOpacity={INTERACTION.activeOpacity}
          >
            <Text
              style={[styles.pillText, activeIngredientId === "all" && styles.pillTextActive]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Tous
            </Text>
          </TouchableOpacity>

          {INGREDIENTS.map((i) => {
            const active = activeIngredientId === i.id;
            return (
              <TouchableOpacity
                key={i.id}
                onPress={() => setActiveIngredientId(i.id)}
                style={[styles.pill, active && styles.pillActive]}
                activeOpacity={INTERACTION.activeOpacity}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {i.nom}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Link href="/add-recipe" asChild>
          <TouchableOpacity style={styles.addBtn} activeOpacity={INTERACTION.activeOpacity}>
            <Text style={styles.addBtnText}>+ Ajouter une recette</Text>
          </TouchableOpacity>
        </Link>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Aucune recette trouvee</Text>
                <Text style={styles.emptyText}>
                  {activeIngredientId === "all"
                    ? "Ajoute une recette pour commencer."
                    : "Aucune recette ne contient cet ingredient pour le moment."}
                </Text>
                {activeIngredientId !== "all" ? (
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => setActiveIngredientId("all")}
                    activeOpacity={INTERACTION.activeOpacity}
                  >
                    <Text style={styles.emptyActionText}>Revenir a Tous</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isFav = favoris.includes(item.id);
            const isLiked = likedByMe.has(item.id);
            const isOwner = me?.id === item.user_id;
            const canModerate = isOwner || adminMode;
            const ingredients = (item.ingredient_ids || []).map(ingredientNameFromId);
            const visibleIngredients = ingredients.slice(0, 3);
            const remainingIngredients = Math.max(ingredients.length - visibleIngredients.length, 0);

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  activeOpacity={INTERACTION.activeOpacity}
                  onPress={() => router.push(`/recipe/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Recette ${item.title || ""}, ouvrir le detail`}
                >
                  {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}

                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.likesBadge}>
                      <Text style={styles.likesBadgeText}>❤️ {likeCounts[item.id] || 0}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.authorRow}
                    onPress={() => router.push(`/user/${item.user_id}`)}
                    activeOpacity={INTERACTION.activeOpacity}
                  >
                    <UserAvatar uri={authorsByUser[item.user_id]?.avatar_url} size={28} />
                    <Text style={styles.authorText}>
                      Publie par {getDisplayUsername(authorsByUser[item.user_id]?.username, item.user_id)}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.tagsWrap}>
                    {visibleIngredients.map((name) => (
                      <View key={`${item.id}-${name}`} style={styles.tag}>
                        <Text style={styles.tagText}>{name}</Text>
                      </View>
                    ))}
                    {remainingIngredients > 0 ? (
                      <View style={styles.tagMore}>
                        <Text style={styles.tagMoreText}>+{remainingIngredients}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.ingredientsSummary}>
                    {ingredients.length > 0 ? ingredients.join(" • ") : "Aucun ingredient ajoute"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.rowActionsTop}>
                  <TouchableOpacity
                    onPress={() => toggleFav(item.id)}
                    style={[styles.smallActionBtn, isFav && styles.smallActionBtnActive]}
                    activeOpacity={INTERACTION.activeOpacity}
                  >
                    <Text style={[styles.smallActionText, isFav && styles.smallActionTextActive]}>
                      {isFav ? "Favori ajoute" : "Ajouter favori"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => toggleLike(item.id)}
                    style={[styles.smallActionBtn, styles.smallActionBtnLast, isLiked && styles.smallActionBtnActive]}
                    activeOpacity={INTERACTION.activeOpacity}
                  >
                    <Text style={[styles.smallActionText, isLiked && styles.smallActionTextActive]}>
                      {isLiked ? "Like retire" : "Ajouter like"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isOwner ? (
                  <View style={styles.rowActionsBottom}>
                    <TouchableOpacity
                      style={styles.singleActionBtn}
                      onPress={() => router.push(`/edit-recipe/${item.id}`)}
                      activeOpacity={INTERACTION.activeOpacity}
                    >
                      <Text style={styles.secondaryActionText}>Modifier</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {canModerate ? (
                  <TouchableOpacity
                    style={styles.deleteActionBtn}
                    onPress={() =>
                      adminMode && !isOwner ? confirmAdminDeleteRecipe(item) : deleteRecipe(item)
                    }
                    activeOpacity={INTERACTION.activeOpacity}
                  >
                    <Text style={styles.deleteActionText}>
                      {isOwner ? "Supprimer" : "Supprimer (Admin)"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
          contentContainerStyle={filtered.length === 0 ? styles.listContentEmpty : styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 6 },
  hero: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginBottom: 10,
  },
  title: { ...TYPO.h2, color: COLORS.primary },
  subtitle: { marginTop: 4, color: COLORS.text },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 10,
  },
  pill: {
    width: 108,
    height: 38,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: "#e2e8f0",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { color: "#334155", fontWeight: "700", width: 84, textAlign: "center" },
  pillTextActive: { color: "white" },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 12, marginBottom: 10, alignItems: "center" },
  addBtnText: { color: "white", fontWeight: "700" },
  listContent: { paddingBottom: 110 },
  listContentEmpty: { flexGrow: 1, paddingBottom: 110 },
  emptyWrap: { flex: 1, justifyContent: "center" },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
    ...SHADOW.card,
  },
  emptyTitle: { color: COLORS.text, fontWeight: "800", marginBottom: 4 },
  emptyText: { color: COLORS.textMuted },
  emptyActionBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  emptyActionText: { color: COLORS.primary, fontWeight: "700" },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  image: { width: "100%", height: 160, borderRadius: 10, marginBottom: 8 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontWeight: "800", color: COLORS.text, flex: 1, marginRight: 10 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  authorText: { color: COLORS.primary, fontWeight: "600", marginLeft: 8 },
  likesBadge: {
    backgroundColor: "#fee2e2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  likesBadgeText: { color: "#991b1b", fontWeight: "700", fontSize: 12 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  tag: { backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  tagText: { color: "#065f46", fontWeight: "600", fontSize: 12 },
  tagMore: { backgroundColor: "#e2e8f0", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  tagMoreText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  ingredientsSummary: { color: "#64748b", marginBottom: 10, fontSize: 12 },
  rowActionsTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  smallActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    marginRight: 6,
  },
  smallActionBtnLast: { marginRight: 0 },
  smallActionBtnActive: { backgroundColor: "#ecfdf5", borderColor: "#34d399" },
  smallActionText: { color: "#374151", fontWeight: "700", fontSize: 12 },
  smallActionTextActive: { color: "#065f46" },
  rowActionsBottom: { flexDirection: "row", justifyContent: "space-between" },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 6,
  },
  singleActionBtn: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryActionBtnLast: { marginRight: 0 },
  secondaryActionText: { color: "#1f2937", fontWeight: "700", fontSize: 12 },
  deleteActionBtn: {
    marginTop: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  deleteActionText: { color: "#b91c1c", fontWeight: "700", fontSize: 12 },
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