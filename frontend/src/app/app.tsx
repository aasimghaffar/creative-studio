import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { PageLoader } from "@/components/common/page-loader";
import { router } from "./router";

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
