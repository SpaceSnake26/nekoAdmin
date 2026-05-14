"use client";

import { Check, Circle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  togglePaymentStatus,
  toggleTaskStatus,
} from "@/server/actions/letter-actions";

export function StatusToggles({
  letterId,
  paymentStatus,
  taskStatus,
  hasAmount,
  isTask,
}: {
  letterId: string;
  paymentStatus: string;
  taskStatus: string;
  hasAmount: boolean;
  isTask: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {hasAmount && paymentStatus !== "none" ? (
        <Button
          variant={paymentStatus === "paid" ? "secondary" : "default"}
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await togglePaymentStatus(letterId);
                toast.success(
                  paymentStatus === "paid"
                    ? "Als offen markiert"
                    : "Als bezahlt markiert",
                );
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : String(err),
                );
              }
            })
          }
        >
          {paymentStatus === "paid" ? (
            <Check className="size-3.5 mr-1.5" />
          ) : (
            <Circle className="size-3.5 mr-1.5" />
          )}
          {paymentStatus === "paid" ? "Bezahlt" : "Als bezahlt markieren"}
        </Button>
      ) : null}
      {isTask ? (
        <Button
          variant={taskStatus === "done" ? "secondary" : "default"}
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await toggleTaskStatus(letterId);
                toast.success(
                  taskStatus === "done" ? "Wieder offen" : "Erledigt",
                );
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : String(err),
                );
              }
            })
          }
        >
          {taskStatus === "done" ? (
            <Check className="size-3.5 mr-1.5" />
          ) : (
            <Circle className="size-3.5 mr-1.5" />
          )}
          {taskStatus === "done" ? "Erledigt" : "Als erledigt markieren"}
        </Button>
      ) : null}
    </div>
  );
}
