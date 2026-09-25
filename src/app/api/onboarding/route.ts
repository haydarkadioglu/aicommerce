import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";

/**
 * Onboarding progress — returns a checklist of "firsts" the user has
 * completed (first AI call, first listing, first project, first image).
 * Used by the dashboard's welcome card to guide new users.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  // Run all checks in parallel for speed
  const [
    aiCallCount,
    listingProductCount,
    projectCount,
    imageCount,
    conversationCount,
  ] = await Promise.all([
    db.aiUsage.count({
      where: { userId, endpoint: "chat", success: true },
    }),
    db.product.count({
      where: {
        project: { userId },
        status: "listing",
      },
    }),
    db.project.count({ where: { userId } }),
    db.aiUsage.count({
      where: { userId, endpoint: "image", success: true },
    }),
    db.aiConversation.count({ where: { userId } }),
  ]);

  const steps = [
    {
      key: "first-ai-call",
      title: "Make your first AI call",
      description: "Chat with any AI agent in the Assistant",
      completed: aiCallCount > 0,
      link: "ai-assistant",
      icon: "chat",
    },
    {
      key: "first-conversation",
      title: "Have a multi-turn conversation",
      description: "Send 2+ messages in the same chat",
      completed: conversationCount > 0,
      link: "ai-assistant",
      icon: "message",
    },
    {
      key: "first-listing",
      title: "Generate a listing",
      description: "Use the Listing Generator to create marketplace content",
      completed: listingProductCount > 0,
      link: "listing-generator",
      icon: "file",
    },
    {
      key: "first-image",
      title: "Generate a product image",
      description: "Use the Image Studio to create visuals",
      completed: imageCount > 0,
      link: "image-studio",
      icon: "image",
    },
    {
      key: "first-project",
      title: "Create a project",
      description: "Save your work into a project for later",
      completed: projectCount > 0,
      link: "saved-projects",
      icon: "folder",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const isComplete = completedCount === totalCount;
  // Consider "onboarding" complete if user has done at least 3 of 5 steps
  const isOnboarding = completedCount < 3;

  return NextResponse.json({
    steps,
    completedCount,
    totalCount,
    isComplete,
    isOnboarding,
    stats: {
      aiCalls: aiCallCount,
      listings: listingProductCount,
      projects: projectCount,
      images: imageCount,
      conversations: conversationCount,
    },
  });
}
