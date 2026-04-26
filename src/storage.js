import AsyncStorage from "@react-native-async-storage/async-storage";

const FAV_KEY = "fruitssaisons:favoris";
const FAV_KEY_PREFIX = "fruitssaisons:favoris:user:";

function buildFavKey(userId) {
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) return FAV_KEY;
  return `${FAV_KEY_PREFIX}${cleanUserId}`;
}

export async function saveFavoris(favoris, userId) {
  await AsyncStorage.setItem(buildFavKey(userId), JSON.stringify(favoris));
}

export async function loadFavoris(userId) {
  const raw = await AsyncStorage.getItem(buildFavKey(userId));
  return raw ? JSON.parse(raw) : [];
}