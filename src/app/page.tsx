import { AnalysisList } from "@/components/AnalysisList";
import { AppHeader } from "@/components/AppHeader";
import { SummaryCards } from "@/components/SummaryCards";

export default function HomePage() {
  return (
    <main>
      <AppHeader actionHref="/assets" actionLabel="管理" />
      <SummaryCards />
      <AnalysisList />
    </main>
  );
}
