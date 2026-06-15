import type { ManualDirectionValue, TxnDirectionValue } from "./utils";

export type ExpenseCategoryForCategorize = {
  id: string;
  name: string;
  direction: ManualDirectionValue;
  keywords: string[];
  sort: number;
};

export type ExpenseTxnForCategorize = {
  direction: TxnDirectionValue;
  merchant: string | null;
  item: string | null;
  sourceCategory: string | null;
};

const sourceCategoryMap: Array<[RegExp, string]> = [
  [/餐饮|美食|食品|饮品|外卖/, "餐饮"],
  [/交通|出行|打车|公交|地铁|铁路|机票/, "交通"],
  [/购物|消费|百货|超市|便利店/, "购物"],
  [/房租|物业|水电|燃气|居住/, "居住"],
  [/娱乐|游戏|电影|演出|休闲/, "娱乐"],
  [/医疗|医药|医院|药/, "医疗"],
  [/红包|转账|人情|礼物/, "人情"],
  [/订阅|会员|通信|数码/, "订阅"],
  [/旅行|酒店|景区|门票/, "旅行"],
  [/工资|薪资|奖金/, "工资"],
  [/理财|收益|利息|基金|股票/, "理财"],
  [/退款|返现|补贴|收入/, "其他收入"],
];

function directionAllowsCategory(direction: TxnDirectionValue, category: ExpenseCategoryForCategorize) {
  return direction === "NEUTRAL" || category.direction === direction;
}

function sortedCategories(categories: ExpenseCategoryForCategorize[]) {
  return [...categories].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

export function categorizeExpenseTransaction(
  txn: ExpenseTxnForCategorize,
  categories: ExpenseCategoryForCategorize[],
) {
  const haystack = `${txn.merchant ?? ""} ${txn.item ?? ""}`.toLowerCase();
  const candidates = sortedCategories(categories).filter((category) => directionAllowsCategory(txn.direction, category));

  for (const category of candidates) {
    if (category.keywords.some((keyword) => keyword && haystack.includes(keyword.toLowerCase()))) {
      return category.id;
    }
  }

  const sourceCategory = txn.sourceCategory ?? "";
  const mappedName = sourceCategoryMap.find(([pattern]) => pattern.test(sourceCategory))?.[1] ?? null;
  if (!mappedName) {
    return null;
  }

  return candidates.find((category) => category.name === mappedName)?.id ?? null;
}
