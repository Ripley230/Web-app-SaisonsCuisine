import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/supaCore";
import { isUserAdmin } from "../../src/authz";

export default function AdminScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState([]);

  const loadReports = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const admin = isUserAdmin(user);
    setIsAdmin(admin);

    if (!admin) return;

    const { data, error } = await supabase
      .from("reports")
      .select("id,target_type,target_id,reason,details,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Erreur admin", error.message);
      return;
    }

    setReports(data || []);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const setStatus = async (id, status) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return Alert.alert("Erreur update", error.message);

    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Admin</Text>
          <Text>Acces reserve aux administrateurs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Moderation</Text>

        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>Aucun signalement.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowHead}>
                <Text style={styles.strong}>
                  {item.target_type} | {item.status}
                </Text>
                {item.target_type === "bug" ? (
                  <Text style={styles.bugBadge}>BUG</Text>
                ) : null}
              </View>
              <Text>Motif: {item.reason}</Text>
              {!!item.details && <Text>Details: {item.details}</Text>}
              <Text style={styles.meta}>{new Date(item.created_at).toLocaleString("fr-FR")}</Text>

              <View style={styles.row}>
                <TouchableOpacity onPress={() => setStatus(item.id, "reviewing")}>
                  <Text style={styles.link}>Reviewing</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStatus(item.id, "resolved")}>
                  <Text style={styles.link}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStatus(item.id, "rejected")}>
                  <Text style={styles.reject}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f9f8" },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  strong: { fontWeight: "800", marginBottom: 4 },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bugBadge: {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontWeight: "700",
    fontSize: 11,
  },
  meta: { color: "#6b7280", fontSize: 12, marginTop: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  link: { color: "#166534", fontWeight: "700" },
  reject: { color: "#b91c1c", fontWeight: "700" },
});