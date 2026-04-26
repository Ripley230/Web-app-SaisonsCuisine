import AsyncStorage from "@react-native-async-storage/async-storage";

const COUNTRY_KEY = "fruitssaisons:country";

export async function saveCountry(countryCode) {
  await AsyncStorage.setItem(COUNTRY_KEY, countryCode);
}

export async function loadCountry() {
  const value = await AsyncStorage.getItem(COUNTRY_KEY);
  return value || null;
}

export async function clearCountry() {
  await AsyncStorage.removeItem(COUNTRY_KEY);
}
