import { MediaLibrary } from "@/app/(private)/media/media-library";
import { getMediaPageData, type MediaSearchParams } from "@/modules/media/queries";

export const dynamic = "force-dynamic";

export default async function MediaPage({ searchParams }: { searchParams: Promise<MediaSearchParams> }) {
  const data = await getMediaPageData(await searchParams);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <MediaLibrary data={data} />
    </main>
  );
}
