import dayjs, { type ConfigType } from "dayjs";
import "dayjs/locale/zh-cn";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isoWeek from "dayjs/plugin/isoWeek";

export const SHANGHAI_TIMEZONE = "Asia/Shanghai";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.locale("zh-cn");
dayjs.tz.setDefault(SHANGHAI_TIMEZONE);

export function toShanghaiTime(input?: ConfigType) {
  return dayjs(input).tz(SHANGHAI_TIMEZONE);
}

export function formatShanghaiDate(input?: ConfigType) {
  return toShanghaiTime(input).format("YYYY-MM-DD");
}

export function formatShanghaiDateTime(input?: ConfigType) {
  return toShanghaiTime(input).format("YYYY-MM-DD HH:mm");
}

export function parseStrictShanghaiDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = dayjs.tz(`${value}T00:00:00`, SHANGHAI_TIMEZONE);

  if (!parsed.isValid() || parsed.format("YYYY-MM-DD") !== value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export { dayjs };
