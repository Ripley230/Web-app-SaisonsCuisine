import { useEffect, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/supaCore";
import { INGREDIENTS } from "../../src/data";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW, INTERACTION, TYPO } from "../../src/theme";

export default function EditRecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [preparationSteps, setPreparationSteps] = useState([""]);
  const [tips, setTips] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [ingredientDetails, setIngredientDetails] = useState({});
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [newImageUri, setNewImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const displayedIngredients = [...INGREDIENTS].sort((a, b) => {
    const aSelected = selectedIds.includes(a.id) ? 1 : 0;
    const bSelected = selectedIds.includes(b.id) ? 1 : 0;
    return bSelected - aSelected;
  });

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

  const toggle = (ingredientId) => {
    setSelectedIds((prev) => {
      const alreadySelected = prev.includes(ingredientId);
      if (alreadySelected) {
        setIngredientDetails((curr) => {
          const next = { ...curr };
          delete next[ingredientId];
          return next;
        });
        return prev.filter((x) => x !== ingredientId);
      }
      setIngredientDetails((curr) => ({
        ...curr,
        [ingredientId]: curr[ingredientId] || { quantity: "", unit: "", note: "" },
      }));
      return [...prev, ingredientId];
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

  const extractStoragePathFromPublicUrl = (publicUrl) => {
    const marker = "/storage/v1/object/public/recipe-images/";
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.substring(idx + marker.length);
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
      setNewImageUri(result.assets[0].uri);
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

  const loadRecipe = async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select("id,title,ingredient_ids,ingredient_items,image_url,prep_time_minutes,cook_time_minutes,instructions,tips")
      .eq("id", id)
      .single();

    if (error) {
      Alert.alert("Erreur", error.message);
      router.back();
      return;
    }

    setTitle(data.title || "");
    setPrepTime(data.prep_time_minutes != null ? String(data.prep_time_minutes) : "");
    setCookTime(data.cook_time_minutes != null ? String(data.cook_time_minutes) : "");
    const parsedSteps = String(data.instructions || "")
      .split("\n")
      .map((line) => line.replace(/^\s*\d+[\.\)]\s*/, "").trim())
      .filter(Boolean);
    setPreparationSteps(parsedSteps.length > 0 ? parsedSteps : [""]);
    setTips(data.tips || "");
    setSelectedIds(data.ingredient_ids || []);
    const detailsFromDb = {};
    for (const row of data.ingredient_items || []) {
      if (row?.id) {
        detailsFromDb[row.id] = {
          quantity: String(row.quantity || ""),
          unit: String(row.unit || ""),
          note: String(row.note || ""),
        };
      }
    }
    setIngredientDetails(detailsFromDb);
    setCurrentImageUrl(data.image_url || null);
  };

  useEffect(() => {
    loadRecipe();
  }, [id]);

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
    if (!cleanTitle) return Alert.alert("Info", "Le titre est obligatoire.");
    if (!cleanInstructions) return Alert.alert("Info", "Les etapes de realisation sont obligatoires.");
    if (prepTime && (!Number.isFinite(prepMinutes) || prepMinutes < 0)) {
      return Alert.alert("Info", "Le temps de preparation doit etre un nombre valide.");
    }
    if (cookTime && (!Number.isFinite(cookMinutes) || cookMinutes < 0)) {
      return Alert.alert("Info", "Le temps de cuisson doit etre un nombre valide.");
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

      let nextImageUrl = currentImageUrl;

      // si une nouvelle image est choisie, upload + delete ancienne
      if (newImageUri) {
        nextImageUrl = await uploadRecipeImage(user.id, newImageUri);

        if (currentImageUrl) {
          const oldPath = extractStoragePathFromPublicUrl(currentImageUrl);
          if (oldPath) {
            await supabase.storage.from("recipe-images").remove([oldPath]);
          }
        }
      }

      const { error } = await supabase
        .from("recipes")
        .update({
          title: cleanTitle,
          ingredient_ids: selectedIds,
          ingredient_items: selectedIds.map((ingredientId) => ({
            id: ingredientId,
            quantity: String(ingredientDetails[ingredientId]?.quantity || "").trim(),
            unit: String(ingredientDetails[ingredientId]?.unit || "").trim(),
            note: String(ingredientDetails[ingredientId]?.note || "").trim(),
          })),
          image_url: nextImageUrl,
          prep_time_minutes: prepTime ? prepMinutes : null,
          cook_time_minutes: cookTime ? cookMinutes : null,
          instructions: cleanInstructions,
          tips: cleanTips || null,
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("OK", "Recette mise a jour.");
      router.back();
    } catch (e) {
      Alert.alert("Erreur update", e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Modifier la recette</Text>

      <TextInput
        style={styles.input}
        placeholder="Titre de la recette"
        placeholderTextColor={COLORS.inputPlaceholder}
        value={title}
        onChangeText={setTitle}
      />
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

      <Text style={styles.label}>Etapes de realisation</Text>
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

      <Text style={styles.label}>Conseils (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Astuces de chef, variantes..."
        placeholderTextColor={COLORS.inputPlaceholder}
        value={tips}
        onChangeText={setTips}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.imageBtn} onPress={pickImage} activeOpacity={INTERACTION.activeOpacity}>
        <Text style={styles.imageBtnText}>Remplacer la photo</Text>
      </TouchableOpacity>

      {newImageUri ? (
        <Image source={{ uri: newImageUri }} style={styles.preview} />
      ) : currentImageUrl ? (
        <Image source={{ uri: currentImageUrl }} style={styles.preview} />
      ) : null}

      <Text style={styles.label}>Ingredients</Text>
      <ScrollView
        style={styles.ingredientsList}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {displayedIngredients.map((item) => {
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
                      onChangeText={(v) =>
                        updateIngredientDetail(item.id, { quantity: v })
                      }
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[styles.input, styles.detailUnitInput]}
                      placeholder="Unite"
                      placeholderTextColor={COLORS.inputPlaceholder}
                      value={ingredientDetails[item.id]?.unit || ""}
                      onChangeText={(v) =>
                        updateIngredientDetail(item.id, { unit: v })
                      }
                    />
                  </View>
                  <TextInput
                    style={[styles.input, styles.detailNoteInput]}
                    placeholder="Precision (optionnel)"
                    placeholderTextColor={COLORS.inputPlaceholder}
                    value={ingredientDetails[item.id]?.note || ""}
                    onChangeText={(v) =>
                      updateIngredientDetail(item.id, { note: v })
                    }
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={loading}
        activeOpacity={INTERACTION.activeOpacity}
      >
        <Text style={styles.btnText}>{loading ? "Enregistrement..." : "Enregistrer"}</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  scrollContent: { paddingBottom: 24 },
  title: { ...TYPO.h2, marginBottom: 10 },
  label: { fontWeight: "700", marginBottom: 8, color: COLORS.text, marginTop: 8 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 12,
  },
  imageBtn: {
    backgroundColor: "#0f766e",
    borderRadius: RADIUS.sm,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  imageBtnText: { color: "#fff", fontWeight: "700" },
  preview: { width: "100%", height: 180, borderRadius: RADIUS.md, marginBottom: 10 },
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
  row: { backgroundColor: "transparent", padding: 10, flexDirection: "row", alignItems: "center" },
  checkIcon: {
    width: 20,
    textAlign: "center",
    marginRight: 8,
    color: COLORS.primary,
    fontWeight: "800",
  },
  rowActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  rowText: { color: COLORS.text, fontWeight: "600" },
  rowTextActive: { color: COLORS.primary },
  textarea: { minHeight: 96 },
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
  timeRow: { flexDirection: "row", gap: 10 },
  timeCol: { flex: 1 },
  ingredientsList: { maxHeight: 280 },
  inlineDetails: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2 },
  detailRow: { flexDirection: "row", gap: 8 },
  detailQtyInput: { flex: 1 },
  detailUnitInput: { flex: 1.4 },
  detailNoteInput: { marginBottom: 0 },
  btn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});