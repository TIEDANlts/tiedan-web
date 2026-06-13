import { LinksAdmin } from "@/app/(private)/admin/links/links-admin";
import { getGroupedLinks } from "@/modules/links/queries";

export default async function AdminLinksPage() {
  const groups = await getGroupedLinks();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <LinksAdmin groups={groups} />
    </main>
  );
}
