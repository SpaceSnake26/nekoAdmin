"use client";

import { PageError } from "@/components/shell/page-error";

export default function SimapError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError routeLabel="Ausschreibungen" {...props} />;
}
