import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">{children}</main>
  );
}
