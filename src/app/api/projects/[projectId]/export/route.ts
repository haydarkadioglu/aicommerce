import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * Export a project as JSON or CSV.
 * Path: GET /api/projects/[projectId]/export?format=csv|json
 *
 * CSV flattens the products into a marketplace-friendly format (one row
 * per product). JSON returns the full project + products.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:projects:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { projectId } = await params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "json").toLowerCase();

  const project = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { products: { orderBy: { createdAt: "asc" } } },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await logger.audit({
    userId: user.id,
    action: "commerce.project.export",
    category: "commerce",
    resourceId: project.id,
    metadata: { format, productCount: project.products.length },
  });

  const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, "_");

  if (format === "csv") {
    const headers = [
      "title",
      "description",
      "category",
      "price",
      "currency",
      "sku",
      "status",
      "tags",
      "marketplace",
      "created_at",
    ];
    const escape = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = project.products.map((p) => {
      let tags: string[] = [];
      if (p.tags) {
        try {
          tags = JSON.parse(p.tags);
        } catch {
          // ignore
        }
      }
      return [
        escape(p.title),
        escape(p.description),
        escape(p.category),
        escape(p.price),
        escape(p.currency),
        escape(p.sku),
        escape(p.status),
        escape(tags.join("|")),
        escape(project.marketplace),
        escape(p.createdAt.toISOString()),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.csv"`,
      },
    });
  }

  // Default: JSON
  const payload = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      marketplace: project.marketplace,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    products: project.products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      tags: p.tags ? safeParse(p.tags) : [],
      price: p.price,
      currency: p.currency,
      sku: p.sku,
      status: p.status,
      metadata: p.metadata ? safeParse(p.metadata) : null,
      createdAt: p.createdAt,
    })),
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.json"`,
    },
  });
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
