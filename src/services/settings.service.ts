import { prisma } from "../config/database";
import { ENV } from "../config/env";

const SETTING_KEY_MAX_BOOKINGS = "max_bookings_per_slot";
const CACHE_TTL_MS = 5000;

let maxBookingsCache: { value: number; expiresAt: number } | null = null;

const parsePositiveInt = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const asInt = Math.floor(parsed);
  return asInt > 0 ? asInt : null;
};

export const getMaxBookingsPerSlot = async (): Promise<number> => {
  const now = Date.now();
  if (maxBookingsCache && maxBookingsCache.expiresAt > now) {
    return maxBookingsCache.value;
  }

  const setting = await prisma.setting.findUnique({
    where: { key: SETTING_KEY_MAX_BOOKINGS },
    select: { value: true },
  });

  const fromDb = parsePositiveInt(setting?.value ?? null);
  const fallback = Number.isFinite(ENV.MAX_BOOKINGS_PER_SLOT)
    ? Math.max(1, Math.floor(ENV.MAX_BOOKINGS_PER_SLOT))
    : 4;

  const value = fromDb ?? fallback;
  maxBookingsCache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
};

export const upsertMaxBookingsPerSlot = async (value: number): Promise<void> => {
  const safeValue = Math.max(1, Math.floor(value));
  await prisma.setting.upsert({
    where: { key: SETTING_KEY_MAX_BOOKINGS },
    update: { value: String(safeValue) },
    create: { key: SETTING_KEY_MAX_BOOKINGS, value: String(safeValue) },
  });
  maxBookingsCache = { value: safeValue, expiresAt: Date.now() + CACHE_TTL_MS };
};

export const listSettings = async (): Promise<{ key: string; value: string }[]> => {
  return prisma.setting.findMany({
    select: { key: true, value: true },
    orderBy: { key: "asc" },
  });
};
