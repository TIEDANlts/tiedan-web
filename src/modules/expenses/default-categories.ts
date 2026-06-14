import type { TxnDirection } from "@prisma/client";

export type ExpenseCategoryDirection = Extract<TxnDirection, "EXPENSE" | "INCOME">;

export type DefaultExpenseCategory = {
  name: string;
  direction: ExpenseCategoryDirection;
  icon: string;
  keywords: string[];
  sort: number;
};

export const defaultExpenseCategories = [
  {
    name: "餐饮",
    direction: "EXPENSE",
    icon: "🍜",
    keywords: ["餐饮", "美食", "饭", "餐厅", "外卖", "咖啡", "奶茶"],
    sort: 10,
  },
  {
    name: "交通",
    direction: "EXPENSE",
    icon: "🚇",
    keywords: ["交通", "地铁", "公交", "打车", "滴滴", "停车", "加油", "火车票"],
    sort: 20,
  },
  {
    name: "购物",
    direction: "EXPENSE",
    icon: "🛒",
    keywords: ["购物", "淘宝", "京东", "天猫", "拼多多", "商场", "超市", "便利店"],
    sort: 30,
  },
  {
    name: "居住",
    direction: "EXPENSE",
    icon: "🏠",
    keywords: ["房租", "物业", "水费", "电费", "燃气", "宽带", "家居"],
    sort: 40,
  },
  {
    name: "娱乐",
    direction: "EXPENSE",
    icon: "🎮",
    keywords: ["娱乐", "游戏", "电影", "演出", "KTV", "会员"],
    sort: 50,
  },
  {
    name: "医疗",
    direction: "EXPENSE",
    icon: "💊",
    keywords: ["医院", "药", "医保", "体检", "牙科", "诊所"],
    sort: 60,
  },
  {
    name: "人情",
    direction: "EXPENSE",
    icon: "🧧",
    keywords: ["红包", "礼物", "份子钱", "人情", "转账"],
    sort: 70,
  },
  {
    name: "订阅",
    direction: "EXPENSE",
    icon: "📱",
    keywords: ["订阅", "会员", "iCloud", "云服务", "App Store", "Netflix", "Spotify"],
    sort: 80,
  },
  {
    name: "旅行",
    direction: "EXPENSE",
    icon: "✈️",
    keywords: ["旅行", "酒店", "民宿", "景区", "门票", "机票", "火车"],
    sort: 90,
  },
  {
    name: "其他",
    direction: "EXPENSE",
    icon: "📦",
    keywords: ["其他", "杂项"],
    sort: 100,
  },
  {
    name: "工资",
    direction: "INCOME",
    icon: "💼",
    keywords: ["工资", "薪资", "奖金"],
    sort: 210,
  },
  {
    name: "理财",
    direction: "INCOME",
    icon: "📈",
    keywords: ["理财", "利息", "收益", "分红", "基金", "股票"],
    sort: 220,
  },
  {
    name: "其他收入",
    direction: "INCOME",
    icon: "💰",
    keywords: ["收入", "退款", "返现", "补贴", "转入"],
    sort: 230,
  },
] as const satisfies DefaultExpenseCategory[];
