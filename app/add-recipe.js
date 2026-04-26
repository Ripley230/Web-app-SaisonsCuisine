import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { useRouter } from "expo-router";
import { supabase } from "../src/supaCore";
import { INGREDIENTS } from "../src/data";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../src/theme";

export default function AddRecipe() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [preparationSteps, setPreparationSteps] = useState([""]);
  const [tips, setTips] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [ingredientDetails, setIngredientDetails] = useState({});
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const updateStep = (index, value) => {
    setPreparationSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const addStep = () => {
    setPreparationSteps((prev) => [...prev, ""]);
  };

  const removeStep = (index) => {
    setPreparationSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const alreadySelected = prev.includes(id);
      if (alreadySelected) {
        setIngredientDetails((curr) => {
          const next = { ...curr };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      setIngredientDetails((curr) => ({
        ...curr,
        [id]: curr[id] || { quantity: "", unit: "", note: "" },
      }));
      return [...prev, id];
    });
  };

  const updateIngredientDetail = (id, patch) => {
    setIngredientDetails((prev) => ({
      ...prev,
      [id]: {
        quantity: prev[id]?.quantity || "",
        unit: prev[id]?.unit || "",
        note: prev[id]?.note || "",
        ...patch,
      },
    }));
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Autorise l'acces photos pour continuer.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadRecipeImage = async (userId, localUri) => {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filePath = `${userId}/${Date.now()}.jpg`;
    const content = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(filePath, content, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("recipe-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const onSave = async () => {
    const cleanTitle = title.trim();
    const cleanedSteps = preparationSteps
      .map((s) => s.trim())
      .filter(Boolean);
    const cleanInstructions = cleanedSteps
      .map((s, idx) => `${idx + 1}. ${s}`)
      .join("\n");
    const cleanTips = tips.trim();
    const prepMinutes = Number.parseInt(prepTime, 10);
    const cookMinutes = Number.parseInt(cookTime, 10);
    if (!cleanTitle) {
      Alert.alert("Info", "Le titre est obligatoire.");
      return;
    }
    if (!cleanInstructions) {
      Alert.alert("Info", "Les etapes de realisation sont obligatoires.");
      return;
    }
    if (prepTime && (!Number.isFinite(prepMinutes) || prepMinutes < 0)) {
      Alert.alert("Info", "Le temps de preparation doit etre un nombre valide.");
      return;
    }
    if (cookTime && (!Number.isFinite(cookMinutes) || cookMinutes < 0)) {
      Alert.alert("Info", "Le temps de cuisson doit etre un nombre valide.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message || "Utilisateur non connecte.");
      }

      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadRecipeImage(user.id, imageUri);
      }

      const { error } = await supabase.from("recipes").insert({
        user_id: user.id,
        title: cleanTitle,
        ingredient_ids: selectedIds,
        ingredient_items: selectedIds.map((id) => ({
          id,
          quantity: String(ingredientDetails[id]?.quantity || "").trim(),
          unit: String(ingredientDetails[id]?.unit || "").trim(),
          note: String(ingredientDetails[id]?.note || "").trim(),
        })),
        image_url: imageUrl,
        prep_time_minutes: prepTime ? prepMinutes : null,
        cook_time_minutes: cookTime ? cookMinutes : null,
        instructions: cleanInstructions,
        tips: cleanTips || null,
      });

      if (error) throw error;

      Alert.alert("OK", "Recette enregistree.");
      router.back();
    } catch (e) {
      Alert.alert("Erreur enregistrement", e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const filteredIngredients = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    if (!q) return INGREDIENTS;
    return INGREDIENTS.filter((i) => i.nom.toLowerCase().includes(q));
  }, [ingredientSearch]);

  const displayedIngredients = useMemo(() => {
    return [...filteredIngredients].sort((a, b) => {
      const aSelected = selectedIds.includes(a.id) ? 1 : 0;
      const bSelected = selectedIds.includes(b.id) ? 1 : 0;
      return bSelected - aSelected;
    });
  }, [filteredIngredients, selectedIds]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Nouvelle recette</Text>
      <Text style={styles.subtitle}>
        Cree une recette claire et appetissante pour la communaute.
      </Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <TextInput
          style={styles.input}
          placeholder="Titre de la recette"
          placeholderTextColor={COLORS.inputPlaceholder}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />
        <Text style={styles.helper}>{title.trim().length}/80 caracteres</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeCol}>
            <Text style={styles.label}>Preparation (min)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 15"
              placeholderTextColor={COLORS.inputPlaceholder}
              value={prepTime}
              onChangeText={setPrepTime}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.timeCol}>
            <Text style={styles.label}>Cuisson (min)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 25"
              placeholderTextColor={COLORS.inputPlaceholder}
              value={cookTime}
              onChangeText={setCookTime}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Photo (optionnel)</Text>
        <TouchableOpacity style={styles.imageBtn} onPress={pickImage} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.imageBtnText}>
            {imageUri ? "Changer la photo" : "Ajouter une photo"}
          </Text>
        </TouchableOpacity>
        {imageUri ? (
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => setImageUri(null)}
            activeOpacity={INTERACTION.activeOpacity}
          >
            <Text style={styles.removeImageText}>Retirer la photo</Text>
          </TouchableOpacity>
        ) : null}
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Preparation</Text>
        {preparationSteps.map((step, index) => (
          <View key={`step-${index}`} style={styles.stepRow}>
            <Text style={styles.stepIndex}>{index + 1}.</Text>
            <TextInput
              style={[styles.input, styles.stepInput]}
              placeholder={`Etape ${index + 1}`}
              placeholderTextColor={COLORS.inputPlaceholder}
              value={step}
              onChangeText={(v) => updateStep(index, v)}
              multiline
            />
            {preparationSteps.length > 1 ? (
              <TouchableOpacity
                style={styles.stepRemoveBtn}
                onPress={() => removeStep(index)}
                activeOpacity={INTERACTION.activeOpacity}
              >
                <Text style={styles.stepRemoveText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
        <TouchableOpacity style={styles.addStepBtn} onPress={addStep} activeOpacity={INTERACTION.activeOpacity}>
          <Text style={styles.addStepBtnText}>+ Ajouter une etape</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Conseils (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Astuces de chef, variantes, conservation..."
          placeholderTextColor={COLORS.inputPlaceholder}
          value={tips}
          onChangeText={setTips}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.ingredientsHeader}>
          <Text style={styles.sectionTitle}>Ingredients (optionnel)</Text>
          <Text style={styles.countBadge}>{selectedIds.length} selectionne(s)</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Rechercher un ingredient..."
          placeholderTextColor={COLORS.inputPlaceholder}
          value={ingredientSearch}
          onChangeText={setIngredientSearch}
        />
        {selectedIds.length > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setSelectedIds([]);
              setIngredientDetails({});
            }}
            activeOpacity={INTERACTION.activeOpacity}
          >
            <Text style={styles.clearBtnText}>Tout deseletionner</Text>
          </TouchableOpacity>
        ) : null}

        <ScrollView
          style={styles.ingredientsList}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {displayedIngredients.length === 0 ? (
            <Text style={styles.helper}>Aucun ingredient trouve.</Text>
          ) : (
            displayedIngredients.map((item) => {
              const active = selectedIds.includes(item.id);
              return (
                <View key={item.id} style={[styles.rowWrap, active && styles.rowWrapActive]}>
                  <TouchableOpacity
                    onPress={() => toggle(item.id)}
                    style={[styles.row, active && styles.rowActive]}
                    activeOpacity={INTERACTION.activeOpacity}
                  >
                    <Text style={styles.checkIcon}>{active ? "✓" : "+"}</Text>
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>
                      {item.nom}
                    </Text>
                  </TouchableOpacity>
                  {active ? (
                    <View style={styles.inlineDetails}>
                      <View style={styles.detailRow}>
                        <TextInput
                          style={[styles.input, styles.detailQtyInput]}
                          placeholder="Quantite"
                          placeholderTextColor={COLORS.inputPlaceholder}
                          value={ingredientDetails[item.id]?.quantity || ""}
                          onChangeText={(v) => updateIngredientDetail(item.id, { quantity: v })}
                          keyboardType="decimal-pad"
                        />
                        <TextInput
                          style={[styles.input, styles.detailUnitInput]}
                          placeholder="Unite"
                          placeholderTextColor={COLORS.inputPlaceholder}
                          value={ingredientDetails[item.id]?.unit || ""}
                          onChangeText={(v) => updateIngredientDetail(item.id, { unit: v })}
                        />
                      </View>
                      <TextInput
                        style={[styles.input, styles.detailNoteInput]}
                        placeholder="Precision (optionnel)"
                        placeholderTextColor={COLORS.inputPlaceholder}
                        value={ingredientDetails[item.id]?.note || ""}
                        onChangeText={(v) => updateIngredientDetail(item.id, { note: v })}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={loading}
        activeOpacity={INTERACTION.activeOpacity}
      >
        <Text style={styles.btnText}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  scrollContent: { paddingBottom: 24 },
  title: { ...TYPO.h2, marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, marginBottom: 12 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 10,
    ...SHADOW.card,
  },
  sectionTitle: { ...TYPO.section, marginBottom: 8 },
  helper: { color: COLORS.textMuted, fontSize: 12 },
  label: { color: COLORS.text, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 8,
  },
  textarea: { minHeight: 100 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  stepIndex: { width: 24, color: COLORS.text, fontWeight: "800", paddingTop: 12 },
  stepInput: { flex: 1, marginBottom: 0, minHeight: 46 },
  stepRemoveBtn: {
    marginLeft: 8,
    marginTop: 8,
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerSoft,
  },
  stepRemoveText: { color: COLORS.danger, fontWeight: "800" },
  addStepBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  addStepBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },
  timeRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  timeCol: { flex: 1 },
  ingredientsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  countBadge: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  imageBtn: {
    backgroundColor: "#0f766e",
    borderRadius: RADIUS.sm,
    padding: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  imageBtnText: { color: "#fff", fontWeight: "700" },
  removeImageBtn: {
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.sm,
    padding: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  removeImageText: { color: COLORS.danger, fontWeight: "700" },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: RADIUS.md,
    marginTop: 2,
  },
  clearBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  clearBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  ingredientsList: { maxHeight: 280 },
  rowWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
    ...SHADOW.card,
  },
  rowWrapActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  inlineDetails: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2 },
  detailRow: { flexDirection: "row", gap: 8 },
  detailQtyInput: { flex: 1 },
  detailUnitInput: { flex: 1.4 },
  detailNoteInput: { marginBottom: 0 },
  row: {
    backgroundColor: "transparent",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  rowActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  checkIcon: {
    width: 20,
    textAlign: "center",
    marginRight: 8,
    color: COLORS.primary,
    fontWeight: "800",
  },
  rowText: { color: COLORS.text, fontWeight: "600" },
  rowTextActive: { color: COLORS.primary },
  btn: {
    marginTop: 2,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});