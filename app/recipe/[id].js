import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/supaCore";
import { INGREDIENTS } from "../../src/data";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW, INTERACTION } from "../../src/theme";
import { UserAvatar } from "../../components/UserAvatar";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [recipe, setRecipe] = useState(null);
  const [recipeAuthor, setRecipeAuthor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentAuthorsByUser, setCommentAuthorsByUser] = useState({});
  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [meId, setMeId] = useState(null);

  const preparationSteps = String(recipe?.instructions || "")
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[\.\)]\s*/, "").trim())
    .filter(Boolean);

  const ingredientNameFromId = (ingId) =>
    INGREDIENTS.find((i) => i.id === ingId)?.nom || ingId;

  const getDisplayUsername = (username, userId) => {
    const value = String(username || "").trim();
    if (!value || value.includes("@")) return `user-${String(userId || "").slice(0, 6)}`;
    return value;
  };

  const loadRecipe = async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select("id,title,ingredient_ids,ingredient_items,image_url,created_at,prep_time_minutes,cook_time_minutes,instructions,tips,user_id")
      .eq("id", id)
      .single();

    if (error) {
      Alert.alert("Erreur recette", error.message);
      return;
    }
    setRecipe(data);

    if (data?.user_id) {
      const { data: author } = await supabase
        .from("profiles")
        .select("user_id,username,avatar_url")
        .eq("user_id", data.user_id)
        .maybeSingle();
      setRecipeAuthor(author || null);
    } else {
      setRecipeAuthor(null);
    }
  };

  const loadLikeState = async () => {
    const { data: likesRows, error: likesErr } = await supabase
      .from("recipe_likes")
      .select("user_id")
      .eq("recipe_id", id);
    if (likesErr) {
      Alert.alert("Erreur likes", likesErr.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rows = likesRows || [];
    setLikeCount(rows.length);
    setLikedByMe(!!user && rows.some((row) => row.user_id === user.id));
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("id,content,user_id,created_at")
      .eq("recipe_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Erreur commentaires", error.message);
      return;
    }
    const rows = data || [];
    setComments(rows);

    const userIds = [...new Set(rows.map((c) => c.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: authorProfiles } = await supabase
        .from("profiles")
        .select("user_id,username,avatar_url")
        .in("user_id", userIds);
      const map = {};
      for (const p of authorProfiles || []) {
        map[p.user_id] = {
          username: p.username,
          avatar_url: p.avatar_url || null,
        };
      }
      setCommentAuthorsByUser(map);
    } else {
      setCommentAuthorsByUser({});
    }
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMeId(user?.id || null);
    })();

    loadRecipe();
    loadComments();
    loadLikeState();

    const recipeChannel = supabase
      .channel(`recipe-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recipes", filter: `id=eq.${id}` },
        () => {
          loadRecipe();
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel(`likes-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipe_likes",
          filter: `recipe_id=eq.${id}`,
        },
        () => {
          loadLikeState();
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`comments-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `recipe_id=eq.${id}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(recipeChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [id]);

  const addComment = async () => {
    const text = newComment.trim();
    if (!text) return;

    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) throw new Error(userErr?.message || "Utilisateur non connecte.");

      const { error } = await supabase.from("comments").insert({
        recipe_id: id,
        user_id: user.id,
        content: text,
      });

      if (error) throw error;
      setNewComment("");
    } catch (e) {
      Alert.alert("Erreur ajout commentaire", e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) return Alert.alert("Erreur suppression", error.message);
  };

  const toggleLike = async () => {
    if (!recipe) return;
    setLoadingLike(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error(userErr?.message || "Utilisateur non connecte.");

      if (likedByMe) {
        const { error } = await supabase
          .from("recipe_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("recipe_id", recipe.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recipe_likes").insert({
          user_id: user.id,
          recipe_id: recipe.id,
        });
        if (error) throw error;
      }
      await loadLikeState();
    } catch (e) {
      Alert.alert("Erreur like", e.message || "Erreur inconnue");
    } finally {
      setLoadingLike(false);
    }
  };

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
    <View style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {recipe.image_url ? <Image source={{ uri: recipe.image_url }} style={styles.image} /> : null}

            <Text style={styles.title}>{recipe.title}</Text>
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => {
                if (recipe?.user_id) router.push(`/user/${recipe.user_id}`);
              }}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <UserAvatar uri={recipeAuthor?.avatar_url} size={34} />
              <Text style={styles.authorText}>
                Publie par {getDisplayUsername(recipeAuthor?.username, recipe?.user_id)}
              </Text>
            </TouchableOpacity>

            <View style={styles.likesRow}>
              <Text style={styles.meta}>Likes: {likeCount}</Text>
              <TouchableOpacity onPress={toggleLike} disabled={loadingLike} activeOpacity={INTERACTION.activeOpacity}>
                <Text style={styles.likeBtn}>
                  {loadingLike ? "..." : likedByMe ? "Retirer like" : "Like"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tagsWrap}>
              {(recipe.ingredient_items || []).length > 0
                ? (recipe.ingredient_items || []).map((item, idx) => (
                    <View key={`${item.id || "x"}-${idx}`} style={styles.tag}>
                      <Text style={styles.tagText}>
                        {ingredientNameFromId(item.id)}
                        {item.quantity ? ` - ${item.quantity}` : ""}
                        {item.unit ? ` ${item.unit}` : ""}
                      </Text>
                    </View>
                  ))
                : (recipe.ingredient_ids || []).map((ingId) => (
                    <View key={ingId} style={styles.tag}>
                      <Text style={styles.tagText}>{ingredientNameFromId(ingId)}</Text>
                    </View>
                  ))}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoBadge}>
                Prep: {recipe.prep_time_minutes != null ? `${recipe.prep_time_minutes} min` : "N/A"}
              </Text>
              <Text style={styles.infoBadge}>
                Cuisson: {recipe.cook_time_minutes != null ? `${recipe.cook_time_minutes} min` : "N/A"}
              </Text>
            </View>

            <Text style={styles.section}>Preparation</Text>
            {preparationSteps.length > 0 ? (
              preparationSteps.map((step, idx) => (
                <View key={`prep-${idx}`} style={styles.stepRow}>
                  <Text style={styles.stepIndex}>{idx + 1}.</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.paragraph}>Aucune etape renseignee.</Text>
            )}

            {recipe.tips?.trim() ? (
              <>
                <Text style={styles.section}>Conseils</Text>
                <Text style={styles.paragraph}>{recipe.tips}</Text>
              </>
            ) : null}

            <Text style={styles.section}>Commentaires</Text>

            <TextInput
              style={styles.input}
              placeholder="Ecris un commentaire..."
              placeholderTextColor={COLORS.inputPlaceholder}
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={addComment}
              disabled={loading}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <Text style={styles.btnText}>
                {loading ? "Ajout..." : "Ajouter commentaire"}
              </Text>
            </TouchableOpacity>
          </>
        }
        ListEmptyComponent={<Text style={{ marginTop: 12 }}>Aucun commentaire.</Text>}
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <TouchableOpacity
              style={styles.commentAuthorRow}
              onPress={() => router.push(`/user/${item.user_id}`)}
              activeOpacity={INTERACTION.activeOpacity}
            >
              <UserAvatar uri={commentAuthorsByUser[item.user_id]?.avatar_url} size={30} />
              <Text style={styles.commentAuthorText}>
                {getDisplayUsername(commentAuthorsByUser[item.user_id]?.username, item.user_id)}
              </Text>
            </TouchableOpacity>
            <Text style={styles.commentText}>{item.content}</Text>
            <View style={styles.commentFooter}>
              <Text style={styles.commentDate}>
                {new Date(item.created_at).toLocaleString("fr-FR")}
              </Text>
              {meId === item.user_id ? (
                <TouchableOpacity onPress={() => deleteComment(item.id)} activeOpacity={INTERACTION.activeOpacity}>
                  <Text style={styles.deleteLink}>Supprimer</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  image: { width: "100%", height: 190, borderRadius: RADIUS.md, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  authorText: { color: COLORS.primary, fontWeight: "700", marginLeft: 8 },
  likesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  meta: { color: COLORS.textMuted },
  likeBtn: { color: COLORS.primary, fontWeight: "700" },
  infoRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  infoBadge: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  tag: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { color: "#065f46", fontWeight: "600", fontSize: 12 },
  section: { fontSize: 18, fontWeight: "800", marginBottom: 8, marginTop: 4 },
  paragraph: { color: COLORS.text, lineHeight: 22, marginBottom: 10 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  stepIndex: { width: 24, color: COLORS.text, fontWeight: "800" },
  stepText: { flex: 1, color: COLORS.text, lineHeight: 22 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: 11,
    alignItems: "center",
    marginBottom: 12,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  commentCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 8,
    ...SHADOW.card,
  },
  commentText: { color: COLORS.text, marginBottom: 6 },
  commentAuthorRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  commentAuthorText: { color: COLORS.primary, fontWeight: "700", marginLeft: 8 },
  commentFooter: { flexDirection: "row", justifyContent: "space-between" },
  commentDate: { color: COLORS.textMuted, fontSize: 12 },
  deleteLink: { color: COLORS.danger, fontWeight: "700" },
});