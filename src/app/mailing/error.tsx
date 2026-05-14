"use client";

import { PageError } from "@/components/shell/page-error";

export default function MailingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError routeLabel="Mailing" {...props} />;
}
