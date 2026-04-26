import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import NotificationsBell from "../../components/NotificationsBell";
import SettingsButton from "../../components/SettingsButton";

export default function TabsLayout() {
  return (
    <View style={styles.wrap}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#065f46",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarStyle: {
            height: 74,
            paddingTop: 8,
            paddingBottom: 10,
            borderTopWidth: 0,
            backgroundColor: "#ffffff",
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            borderRadius: 18,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 8,
          },
          tabBarItemStyle: { borderRadius: 14, marginHorizontal: 2 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
          tabBarIcon: ({ color, size }) => {
            let icon = "ellipse-outline";
            if (route.name === "index") icon = "leaf-outline";
            if (route.name === "recipes") icon = "restaurant-outline";
            if (route.name === "community") icon = "people-outline";
            if (route.name === "profile") icon = "person-outline";
            return <Ionicons name={icon} size={size} color={color} />;
          },
        })}
      >
        <Tabs.Screen name="index" options={{ title: "Saison" }} />
        <Tabs.Screen name="recipes" options={{ title: "Recettes" }} />
        <Tabs.Screen name="community" options={{ title: "Personnes" }} />
        <Tabs.Screen name="profile" options={{ title: "Profil" }} />
      </Tabs>
      <SettingsButton />
      <NotificationsBell />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});