import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Link } from "expo-router";
import { INGREDIENTS, MONTHS } from "../../src/data";
import { supabase } from "../../src/supaCore";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../../src/theme";

export default function IngredientDetailScreen() {
  const { id } = useLocalSearchParams();
  const ingredient = INGREDIENTS.find((i) => i.id === id);
  const [recipes, setRecipes] = useState([]);
  const seasonMonthsLabel = useMemo(() => {
    if (!ingredient) return "";
    return ingredient.saisons.map((monthIndex) => MONTHS[monthIndex]).join(" • ");
  }, [ingredient]);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("recipes")
        .select("id,title")
        .eq("user_id", auth.user.id)
        .contains("ingredient_ids", [id]);
      setRecipes(data || []);
    };
    load();
  }, [id]);

  if (!ingredient) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.container}>
          <Text>Ingredient introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>{ingredient.nom}</Text>
          <Text style={styles.typeBadge}>{ingredient.type}</Text>
          <Text style={styles.subtitle}>Disponible en saison:</Text>
          <Text style={styles.seasonText}>{seasonMonthsLabel}</Text>
        </View>

        <Text style={styles.section}>Recettes associees</Text>
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>Aucune recette associee pour le moment.</Text>}
          renderItem={({ item }) => (
            <Link href={`/recipe/${item.id}`} asChild>
              <TouchableOpacity style={styles.card} activeOpacity={INTERACTION.activeOpacity}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>Voir le detail de la recette</Text>
              </TouchableOpacity>
            </Link>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 16, backgroundColor: COLORS.bg },
  hero: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
  },
  title: { ...TYPO.h1, color: COLORS.primary },
  typeBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: COLORS.primary,
    color: "#fff",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: { color: COLORS.textMuted, fontWeight: "700" },
  seasonText: { color: COLORS.text, marginTop: 4 },
  section: { fontSize: 16, fontWeight: "800", marginBottom: 8, color: "#334155" },
  empty: { color: COLORS.textMuted },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  cardTitle: { fontWeight: "700", color: COLORS.text },
  cardMeta: { color: COLORS.textMuted, marginTop: 2 },
});