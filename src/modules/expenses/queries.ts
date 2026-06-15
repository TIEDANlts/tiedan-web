import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { formatShanghaiDate, formatShanghaiDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/money";
import {
  groupTransactionsByDate,
  monthRange,
  parseExpenseFilters,
  shiftMonth,
  transactionDisplayText,
  type ExpenseFilters,
  type ManualDirectionValue,
  type TxnDirectionValue,
} from "@/modules/expenses/utils";

export type ExpenseSearchParams = Record<string, string | string[] | undefined>;

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  direction: ManualDirectionValue;
  icon: string | null;
  keywords: string[];
  sort: number;
};

export type ExpenseCategoryAdminItem = ExpenseCategoryOption & {
  transactionCount: number;
};

export type ExpenseTransactionItem = {
  id: string;
  platform: string;
  txnTime: string;
  txnDate: string;
  amount: string;
  amountText: string;
  direction: TxnDirectionValue;
  categoryId: string | null;
  category: Pick<ExpenseCategoryOption, "id" | "name" | "direction" | "icon"> | null;
  merchant: string | null;
  item: string | null;
  payMethod: string | null;
  txnNo: string | null;
  note: string | null;
  displayText: string;
  createdAt: string;
};

export type ExpenseDayGroup = {
  date: string;
  expenseSubtotal: string;
  expenseSubtotalText: string;
  items: ExpenseTransactionItem[];
};

export type ExpensePageData = {
  filters: ExpenseFilters;
  prevMonth: string;
  nextMonth: string;
  today: string;
  categories: ExpenseCategoryOption[];
  platforms: string[];
  groups: ExpenseDayGroup[];
};

function serializeCategory(category: {
  id: string;
  name: string;
  direction: string;
  icon: string | null;
  keywords: string[];
  sort: number;
}): ExpenseCategoryOption {
  return {
    ...category,
    direction: category.direction as ManualDirectionValue,
  };
}

function serializeTransaction(
  transaction: Prisma.TransactionGetPayload<{ include: { category: true } }>,
): ExpenseTransactionItem {
  const amount = transaction.amount.toFixed(2);
  const category = transaction.category ? serializeCategory(transaction.category) : null;

  return {
    id: transaction.id,
    platform: transaction.platform,
    txnTime: formatShanghaiDateTime(transaction.txnTime),
    txnDate: formatShanghaiDate(transaction.txnTime),
    amount,
    amountText: formatMoney(amount),
    direction: transaction.direction as TxnDirectionValue,
    categoryId: transaction.categoryId,
    category: category
      ? {
          id: category.id,
          name: category.name,
          direction: category.direction,
          icon: category.icon,
        }
      : null,
    merchant: transaction.merchant,
    item: transaction.item,
    payMethod: transaction.payMethod,
    txnNo: transaction.txnNo,
    note: transaction.note,
    displayText: transactionDisplayText(transaction.item, transaction.note),
    createdAt: formatShanghaiDateTime(transaction.createdAt),
  };
}

function buildTransactionWhere(filters: ExpenseFilters): Prisma.TransactionWhereInput {
  const range = monthRange(filters.month);
  const and: Prisma.TransactionWhereInput[] = [
    {
      txnTime: {
        gte: range.start,
        lt: range.end,
      },
    },
  ];

  if (filters.direction !== "ALL") {
    and.push({ direction: filters.direction });
  }

  if (filters.categoryId) {
    and.push({ categoryId: filters.categoryId });
  }

  if (filters.platform) {
    and.push({ platform: filters.platform });
  }

  if (filters.query) {
    and.push({
      OR: [
        { merchant: { contains: filters.query, mode: "insensitive" } },
        { item: { contains: filters.query, mode: "insensitive" } },
        { note: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }

  return { AND: and };
}

export async function getExpenseCategories(): Promise<ExpenseCategoryOption[]> {
  const categories = await db.expenseCategory.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });

  return categories.map(serializeCategory);
}

export async function getExpenseCategoriesForAdmin(): Promise<ExpenseCategoryAdminItem[]> {
  const categories = await db.expenseCategory.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  return categories.map((category) => ({
    ...serializeCategory(category),
    transactionCount: category._count.transactions,
  }));
}

export async function getExpensePageData(searchParams: ExpenseSearchParams): Promise<ExpensePageData> {
  const filters = parseExpenseFilters(searchParams);
  const where = buildTransactionWhere(filters);
  const [transactions, categories, platformRows] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ txnTime: "desc" }, { createdAt: "desc" }],
    }),
    getExpenseCategories(),
    db.transaction.findMany({
      select: { platform: true },
      distinct: ["platform"],
      orderBy: { platform: "asc" },
    }),
  ]);

  const items = transactions.map(serializeTransaction);
  const groups = groupTransactionsByDate(items).map((group) => ({
    ...group,
    expenseSubtotalText: formatMoney(group.expenseSubtotal),
  }));

  return {
    filters,
    prevMonth: shiftMonth(filters.month, -1),
    nextMonth: shiftMonth(filters.month, 1),
    today: formatShanghaiDate(new Date()),
    categories,
    platforms: platformRows.map((row) => row.platform),
    groups,
  };
}
