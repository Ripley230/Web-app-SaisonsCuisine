import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../src/supaCore";
import { deleteProfileAvatarFile } from "../src/profileAvatar";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../src/theme";
import { isUserAdmin } from "../src/authz";

const FILTERS = [
  { id: "all", label: "Tous" },
  { id: "bug", label: "Bugs" },
  { id: "report", label: "Signalements" },
];

const STATUS_OPTIONS = ["open", "reviewing", "resolved", "rejected"];

export default function ReportsConsoleScreen() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [reports, setReports] = useState([]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error(userErr?.message || "Utilisateur non connecte.");
      setMe(user);

      const admin = isUserAdmin(user);
      setIsAdmin(admin);

      let query = supabase
        .from("reports")
        .select("id,reporter_id,target_type,target_id,reason,details,status,created_at")
        .order("created_at", { ascending: false });

      if (!admin) {
        query = query.or(
          `reporter_id.eq.${user.id},and(target_type.eq.warning,target_id.eq.${user.id}),and(target_type.eq.admin_reply,target_id.eq.${user.id})`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (e) {
      Alert.alert("Erreur console", e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    if (activeFilter === "all") return reports;
    if (activeFilter === "bug") return reports.filter((r) => r.target_type === "bug");
    return reports.filter((r) => r.target_type !== "bug");
  }, [reports, activeFilter]);

  const setStatus = async (reportId, status) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
    if (error) return Alert.alert("Erreur statut", error.message);
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
  };

  const sendAdminReplyToReporter = async (report, decisionLabel) => {
    if (!me?.id) throw new Error("Admin non identifie.");
    const { error } = await supabase.from("reports").insert({
      reporter_id: me.id,
      target_type: "admin_reply",
      target_id: String(report.reporter_id),
      reason: `Decision admin: ${decisionLabel}`,
      details: `Ton signalement "${report.reason}" a ete traite. Decision: ${decisionLabel}.`,
      status: "open",
    });
    if (error) throw error;
  };

  const deleteRequest = async (reportId) => {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) throw error;
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const deleteProfileByUserId = async (userId) => {
    const { data: targetProf } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (targetProf?.avatar_url) {
      try {
        await deleteProfileAvatarFile(targetProf.avatar_url);
      } catch (_) {
        /* ignore */
      }
    }

    const { data: userRecipes } = await supabase
      .from("recipes")
      .select("id")
      .eq("user_id", userId);
    const recipeIds = (userRecipes || []).map((r) => r.id);

    if (recipeIds.length > 0) {
      await supabase.from("recipe_likes").delete().in("recipe_id", recipeIds);
      await supabase.from("comments").delete().in("recipe_id", recipeIds);
    }

    await supabase.from("recipe_likes").delete().eq("user_id", userId);
    await supabase.from("comments").delete().eq("user_id", userId);
    await supabase.from("follows").delete().eq("follower_id", userId);
    await supabase.from("follows").delete().eq("following_id", userId);
    await supabase.from("reports").delete().eq("reporter_id", userId);
    await supabase.from("reports").delete().eq("target_type", "profile").eq("target_id", userId);
    await supabase.from("recipes").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
  };

  const deleteRecipeById = async (recipeId) => {
    await supabase.from("recipe_likes").delete().eq("recipe_id", recipeId);
    await supabase.from("comments").delete().eq("recipe_id", recipeId);
    await supabase.from("recipes").delete().eq("id", recipeId);
  };

  const deleteCommentById = async (commentId) => {
    await supabase.from("comments").delete().eq("id", commentId);
  };

  const sendWarningToUser = async (targetUserId, reason) => {
    if (!me?.id) throw new Error("Admin non identifie.");
    const { error } = await supabase.from("reports").insert({
      reporter_id: me.id,
      target_type: "warning",
      target_id: String(targetUserId),
      reason: `Avertissement moderation: ${reason || "Comportement non conforme"}`,
      details: "Un administrateur t'a envoye un avertissement. Merci de respecter les regles de la communaute.",
      status: "open",
    });
    if (error) throw error;
  };

  const moderateAction = (item, actionType) => {
    if (!isAdmin) return;
    const targetType = String(item.target_type || "");
    const targetId = String(item.target_id || "");

    if (actionType === "warn-user") {
      let userId = null;
      if (targetType === "profile") userId = targetId;
      if (targetType === "bug" || targetType === "recipe" || targetType === "comment") userId = item.reporter_id;
      if (!userId) return Alert.alert("Info", "Impossible de determiner l'utilisateur cible.");

      return Alert.alert("Envoyer un avertissement", "Confirmer l'envoi d'un avertissement a cet utilisateur ?", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Envoyer",
          onPress: async () => {
            try {
              await sendWarningToUser(userId, item.reason);
              Alert.alert("OK", "Avertissement envoye.");
            } catch (e) {
              Alert.alert("Erreur moderation", e.message || "Action impossible.");
            }
          },
        },
      ]);
    }

    if (actionType === "delete-profile") {
      if (targetType !== "profile") return Alert.alert("Info", "Cette action est disponible pour un signalement de profil.");
      return Alert.alert("Supprimer le profil", "Supprimer ce profil et ses donnees associees ?", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProfileByUserId(targetId);
              await setStatus(item.id, "resolved");
              Alert.alert("OK", "Profil supprime.");
              await loadReports();
            } catch (e) {
              Alert.alert("Erreur moderation", e.message || "Action impossible.");
            }
          },
        },
      ]);
    }

    if (actionType === "delete-recipe") {
      if (targetType !== "recipe") return Alert.alert("Info", "Cette action est disponible pour un signalement de recette.");
      return Alert.alert("Supprimer la recette", "Supprimer cette recette et ses interactions associees ?", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRecipeById(targetId);
              await setStatus(item.id, "resolved");
              Alert.alert("OK", "Recette supprimee.");
              await loadReports();
            } catch (e) {
              Alert.alert("Erreur moderation", e.message || "Action impossible.");
            }
          },
        },
      ]);
    }

    if (actionType === "delete-comment") {
      if (targetType !== "comment") return Alert.alert("Info", "Cette action est disponible pour un signalement de commentaire.");
      return Alert.alert("Supprimer le commentaire", "Supprimer ce commentaire ?", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCommentById(targetId);
              await setStatus(item.id, "resolved");
              Alert.alert("OK", "Commentaire supprime.");
              await loadReports();
            } catch (e) {
              Alert.alert("Erreur moderation", e.message || "Action impossible.");
            }
          },
        },
      ]);
    }
  };

  const openTarget = async (item) => {
    const targetType = String(item.target_type || "");
    const targetId = String(item.target_id || "");

    if (targetType === "profile") {
      return router.push(`/user/${targetId}`);
    }

    if (targetType === "recipe") {
      return router.push(`/recipe/${targetId}`);
    }

    if (targetType === "comment") {
      const { data, error } = await supabase
        .from("comments")
        .select("recipe_id")
        .eq("id", targetId)
        .maybeSingle();
      if (error || !data?.recipe_id) {
        return Alert.alert("Info", "Commentaire introuvable.");
      }
      return router.push(`/recipe/${data.recipe_id}`);
    }

    if (targetType === "bug") {
      return Alert.alert("Info", "Bug general application (pas de cible unique).");
    }

    if (targetType === "warning") {
      return router.push(`/user/${targetId}`);
    }

    return Alert.alert("Info", `Type de cible non gere: ${targetType}`);
  };

  const openReporter = (item) => {
    if (!item?.reporter_id) return Alert.alert("Info", "Reporter introuvable.");
    router.push(`/user/${item.reporter_id}`);
  };

  const finalizeAndNotify = (item, decision) => {
    if (!isAdmin) return;
    const decisionLabel = decision === "resolved" ? "Signalement valide" : "Signalement rejete";

    Alert.alert(
      "Cloturer la requete",
      `Cette action va notifier l'utilisateur puis supprimer la requete. Decision: ${decisionLabel}.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              await sendAdminReplyToReporter(item, decisionLabel);
              await deleteRequest(item.id);
              Alert.alert("OK", "Requete traitee, notifiee et supprimee.");
            } catch (e) {
              Alert.alert("Erreur moderation", e.message || "Action impossible.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Console signalements</Text>
        <Text style={styles.subtitle}>
          {isAdmin
            ? "Vue admin: gere les bugs et signalements de toute l'app."
            : "Vue utilisateur: suis l'etat de tes remontées."}
        </Text>

        <View style={styles.filtersRow}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterBtn, active && styles.filterBtnActive]}
                onPress={() => setActiveFilter(f.id)}
                activeOpacity={INTERACTION.activeOpacity}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={loadReports}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucune entrée</Text>
              <Text style={styles.emptyText}>Aucun bug/signalement pour ce filtre.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isBug = item.target_type === "bug";
            const isWarning = item.target_type === "warning";
            const isAdminReply = item.target_type === "admin_reply";
            return (
              <View style={styles.card}>
                <View style={styles.headRow}>
                  <Text style={styles.cardTitle}>
                    {isAdminReply ? "Reponse admin" : isWarning ? "Avertissement" : isBug ? "Bug" : "Signalement"}
                  </Text>
                  <Text style={[styles.statusBadge, styles[`status_${item.status}`] || styles.status_open]}>
                    {item.status || "open"}
                  </Text>
                </View>

                <Text style={styles.meta}>Motif: {item.reason}</Text>
                {!!item.details && <Text style={styles.details}>{item.details}</Text>}
                <Text style={styles.meta}>
                  Cible: {item.target_type} / {item.target_id}
                </Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleString("fr-FR")}</Text>

                {isAdmin ? (
                  <View style={styles.actionsBlock}>
                    <View style={styles.moderationRow}>
                      <TouchableOpacity
                        onPress={() => openTarget(item)}
                        style={[styles.openTargetBtn, styles.openTargetBtnHalf]}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={styles.openTargetBtnText}>Voir la cible</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openReporter(item)}
                        style={[styles.openTargetBtn, styles.openTargetBtnHalf, styles.openTargetBtnLast]}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={styles.openTargetBtnText}>Voir reporter</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.moderationRow}>
                      <TouchableOpacity
                        onPress={() => moderateAction(item, "warn-user")}
                        style={styles.moderationBtn}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={styles.moderationBtnText}>Avertir user</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moderateAction(item, "delete-profile")}
                        style={styles.moderationBtnDanger}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={styles.moderationBtnDangerText}>Supprimer profil</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.moderationRow}>
                      <TouchableOpacity
                        onPress={() => finalizeAndNotify(item, "resolved")}
                        style={styles.moderationBtn}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={styles.moderationBtnText}>Valider + notifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => finalizeAndNotify(item, "rejected")}
                        style={styles.moderationBtnDanger}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={styles.moderationBtnDangerText}>Rejeter + notifier</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.moderationRow}>
                      <TouchableOpacity
                        onPress={() => moderateAction(item, "delete-recipe")}
                        style={styles.moderationBtnDanger}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={styles.moderationBtnDangerText}>Supprimer recette</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moderateAction(item, "delete-comment")}
                        style={styles.moderationBtnDanger}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={styles.moderationBtnDangerText}>Supprimer commentaire</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Supprimer la requete",
                          "Retirer cette requete de la console ?",
                          [
                            { text: "Annuler", style: "cancel" },
                            {
                              text: "Supprimer",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  await deleteRequest(item.id);
                                } catch (e) {
                                  Alert.alert("Erreur", e.message || "Suppression impossible.");
                                }
                              },
                            },
                          ]
                        )
                      }
                      style={styles.deleteRequestBtn}
                      activeOpacity={INTERACTION.activeOpacity}
                    >
                      <Text style={styles.deleteRequestBtnText}>Supprimer la requete</Text>
                    </TouchableOpacity>

                    {STATUS_OPTIONS.map((s) => (
                      <TouchableOpacity
                        key={`${item.id}-${s}`}
                        onPress={() => setStatus(item.id, s)}
                        style={[styles.statusBtn, item.status === s && styles.statusBtnActive]}
                        activeOpacity={INTERACTION.activeOpacity}
                      >
                        <Text style={[styles.statusBtnText, item.status === s && styles.statusBtnTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { ...TYPO.h2, color: COLORS.text },
  subtitle: { color: COLORS.textMuted, marginTop: 4, marginBottom: 10 },
  filtersRow: { flexDirection: "row", marginBottom: 10 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: "#e2e8f0",
    marginRight: 8,
  },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { color: "#334155", fontWeight: "700" },
  filterTextActive: { color: "#fff" },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    ...SHADOW.card,
  },
  emptyTitle: { color: COLORS.text, fontWeight: "800", marginBottom: 4 },
  emptyText: { color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { color: COLORS.text, fontWeight: "800" },
  statusBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden", fontSize: 11, fontWeight: "700" },
  status_open: { backgroundColor: "#e2e8f0", color: "#334155" },
  status_reviewing: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  status_resolved: { backgroundColor: "#dcfce7", color: "#166534" },
  status_rejected: { backgroundColor: "#fef2f2", color: "#b91c1c" },
  meta: { color: COLORS.textMuted, marginBottom: 2 },
  details: { color: COLORS.text, marginBottom: 4 },
  date: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  actionsBlock: { marginTop: 8 },
  openTargetBtn: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
    alignItems: "center",
  },
  openTargetBtnHalf: { flex: 1, marginRight: 6, marginBottom: 0 },
  openTargetBtnLast: { marginRight: 0 },
  openTargetBtnText: { color: "#1f2937", fontWeight: "700" },
  moderationRow: { flexDirection: "row", marginBottom: 6 },
  moderationBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: "center",
    marginRight: 6,
  },
  moderationBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },
  moderationBtnDanger: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: "center",
  },
  moderationBtnDangerText: { color: COLORS.danger, fontWeight: "700", fontSize: 12 },
  deleteRequestBtn: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
    alignItems: "center",
  },
  deleteRequestBtnText: { color: COLORS.danger, fontWeight: "700", fontSize: 12 },
  statusBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: COLORS.surface,
  },
  statusBtnActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primaryBorder },
  statusBtnText: { color: COLORS.textMuted, fontWeight: "700", fontSize: 12 },
  statusBtnTextActive: { color: COLORS.primary },
});
