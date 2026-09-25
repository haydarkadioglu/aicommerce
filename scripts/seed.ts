/**
 * Seed script — bootstraps the platform with system roles,
 * permissions, AI agents, default AI provider, default prompts,
 * feature flags and the default admin user.
 *
 * Run with: `bun run db:seed`
 */

import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

async function seed() {
  console.log("🌱 Seeding AI Commerce OS…");

  // ---- Permissions ----
  const permissionDefs = [
    { key: "ai:chat", name: "Use AI chat", category: "ai" },
    { key: "ai:agents:list", name: "List AI agents", category: "ai" },
    { key: "ai:usage:read", name: "View own AI usage", category: "ai" },
    { key: "ai:memory:manage", name: "Manage own AI memory", category: "ai" },
    { key: "ai:conversations:read", name: "View own conversations", category: "ai" },
    { key: "commerce:projects:manage", name: "Manage own projects", category: "commerce" },
    { key: "commerce:products:manage", name: "Manage own products", category: "commerce" },
    { key: "account:profile:edit", name: "Edit own profile", category: "account" },
    { key: "account:apikeys:manage", name: "Manage own API keys", category: "account" },

    { key: "admin:users:read", name: "View users", category: "admin" },
    { key: "admin:users:write", name: "Manage users", category: "admin" },
    { key: "admin:roles:read", name: "View roles & permissions", category: "admin" },
    { key: "admin:roles:write", name: "Manage roles & permissions", category: "admin" },
    { key: "admin:providers:read", name: "View AI providers", category: "admin" },
    { key: "admin:providers:write", name: "Manage AI providers", category: "admin" },
    { key: "admin:prompts:read", name: "View prompts", category: "admin" },
    { key: "admin:prompts:write", name: "Manage prompts", category: "admin" },
    { key: "admin:agents:read", name: "View AI agents", category: "admin" },
    { key: "admin:agents:write", name: "Manage AI agents", category: "admin" },
    { key: "admin:logs:read", name: "View audit & system logs", category: "admin" },
    { key: "admin:usage:read", name: "View all AI usage", category: "admin" },
    { key: "admin:flags:write", name: "Manage feature flags", category: "admin" },
    { key: "admin:settings:write", name: "Manage platform settings", category: "admin" },
    { key: "admin:jobs:read", name: "View background jobs", category: "admin" },
    { key: "admin:plans:write", name: "Manage subscription plans", category: "admin" },
    { key: "admin:notifications:broadcast", name: "Broadcast notifications", category: "admin" },
  ];

  for (const p of permissionDefs) {
    await db.permission.upsert({
      where: { key: p.key },
      create: p,
      update: { name: p.name, category: p.category },
    });
  }
  console.log(`  ✓ ${permissionDefs.length} permissions`);

  // ---- Roles ----
  const adminRole = await db.role.upsert({
    where: { key: "admin" },
    create: {
      key: "admin",
      name: "Administrator",
      description: "Full platform access (system role)",
      isSystem: true,
    },
    update: {},
  });
  const userRole = await db.role.upsert({
    where: { key: "user" },
    create: {
      key: "user",
      name: "User",
      description: "Standard platform user (system role)",
      isSystem: true,
    },
    update: {},
  });

  // Assign ALL permissions to admin role
  const allPerms = await db.permission.findMany();
  for (const p of allPerms) {
    await db.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: p.id },
      },
      create: { roleId: adminRole.id, permissionId: p.id },
      update: {},
    });
  }

  // Assign user-facing permissions to user role
  const userPerms = allPerms.filter((p) => !p.key.startsWith("admin:"));
  for (const p of userPerms) {
    await db.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: userRole.id, permissionId: p.id },
      },
      create: { roleId: userRole.id, permissionId: p.id },
      update: {},
    });
  }
  console.log(`  ✓ ${allPerms.length} role-permission mappings`);

  // ---- Default admin user ----
  const adminEmail = "admin@ai-commerce.os";
  const adminPassword = "AdminPass123";
  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    const admin = await db.user.create({
      data: {
        email: adminEmail,
        name: "Platform Admin",
        passwordHash: await hashPassword(adminPassword),
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    await db.userRoleAssignment.create({
      data: { userId: admin.id, roleId: adminRole.id },
    });
    console.log(`  ✓ Default admin: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log("  ✓ Default admin already exists");
  }

  // ---- Default AI Provider (z-ai, bundled) ----
  const zaiProvider = await db.aiProvider.upsert({
    where: { key: "zai" },
    create: {
      key: "zai",
      name: "Z.AI (bundled)",
      description: "Default provider via z-ai-web-dev-sdk",
      isActive: true,
      isDefault: true,
      capabilities: "text,vision",
    },
    update: { isDefault: true, isActive: true },
  });
  await db.aiModel.upsert({
    where: {
      providerId_modelId: {
        providerId: zaiProvider.id,
        modelId: "glm-4.6",
      },
    },
    create: {
      providerId: zaiProvider.id,
      modelId: "glm-4.6",
      displayName: "GLM-4.6",
      contextWindow: 128000,
      capabilities: "text,vision",
      isActive: true,
      isDefault: true,
    },
    update: {},
  });
  await db.aiModel.upsert({
    where: {
      providerId_modelId: {
        providerId: zaiProvider.id,
        modelId: "glm-4.5",
      },
    },
    create: {
      providerId: zaiProvider.id,
      modelId: "glm-4.5",
      displayName: "GLM-4.5",
      contextWindow: 64000,
      capabilities: "text",
      isActive: true,
      isDefault: false,
    },
    update: {},
  });

  // Pre-registered (inactive) providers — admins can activate by
  // configuring base URL + API key.
  const inactiveProviders = [
    { key: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", caps: "text,vision,audio,embeddings,images" },
    { key: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", caps: "text,vision" },
    { key: "claude", name: "Anthropic Claude", baseUrl: "https://api.anthropic.com/v1", caps: "text,vision" },
    { key: "grok", name: "xAI Grok", baseUrl: "https://api.x.ai/v1", caps: "text" },
    { key: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", caps: "text,vision" },
    { key: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", caps: "text" },
    { key: "mistral", name: "Mistral", baseUrl: "https://api.mistral.ai/v1", caps: "text,embeddings" },
    { key: "cohere", name: "Cohere", baseUrl: "https://api.cohere.ai/v1", caps: "text,embeddings" },
  ];
  for (const p of inactiveProviders) {
    await db.aiProvider.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        name: p.name,
        baseUrl: p.baseUrl,
        isActive: false,
        isDefault: false,
        capabilities: p.caps,
      },
      update: {},
    });
  }
  console.log(`  ✓ ${inactiveProviders.length + 1} AI providers registered`);

  // ---- AI Agents ----
  const agentDefs = [
    { key: "general", name: "General Assistant", description: "General-purpose assistant for everyday tasks", category: "core", systemPromptKey: "system:general", capabilities: "chat,reasoning" },
    { key: "research", name: "Research Agent", description: "Discovers profitable products and analyzes markets", category: "commerce", systemPromptKey: "system:research", capabilities: "research,web" },
    { key: "seo", name: "SEO Agent", description: "Generates SEO-optimized titles, tags & descriptions", category: "commerce", systemPromptKey: "system:seo", capabilities: "seo,keywords" },
    { key: "trend", name: "Trend Agent", description: "Analyzes market trends and seasonality", category: "commerce", systemPromptKey: "system:trend", capabilities: "trends,analytics" },
    { key: "listing", name: "Listing Agent", description: "Generates marketplace-optimized listings", category: "commerce", systemPromptKey: "system:listing", capabilities: "listing,copywriting" },
    { key: "supplier", name: "Supplier Agent", description: "Finds suppliers and negotiates terms", category: "commerce", systemPromptKey: "system:supplier", capabilities: "sourcing" },
    { key: "profit", name: "Profit Agent", description: "Calculates profitability and margins", category: "commerce", systemPromptKey: "system:profit", capabilities: "finance" },
    { key: "pricing", name: "Pricing Agent", description: "Recommends competitive pricing strategies", category: "commerce", systemPromptKey: "system:pricing", capabilities: "pricing" },
    { key: "similarity", name: "Similarity Agent", description: "Detects similar products and IP risks", category: "commerce", systemPromptKey: "system:similarity", capabilities: "ip,detection" },
    { key: "vision", name: "Vision Agent", description: "Analyzes product images", category: "commerce", systemPromptKey: "system:vision", capabilities: "image-analysis" },
    { key: "prompt", name: "Prompt Agent", description: "Optimizes prompts for other agents", category: "core", systemPromptKey: "system:prompt", capabilities: "prompt-engineering" },
    { key: "strategy", name: "Strategy Agent", description: "Builds long-term commerce strategy", category: "commerce", systemPromptKey: "system:strategy", capabilities: "strategy,business" },
  ];
  for (const a of agentDefs) {
    await db.aiAgent.upsert({
      where: { key: a.key },
      create: a as any,
      update: { name: a.name, description: a.description, systemPromptKey: a.systemPromptKey, capabilities: a.capabilities },
    });
  }
  console.log(`  ✓ ${agentDefs.length} AI agents`);

  // ---- Prompts (versioned) ----
  const promptDefs: { key: string; name: string; description?: string; category: string; agentType?: string; content: string }[] = [
    {
      key: "system:general",
      name: "General Assistant system prompt",
      description: "Default system prompt for the General Assistant.",
      category: "system",
      agentType: "general",
      content:
        "You are the General Assistant of an AI Commerce Operating System.\nHelp the user with everyday tasks across product research, listings, SEO, and strategy.\nBe concise, professional, and actionable. When relevant, ask clarifying questions before producing artifacts.\nFormat answers in Markdown.",
    },
    {
      key: "system:research",
      name: "Research Agent system prompt",
      description: "Default system prompt for the Research Agent.",
      category: "system",
      agentType: "research",
      content:
        "You are the Research Agent of an AI Commerce Operating System.\nYour job is to discover profitable products, identify market gaps, and surface opportunities for Etsy and other marketplaces.\nAlways respond with structured output: idea name, brief rationale, target audience, search-volume estimate, competition level (low/medium/high), and next steps.\nUse Markdown headings and bullet lists.",
    },
    {
      key: "system:seo",
      name: "SEO Agent system prompt",
      category: "system",
      agentType: "seo",
      content:
        "You are the SEO Agent. Produce SEO-optimized marketplace content.\nFor every request, return: 5 title candidates (under 140 chars), 13 tags (each ≤ 20 chars, comma-separated), a meta description (under 160 chars), and 10 long-tail keywords.\nAvoid keyword stuffing. Match Etsy/E-commerce search intent.",
    },
    {
      key: "system:trend",
      name: "Trend Agent system prompt",
      category: "system",
      agentType: "trend",
      content:
        "You are the Trend Agent. Analyze market trends, seasonality, and emerging niches.\nFor every report, return: trend name, momentum (rising / stable / declining), drivers, recommended action, and 3 example products to test.",
    },
    {
      key: "system:listing",
      name: "Listing Agent system prompt",
      category: "system",
      agentType: "listing",
      content:
        "You are the Listing Agent. Produce a marketplace-ready listing for {{marketplace}}.\nReturn JSON with: title, description (markdown), price_range, tags[], materials[], personalized boolean, shipping_profile, and seo_keywords[].\nUse the provided product context:\n{{productContext}}",
    },
    {
      key: "system:supplier",
      name: "Supplier Agent system prompt",
      category: "system",
      agentType: "supplier",
      content:
        "You are the Supplier Agent. Source suppliers for the requested product.\nReturn: supplier_type (manufacturer / dropshipper / wholesaler), country, MOQ, unit_cost_range, lead_time_days, and reliability_score (0-1).",
    },
    {
      key: "system:profit",
      name: "Profit Agent system prompt",
      category: "system",
      agentType: "profit",
      content:
        "You are the Profit Agent. Compute profitability for the given product.\nReturn JSON: unit_cost, shipping_cost, marketplace_fee_pct, payment_fee_pct, suggested_price, gross_margin_pct, break_even_units, and profit_per_unit.\nInputs: {{inputs}}",
    },
    {
      key: "system:pricing",
      name: "Pricing Agent system prompt",
      category: "system",
      agentType: "pricing",
      content:
        "You are the Pricing Agent. Recommend a competitive pricing strategy.\nReturn: suggested_price, anchor_price, psychological_price, bundle_suggestion, and a short rationale.",
    },
    {
      key: "system:similarity",
      name: "Similarity Agent system prompt",
      category: "system",
      agentType: "similarity",
      content:
        "You are the Similarity Agent. Detect similar products and IP risks.\nReturn: similar_products[], risk_level (none/low/medium/high), recommended_action.",
    },
    {
      key: "system:vision",
      name: "Vision Agent system prompt",
      category: "system",
      agentType: "vision",
      content:
        "You are the Vision Agent. Analyze product images and return: detected_objects, dominant_colors, aesthetic_tags, marketability_score (0-1), and improvement_suggestions[].",
    },
    {
      key: "system:prompt",
      name: "Prompt Agent system prompt",
      category: "system",
      agentType: "prompt",
      content:
        "You are the Prompt Agent. Improve prompts for other agents.\nReturn the improved prompt and a brief explanation of the changes.",
    },
    {
      key: "system:strategy",
      name: "Strategy Agent system prompt",
      category: "system",
      agentType: "strategy",
      content:
        "You are the Strategy Agent. Build long-term commerce strategy.\nReturn: vision, 3-month milestones, key risks, and 5 KPIs to track.",
    },
  ];

  for (const p of promptDefs) {
    const prompt = await db.prompt.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        name: p.name,
        description: p.description,
        category: p.category,
        agentType: p.agentType,
        isActive: true,
      },
      update: { name: p.name, description: p.description },
    });
    const hasCurrent = await db.promptVersion.findFirst({
      where: { promptId: prompt.id, isCurrent: true },
    });
    if (!hasCurrent) {
      await db.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: 1,
          content: p.content,
          isCurrent: true,
          variables: JSON.stringify([]),
          notes: "Initial version",
          createdBy: "system",
        },
      });
    }
  }
  console.log(`  ✓ ${promptDefs.length} prompts`);

  // ---- Feature Flags ----
  const flagDefs = [
    { key: "ai_assistant", name: "AI Assistant", description: "Enable the conversational AI assistant module", enabled: true },
    { key: "product_research", name: "Product Research", description: "Enable the Product Research module", enabled: true },
    { key: "listing_generator", name: "Listing Generator", description: "Enable the Listing Generator module", enabled: true },
    { key: "image_studio", name: "Image Studio", description: "Enable the Image Studio module", enabled: false },
    { key: "video_studio", name: "Video Studio", description: "Enable the Video Studio module", enabled: false },
    { key: "profit_calculator", name: "Profit Calculator", description: "Enable the Profit Calculator module", enabled: true },
    { key: "trend_analysis", name: "Trend Analysis", description: "Enable the Trend Analysis module", enabled: false },
    { key: "marketplace_etsy", name: "Etsy Marketplace", description: "Enable Etsy marketplace connector", enabled: true },
    { key: "marketplace_shopify", name: "Shopify Marketplace", description: "Enable Shopify marketplace connector (future)", enabled: false },
    { key: "marketplace_amazon", name: "Amazon Marketplace", description: "Enable Amazon marketplace connector (future)", enabled: false },
  ];
  for (const f of flagDefs) {
    await db.featureFlag.upsert({
      where: { key: f.key },
      create: f,
      update: { name: f.name, description: f.description },
    });
  }
  console.log(`  ✓ ${flagDefs.length} feature flags`);

  // ---- Subscription Plans ----
  const planDefs = [
    { key: "free", name: "Free", description: "For trying the platform", priceMonthly: 0, priceYearly: 0, isDefault: true, limits: { aiCallsPerMonth: 100, projects: 3, marketplaces: 1 } },
    { key: "pro", name: "Pro", description: "For serious sellers", priceMonthly: 29, priceYearly: 290, limits: { aiCallsPerMonth: 5000, projects: 50, marketplaces: 3 } },
    { key: "business", name: "Business", description: "For growing teams", priceMonthly: 99, priceYearly: 990, limits: { aiCallsPerMonth: 50000, projects: 500, marketplaces: 10 } },
    { key: "enterprise", name: "Enterprise", description: "Custom scale", priceMonthly: 499, priceYearly: 4990, limits: { aiCallsPerMonth: 1000000, projects: -1, marketplaces: -1 } },
  ];
  for (const p of planDefs) {
    await db.subscriptionPlan.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        isActive: true,
        isDefault: p.isDefault || false,
        limits: JSON.stringify(p.limits),
      },
      update: {
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        limits: JSON.stringify(p.limits),
      },
    });
  }
  console.log(`  ✓ ${planDefs.length} subscription plans`);

  // ---- Platform settings ----
  const settings = [
    { key: "platform.name", value: "AI Commerce OS", category: "general" },
    { key: "platform.tagline", value: "The AI Operating System for E-commerce", category: "general" },
    { key: "platform.default_marketplace", value: "etsy", category: "commerce" },
    { key: "platform.signup_enabled", value: "true", category: "auth" },
    { key: "platform.max_free_ai_calls_per_day", value: "30", category: "commerce" },
  ];
  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value, category: s.category },
    });
  }
  console.log(`  ✓ ${settings.length} platform settings`);

  console.log("✅ Seed complete!");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
