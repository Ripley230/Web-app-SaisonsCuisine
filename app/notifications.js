import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/supaCore";
import { UserAvatar } from "../components/UserAvatar";
import {
  fetchNotifications,
  getReadIds,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../src/notifications";
import { COLORS, RADIUS, SHADOW, TYPO } from "../src/theme";

export default function NotificationsScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [rows, read] = await Promise.all([
      fetchNotifications(user.id),
      getReadIds(user.id),
    ]);
    setNotifications(rows);
    setReadIds(new Set(read));
    setLoading(false);
  };

  const onPressNotification = async (item) => {
    if (!userId) return;
    if (!readIds.has(item.id)) {
      await markNotificationAsRead(userId, item.id);
      setReadIds((prev) => new Set(prev).add(item.id));
    }
    if (item.route) router.push(item.route);
  };

  const onMarkAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsAsRead(userId);
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity style={styles.readAllBtn} onPress={onMarkAllRead}>
            <Text style={styles.readAllBtnText}>Tout marquer lu</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Text style={styles.empty}>Aucune notification.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onPressNotification(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardRow}>
                <UserAvatar uri={item.avatar_url} size={42} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {!readIds.has(item.id) ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.cardBody}>{item.body}</Text>
                  <Text style={styles.cardMeta}>
                    {item.created_at ? new Date(item.created_at).toLocaleString("fr-FR") : ""}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { ...TYPO.h2, color: COLORS.text, marginBottom: 10 },
  readAllBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
  },
  readAllBtnText: { color: COLORS.textMuted, fontWeight: "700", fontSize: 12 },
  empty: { color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  cardContent: { flex: 1, marginLeft: 10 },
  cardTitle: { color: COLORS.text, fontWeight: "800", marginBottom: 4 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: "#2563eb",
    marginLeft: 8,
  },
  cardBody: { color: COLORS.textMuted, marginBottom: 6 },
  cardMeta: { color: COLORS.textMuted, fontSize: 12 },
});
