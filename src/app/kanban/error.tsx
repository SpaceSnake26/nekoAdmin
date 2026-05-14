"use client";

import { PageError } from "@/components/shell/page-error";

export default function KanbanError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError routeLabel="Kanban" {...props} />;
}
