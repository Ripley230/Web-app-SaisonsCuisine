import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, INTERACTION, RADIUS, SHADOW } from "../src/theme";

export default function SettingsButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[styles.wrap, { top: insets.top + 8 }]}
      onPress={() => router.push("/settings")}
      activeOpacity={INTERACTION.activeOpacity}
    >
      <Text style={styles.icon}>⚙️</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 66,
    zIndex: 40,
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  icon: { fontSize: 20 },
});
