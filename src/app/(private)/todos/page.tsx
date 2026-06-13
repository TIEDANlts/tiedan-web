import { TodosBoard } from "@/app/(private)/todos/todos-board";
import { getTodosPageData } from "@/modules/todos/queries";

export default async function TodosPage() {
  const data = await getTodosPageData();

  return <TodosBoard data={data} />;
}
