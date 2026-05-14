"use client";

import { PageError } from "@/components/shell/page-error";

export default function LeadsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError routeLabel="Leads" {...props} />;
}
