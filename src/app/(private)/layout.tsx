import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrivateShell } from "@/components/app-shell";

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <PrivateShell>{children}</PrivateShell>;
}
