"use client";

import { PageError } from "@/components/shell/page-error";

export default function NewsletterError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError routeLabel="Newsletter" {...props} />;
}
