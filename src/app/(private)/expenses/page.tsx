import { ExpensesLedger } from "@/app/(private)/expenses/expenses-ledger";
import { getExpensePageData, type ExpenseSearchParams } from "@/modules/expenses/queries";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<ExpenseSearchParams> }) {
  const data = await getExpensePageData(await searchParams);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <ExpensesLedger data={data} />
    </main>
  );
}
