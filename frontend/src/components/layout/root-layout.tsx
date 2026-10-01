import { Outlet } from "react-router";
import { Header } from "./header";
import { Footer } from "./footer";
import { PageTransition } from "@/components/common/page-transition";

/** Public / marketing shell: header + content + footer. */
export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
}
