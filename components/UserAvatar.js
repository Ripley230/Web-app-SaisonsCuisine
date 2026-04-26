import { Image, View, Text, StyleSheet } from "react-native";
import { COLORS } from "../src/theme";

export function UserAvatar({ uri, size = 56 }) {
  const r = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: r }]}
        accessibilityLabel="Photo de profil"
      />
    );
  }
  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: r }]}>
      <Text style={{ fontSize: Math.round(size * 0.38) }}>👤</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.border,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholder: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
