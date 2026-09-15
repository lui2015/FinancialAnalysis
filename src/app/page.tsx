import { AnalysisList } from "@/components/AnalysisList";
import { AppHeader } from "@/components/AppHeader";
import { SummaryCards } from "@/components/SummaryCards";

export default function HomePage() {
  return (
    <main>
      <AppHeader />
      <SummaryCards />
      <AnalysisList />
    </main>
  );
}
