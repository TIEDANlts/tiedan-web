import { db } from "@/lib/db";
import { groupLinksByGroup } from "@/modules/links/utils";

export async function getLinks() {
  return db.link.findMany({
    orderBy: [{ group: "asc" }, { sort: "asc" }, { title: "asc" }],
  });
}

export async function getGroupedLinks() {
  return groupLinksByGroup(await getLinks());
}
