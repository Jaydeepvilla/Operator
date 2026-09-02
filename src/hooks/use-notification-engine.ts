import { useTransition } from "react";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { dismissNotificationAction, markNotificationAsReadAction } from "@/app/actions/progress";

export function useNotificationEngine() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const dismissNotification = (id: string) => {
    startTransition(async () => {
      const result = await dismissNotificationAction(id);
      if (result.success) {
        toast.success("Notification dismissed", "The notification has been cleared.");
      } else {
        toast.error("Failed to dismiss notification", formatUserErrorMessage(result.error));
      }
    });
  };

  const markAsRead = (id: string) => {
    startTransition(async () => {
      const result = await markNotificationAsReadAction(id);
      if (!result.success) {
        toast.error("Failed to update notification", formatUserErrorMessage(result.error));
      }
    });
  };

  return {
    isPending,
    dismissNotification,
    markAsRead
  };
}
