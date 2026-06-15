import { db } from "@/lib/db";

export const PROFILE_SETTING_KEYS = {
  name: "profile.name",
  bio: "profile.bio",
  avatar: "profile.avatar",
} as const;

export type ProfileSettings = {
  name: string;
  bio: string;
  avatar: string | null;
};

export const defaultProfileSettings: ProfileSettings = {
  name: "铁蛋",
  bio: "记录游戏、书影、旅行、消费和那些值得留下来的日子。",
  avatar: null,
};

function cleanString(value: string) {
  return value.trim();
}

export async function getProfileSettings(): Promise<ProfileSettings> {
  const rows = await db.setting.findMany({
    where: {
      key: {
        in: Object.values(PROFILE_SETTING_KEYS),
      },
    },
  });
  const settings = new Map(rows.map((row) => [row.key, row.value]));

  return {
    name: settings.get(PROFILE_SETTING_KEYS.name) || defaultProfileSettings.name,
    bio: settings.get(PROFILE_SETTING_KEYS.bio) || defaultProfileSettings.bio,
    avatar: settings.get(PROFILE_SETTING_KEYS.avatar) || null,
  };
}

export async function saveProfileSettings(settings: ProfileSettings) {
  const entries = [
    [PROFILE_SETTING_KEYS.name, cleanString(settings.name) || defaultProfileSettings.name],
    [PROFILE_SETTING_KEYS.bio, cleanString(settings.bio) || defaultProfileSettings.bio],
    [PROFILE_SETTING_KEYS.avatar, cleanString(settings.avatar ?? "")],
  ] as const;

  await Promise.all(
    entries.map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
}
