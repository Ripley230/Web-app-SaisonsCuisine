import { useEffect, useState } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../src/supaCore";
import { fetchUnreadCount } from "../src/notifications";
import { COLORS, INTERACTION, RADIUS, SHADOW } from "../src/theme";

export default function NotificationsBell() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user?.id) return;
      const unread = await fetchUnreadCount(user.id);
      if (active) setCount(unread);
    };

    load();
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <TouchableOpacity
      style={[styles.bellWrap, { top: insets.top + 8 }]}
      onPress={() => router.push("/notifications")}
      activeOpacity={INTERACTION.activeOpacity}
    >
      <Text style={styles.bellIcon}>🔔</Text>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : String(count)}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bellWrap: {
    position: "absolute",
    right: 16,
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
  bellIcon: { fontSize: 20 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
