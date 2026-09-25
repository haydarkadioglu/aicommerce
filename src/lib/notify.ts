import { db } from "@/lib/db";

/**
 * Send a notification to a user. Returns the created Notification.
 * Use this helper anywhere in the backend — auth, orchestrator,
 * job runner, marketplaces, etc. — to surface events to the user.
 */
export async function notify(input: {
  userId: string;
  type?: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type || "info",
        title: input.title,
        message: input.message,
        link: input.link || null,
      },
    });
  } catch {
    // Never throw on notification failure
  }
}
