import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supaCore";

function keyForUser(userId) {
  return `fruitssaisons:notifs:lastSeen:${userId}`;
}

function keyReadIdsForUser(userId) {
  return `fruitssaisons:notifs:readIds:${userId}`;
}

export async function getLastSeenAt(userId) {
  const raw = await AsyncStorage.getItem(keyForUser(userId));
  return raw || null;
}

export async function setLastSeenNow(userId) {
  await AsyncStorage.setItem(keyForUser(userId), new Date().toISOString());
}

export async function getReadIds(userId) {
  const raw = await AsyncStorage.getItem(keyReadIdsForUser(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(userId, notificationId) {
  const current = new Set(await getReadIds(userId));
  current.add(notificationId);
  await AsyncStorage.setItem(keyReadIdsForUser(userId), JSON.stringify([...current]));
}

export async function markAllNotificationsAsRead(userId) {
  const notifications = await fetchNotifications(userId);
  const ids = notifications.map((n) => n.id);
  await AsyncStorage.setItem(keyReadIdsForUser(userId), JSON.stringify(ids));
}

function buildMap(rows, keyField = "user_id", valueField = "username") {
  const map = new Map();
  for (const row of rows || []) {
    map.set(row[keyField], row[valueField]);
  }
  return map;
}

function buildProfileMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    map.set(row.user_id, {
      username: row.username,
      avatar_url: row.avatar_url || null,
    });
  }
  return map;
}

export async function fetchNotifications(userId) {
  const notifications = [];

  const { data: reportsRows } = await supabase
    .from("reports")
    .select("id,target_type,reason,details,created_at")
    .eq("target_id", userId)
    .in("target_type", ["warning", "admin_reply"])
    .order("created_at", { ascending: false });

  for (const row of reportsRows || []) {
    notifications.push({
      id: `report-${row.id}`,
      type: row.target_type,
      created_at: row.created_at,
      title: row.target_type === "warning" ? "Avertissement moderation" : "Retour sur signalement",
      body: row.details || row.reason || "Message de moderation",
      route: "/reports-console",
      avatar_url: null,
    });
  }

  const { data: followsRows } = await supabase
    .from("follows")
    .select("follower_id,created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });

  const followerIds = [...new Set((followsRows || []).map((f) => f.follower_id).filter(Boolean))];
  let userMap = new Map();
  if (followerIds.length > 0) {
    const { data: followerProfiles } = await supabase
      .from("profiles")
      .select("user_id,username,avatar_url")
      .in("user_id", followerIds);
    userMap = buildProfileMap(followerProfiles);
  }

  for (const row of followsRows || []) {
    const actor = userMap.get(row.follower_id) || {};
    const username = actor.username || "Un utilisateur";
    notifications.push({
      id: `follow-${row.follower_id}-${row.created_at}`,
      type: "follow",
      created_at: row.created_at,
      title: "Nouveau follower",
      body: `${username} s'est abonne a toi.`,
      route: row.follower_id ? `/user/${row.follower_id}` : "/(tabs)/community",
      avatar_url: actor.avatar_url || null,
    });
  }

  const { data: myRecipes } = await supabase
    .from("recipes")
    .select("id,title")
    .eq("user_id", userId);
  const myRecipeIds = (myRecipes || []).map((r) => r.id);
  const recipeMap = new Map((myRecipes || []).map((r) => [r.id, r.title]));

  if (myRecipeIds.length > 0) {
    const { data: likesRows } = await supabase
      .from("recipe_likes")
      .select("recipe_id,user_id,created_at")
      .in("recipe_id", myRecipeIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: commentsRows } = await supabase
      .from("comments")
      .select("recipe_id,user_id,content,created_at")
      .in("recipe_id", myRecipeIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false });

    const actorIds = [
      ...new Set([
        ...(likesRows || []).map((l) => l.user_id),
        ...(commentsRows || []).map((c) => c.user_id),
      ].filter(Boolean)),
    ];

    let actorsMap = new Map();
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from("profiles")
        .select("user_id,username,avatar_url")
        .in("user_id", actorIds);
      actorsMap = buildProfileMap(actors);
    }

    for (const row of likesRows || []) {
      const actor = actorsMap.get(row.user_id) || {};
      const username = actor.username || "Un utilisateur";
      notifications.push({
        id: `like-${row.recipe_id}-${row.user_id}-${row.created_at}`,
        type: "like",
        created_at: row.created_at,
        title: "Nouveau like",
        body: `${username} a aime ta recette "${recipeMap.get(row.recipe_id) || "Recette"}".`,
        route: row.recipe_id ? `/recipe/${row.recipe_id}` : "/(tabs)/recipes",
        avatar_url: actor.avatar_url || null,
      });
    }

    for (const row of commentsRows || []) {
      const actor = actorsMap.get(row.user_id) || {};
      const username = actor.username || "Un utilisateur";
      notifications.push({
        id: `comment-${row.recipe_id}-${row.user_id}-${row.created_at}`,
        type: "comment",
        created_at: row.created_at,
        title: "Nouveau commentaire",
        body: `${username} a commente "${recipeMap.get(row.recipe_id) || "Recette"}": ${row.content || ""}`,
        route: row.recipe_id ? `/recipe/${row.recipe_id}` : "/(tabs)/recipes",
        avatar_url: actor.avatar_url || null,
      });
    }
  }

  notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return notifications;
}

export async function fetchUnreadCount(userId) {
  const [readIds, notifications] = await Promise.all([
    getReadIds(userId),
    fetchNotifications(userId),
  ]);
  const readSet = new Set(readIds);
  return notifications.filter((n) => !readSet.has(n.id)).length;
}
