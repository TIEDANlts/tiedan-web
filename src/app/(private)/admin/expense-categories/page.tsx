import { ExpenseCategoriesAdmin } from "@/app/(private)/admin/expense-categories/expense-categories-admin";
import { getExpenseCategoriesForAdmin } from "@/modules/expenses/queries";

export const dynamic = "force-dynamic";

export default async function AdminExpenseCategoriesPage() {
  const categories = await getExpenseCategoriesForAdmin();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <ExpenseCategoriesAdmin categories={categories} />
    </main>
  );
}
