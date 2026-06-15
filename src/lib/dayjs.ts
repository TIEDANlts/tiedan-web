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

export { dayjs };
