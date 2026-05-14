"use client";

import { PageError } from "@/components/shell/page-error";

export default function LinkedInError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError routeLabel="LinkedIn" {...props} />;
}
