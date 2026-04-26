import { supabase } from "./supaCore";
import { loadFavoris } from "./storage";

/**
 * Rassemble les données personnelles liées au compte (portabilité / accès RGPD).
 * Contenu informatif : à conserver côté utilisateur après partage.
 */
export async function buildGdprExportPackage(userId) {
  if (!userId) throw new Error("Utilisateur non identifie.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const favIds = await loadFavoris(userId);

  const [
    profileRes,
    recipesRes,
    commentsRes,
    likesRes,
    followsOutRes,
    followsInRes,
    reportsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("recipes").select("*").eq("user_id", userId),
    supabase.from("comments").select("*").eq("user_id", userId),
    supabase.from("recipe_likes").select("*").eq("user_id", userId),
    supabase.from("follows").select("*").eq("follower_id", userId),
    supabase.from("follows").select("*").eq("following_id", userId),
    supabase.from("reports").select("*").eq("reporter_id", userId),
  ]);

  let favorisRecettes = [];
  if (favIds.length > 0) {
    const { data } = await supabase.from("recipes").select("id,title,created_at").in("id", favIds);
    favorisRecettes = data || [];
  }

  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    notice:
      "Export genere depuis l'application. Conserve ce fichier en lieu sur. Les donnees peuvent evoluer apres export.",
    account: {
      user_id: userId,
      email: session?.user?.email ?? null,
      created_at: session?.user?.created_at ?? null,
    },
    profile: profileRes.data ?? null,
    profile_error: profileRes.error?.message ?? null,
    recipes: recipesRes.data ?? [],
    recipes_error: recipesRes.error?.message ?? null,
    comments: commentsRes.data ?? [],
    comments_error: commentsRes.error?.message ?? null,
    recipe_likes: likesRes.data ?? [],
    recipe_likes_error: likesRes.error?.message ?? null,
    follows_as_follower: followsOutRes.data ?? [],
    follows_as_follower_error: followsOutRes.error?.message ?? null,
    follows_as_followed: followsInRes.data ?? [],
    follows_as_followed_error: followsInRes.error?.message ?? null,
    reports_sent: reportsRes.data ?? [],
    reports_error: reportsRes.error?.message ?? null,
    favori_recipe_ids: favIds,
    favoris_recettes_apercu: favorisRecettes,
  };
}
