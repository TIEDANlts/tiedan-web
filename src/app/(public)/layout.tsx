import { PublicShell } from "@/components/app-shell";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const icpBeianNo = process.env.ICP_BEIAN_NO?.trim();
  const gonganBeianNo = process.env.GONGAN_BEIAN_NO?.trim();

  return (
    <PublicShell icpBeianNo={icpBeianNo} gonganBeianNo={gonganBeianNo}>
      {children}
    </PublicShell>
  );
}
