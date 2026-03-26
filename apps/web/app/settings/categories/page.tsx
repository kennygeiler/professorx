import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CategoryManager } from "@/components/categories/category-manager";

export default async function CategoriesSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <CategoryManager />
      </div>
    </div>
  );
}
