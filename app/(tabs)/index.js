import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_COUNTRY, INGREDIENTS, MONTHS } from "../../src/data";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../../src/theme";
import { supabase } from "../../src/supaCore";
import { isUserAdmin } from "../../src/authz";

function getSeasonName(monthIndex) {
  if ([2, 3, 4].includes(monthIndex)) return "Printemps";
  if ([5, 6, 7].includes(monthIndex)) return "Ete";
  if ([8, 9, 10].includes(monthIndex)) return "Automne";
  return "Hiver";
}

export default function HomeScreen() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [ingredientsData, setIngredientsData] = useState(INGREDIENTS);
  const [ingredientsPersisted, setIngredientsPersisted] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const items = useMemo(() => ingredientsData.filter((i) => i.saisons.includes(selectedMonth)), [selectedMonth, ingredientsData]);
  const fruits = useMemo(() => items.filter((i) => i.type === "Fruit"), [items]);
  const legumes = useMemo(() => items.filter((i) => i.type === "Legume"), [items]);
  const currentSeason = getSeasonName(selectedMonth);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAdminMode(isUserAdmin(user));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isAdmin = isUserAdmin(user);

      const { data, error } = await supabase
        .from("ingredients")
        .select("id,nom,type,saisons,calories,glucides,proteines,lipides,country_code")
        .eq("country_code", DEFAULT_COUNTRY)
        .order("nom", { ascending: true });

      if (error) {
        setIngredientsPersisted(false);
        return;
      }

      if (!data || data.length === 0) {
        if (!isAdmin) {
          setIngredientsPersisted(false);
          return;
        }

        const seedRows = INGREDIENTS.map((it) => ({
          id: it.id,
          country_code: DEFAULT_COUNTRY,
          nom: it.nom,
          type: it.type,
          saisons: it.saisons,
          calories: Number(it.nutrition?.calories ?? 0),
          glucides: Number(it.nutrition?.glucides ?? 0),
          proteines: Number(it.nutrition?.proteines ?? 0),
          lipides: Number(it.nutrition?.lipides ?? 0),
        }));

        const { error: seedErr } = await supabase
          .from("ingredients")
          .upsert(seedRows, { onConflict: "id,country_code" });
        if (seedErr) {
          Alert.alert("Erreur seed ingredients", seedErr.message);
          setIngredientsPersisted(false);
          return;
        }

        const { data: seededData, error: reloadErr } = await supabase
          .from("ingredients")
          .select("id,nom,type,saisons,calories,glucides,proteines,lipides,country_code")
          .eq("country_code", DEFAULT_COUNTRY)
          .order("nom", { ascending: true });
        if (reloadErr || !seededData) {
          setIngredientsPersisted(false);
          return;
        }

        const mappedSeeded = seededData.map((row) => ({
          id: row.id,
          nom: row.nom,
          type: row.type,
          saisons: Array.isArray(row.saisons) ? row.saisons : [],
          nutrition: {
            calories: Number(row.calories ?? 0),
            glucides: Number(row.glucides ?? 0),
            proteines: Number(row.proteines ?? 0),
            lipides: Number(row.lipides ?? 0),
          },
        }));
        setIngredientsData(mappedSeeded);
        setIngredientsPersisted(true);
        return;
      }

      const mapped = data.map((row) => ({
        id: row.id,
        nom: row.nom,
        type: row.type,
        saisons: Array.isArray(row.saisons) ? row.saisons : [],
        nutrition: {
          calories: Number(row.calories ?? 0),
          glucides: Number(row.glucides ?? 0),
          proteines: Number(row.proteines ?? 0),
          lipides: Number(row.lipides ?? 0),
        },
      }));
      setIngredientsData(mapped);
      setIngredientsPersisted(true);
    })();
  }, []);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDraft({
      nom: item.nom,
      calories: String(item.nutrition.calories ?? ""),
      glucides: String(item.nutrition.glucides ?? ""),
      proteines: String(item.nutrition.proteines ?? ""),
      lipides: String(item.nutrition.lipides ?? ""),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    const calories = Number.parseFloat(editDraft.calories);
    const glucides = Number.parseFloat(editDraft.glucides);
    const proteines = Number.parseFloat(editDraft.proteines);
    const lipides = Number.parseFloat(editDraft.lipides);
    if (!editDraft.nom.trim()) return Alert.alert("Info", "Nom obligatoire.");
    if ([calories, glucides, proteines, lipides].some((n) => !Number.isFinite(n))) {
      return Alert.alert("Info", "Toutes les valeurs nutritionnelles doivent etre numeriques.");
    }
    const nextName = editDraft.nom.trim();
    setIngredientsData((prev) =>
      prev.map((it) =>
        it.id === editingId
          ? {
              ...it,
              nom: nextName,
              nutrition: { calories, glucides, proteines, lipides },
            }
          : it
      )
    );

    if (ingredientsPersisted) {
      const { error } = await supabase
        .from("ingredients")
        .update({
          nom: nextName,
          calories,
          glucides,
          proteines,
          lipides,
        })
        .eq("id", editingId)
        .eq("country_code", DEFAULT_COUNTRY);

      if (error) {
        Alert.alert("Erreur sauvegarde", error.message);
        return;
      }
      Alert.alert("OK", "Infos ingredient mises a jour.");
    } else {
      Alert.alert(
        "Mode local",
        "Table 'ingredients' introuvable. Modif appliquee localement uniquement."
      );
    }
    cancelEdit();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.title}>Calendrier des saisons</Text>
            <Text style={styles.subtitle}>Explore les produits du mois pour mieux cuisiner local et de saison.</Text>
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonBadgeText}>
                {MONTHS[selectedMonth]} • {currentSeason}
              </Text>
            </View>
          </View>

          <FlatList
            horizontal
            data={MONTHS}
            keyExtractor={(m) => m}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthsRow}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => setSelectedMonth(index)}
                style={[styles.pill, selectedMonth === index && styles.pillActive]}
                activeOpacity={INTERACTION.activeOpacity}
              >
                <Text style={[styles.pillText, selectedMonth === index && styles.pillTextActive]}>{item}</Text>
              </TouchableOpacity>
            )}
          />

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{fruits.length}</Text>
              <Text style={styles.statLabel}>Fruits</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{legumes.length}</Text>
              <Text style={styles.statLabel}>Legumes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{items.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Fruits de {MONTHS[selectedMonth]}</Text>
          {fruits.length === 0 ? <Text style={styles.emptyText}>Aucun fruit pour ce mois.</Text> : null}
          {fruits.map((item) => (
            <View key={item.id} style={styles.card}>
              <Link href={`/ingredient/${item.id}`} asChild>
                <TouchableOpacity activeOpacity={INTERACTION.activeOpacity}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle}>{item.nom}</Text>
                    <Text style={styles.cardTypeFruit}>Fruit</Text>
                  </View>
                </TouchableOpacity>
              </Link>
              {adminMode ? (
                editingId === item.id ? (
                  <View style={styles.editBox}>
                    <TextInput style={styles.editInput} value={editDraft?.nom || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, nom: v }))} placeholder="Nom" placeholderTextColor={COLORS.inputPlaceholder} />
                    <View style={styles.editRow}>
                      <TextInput style={[styles.editInput, styles.editNum]} value={editDraft?.calories || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, calories: v }))} placeholder="kcal" placeholderTextColor={COLORS.inputPlaceholder} keyboardType="decimal-pad" />
                      <TextInput style={[styles.editInput, styles.editNum]} value={editDraft?.glucides || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, glucides: v }))} placeholder="G" placeholderTextColor={COLORS.inputPlaceholder} keyboardType="decimal-pad" />
                      <TextInput style={[styles.editInput, styles.editNum]} value={editDraft?.proteines || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, proteines: v }))} placeholder="P" placeholderTextColor={COLORS.inputPlaceholder} keyboardType="decimal-pad" />
                      <TextInput style={[styles.editInput, styles.editNum]} value={editDraft?.lipides || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, lipides: v }))} placeholder="L" placeholderTextColor={COLORS.inputPlaceholder} keyboardType="decimal-pad" />
                    </View>
                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.editActionBtn} onPress={saveEdit} activeOpacity={INTERACTION.activeOpacity}><Text style={styles.editActionText}>Valider</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.editCancelBtn} onPress={cancelEdit} activeOpacity={INTERACTION.activeOpacity}><Text style={styles.editCancelText}>Annuler</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.adminEditBtn} onPress={() => startEdit(item)} activeOpacity={INTERACTION.activeOpacity}>
                    <Text style={styles.adminEditText}>Modifier infos (Admin)</Text>
                  </TouchableOpacity>
                )
              ) : null}
            </View>
          ))}

          <Text style={styles.sectionTitle}>Legumes de {MONTHS[selectedMonth]}</Text>
          {legumes.length === 0 ? <Text style={styles.emptyText}>Aucun legume pour ce mois.</Text> : null}
          {legumes.map((item) => (
            <View key={item.id} style={styles.card}>
              <Link href={`/ingredient/${item.id}`} asChild>
                <TouchableOpacity activeOpacity={INTERACTION.activeOpacity}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle}>{item.nom}</Text>
                    <Text style={styles.cardTypeLegume}>Legume</Text>
                  </View>
                </TouchableOpacity>
              </Link>
              {adminMode ? (
                editingId === item.id ? (
                  <View style={styles.editBox}>
                    <TextInput style={styles.editInput} value={editDraft?.nom || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, nom: v }))} placeholder="Nom" placeholderTextColor={COLORS.inputPlaceholder} />
                    <View style={styles.editRow}>
                      <TextInput style={[styles.editInput, styles.editNum]} value={editDraft?.calories || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, calories: v }))} placeholder="kcal" placeholderTextColor={COLORS.inputPlaceholder} keyboardType="decimal-pad" />
                      <TextInput style={[styles.editInput, styles.editNum]} value={editDraft?.glucides || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, glucides: v }))} placeholder="G" placeholderTextColor={COLORS.inputPlaceholder} keyboardType="decimal-pad" />
                      <TextInput style={[styles.editInput, styles.editNum]} value={editDraft?.proteines || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, proteines: v }))} placeholder="P" placeholderTextColor={COLORS.inputPlaceholder} keyboardType="decimal-pad" />
                      <TextInput style={[styles.editInput, styles.editNum]} value={editDraft?.lipides || ""} onChangeText={(v) => setEditDraft((d) => ({ ...d, lipides: v }))} placeholder="L" placeholderTextColor={COLORS.inputPlaceholder} keyboardType="decimal-pad" />
                    </View>
                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.editActionBtn} onPress={saveEdit} activeOpacity={INTERACTION.activeOpacity}><Text style={styles.editActionText}>Valider</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.editCancelBtn} onPress={cancelEdit} activeOpacity={INTERACTION.activeOpacity}><Text style={styles.editCancelText}>Annuler</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.adminEditBtn} onPress={() => startEdit(item)} activeOpacity={INTERACTION.activeOpacity}>
                    <Text style={styles.adminEditText}>Modifier infos (Admin)</Text>
                  </TouchableOpacity>
                )
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 16, backgroundColor: COLORS.bg },
  hero: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginBottom: 10,
  },
  title: { ...TYPO.h1, color: COLORS.primary },
  subtitle: { marginTop: 4, color: COLORS.text },
  seasonBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seasonBadgeText: { color: "#fff", fontWeight: "700" },
  monthsRow: { paddingVertical: 4, paddingRight: 4 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 4,
    ...SHADOW.card,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  statLabel: { color: "#64748b", fontWeight: "600" },
  sectionTitle: { ...TYPO.section, marginTop: 8, marginBottom: 8, color: "#374151" },
  emptyText: { color: COLORS.textMuted, marginBottom: 10 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: "#e2e8f0", marginRight: 8 },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { color: "#334155", fontWeight: "700" },
  pillTextActive: { color: "#fff" },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontWeight: "800", color: COLORS.text },
  cardTypeFruit: {
    color: "#065f46",
    backgroundColor: "#d1fae5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  cardTypeLegume: {
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  adminEditBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: "center",
  },
  adminEditText: { color: COLORS.primary, fontWeight: "700" },
  editBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  editInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 8,
    marginBottom: 8,
  },
  editRow: { flexDirection: "row", gap: 6 },
  editNum: { flex: 1, marginBottom: 0 },
  editActions: { flexDirection: "row", marginTop: 8 },
  editActionBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    paddingVertical: 8,
    marginRight: 6,
  },
  editActionText: { color: "#fff", fontWeight: "700" },
  editCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    paddingVertical: 8,
  },
  editCancelText: { color: COLORS.text, fontWeight: "700" },
});