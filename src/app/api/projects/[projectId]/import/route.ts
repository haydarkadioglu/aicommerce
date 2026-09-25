import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * Import products into an existing project from CSV or JSON.
 * Path: POST /api/projects/[projectId]/import
 *
 * Accepts a single product or an array of products:
 *   { products: [{ title, description?, category?, price?, tags?, status?, sku? }] }
 *
 * CSV is also supported — the body can be a CSV string with headers
 * title,description,category,price,currency,sku,status,tags
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:products:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { projectId } = await params;
  const project = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true, name: true, marketplace: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  let raw: any;
  try {
    if (contentType.includes("application/json")) {
      raw = await req.json();
    } else {
      raw = await req.text();
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let products: any[] = [];
  if (typeof raw === "string") {
    products = parseCsv(raw);
  } else if (Array.isArray(raw)) {
    products = raw;
  } else if (raw && Array.isArray(raw.products)) {
    products = raw.products;
  } else if (raw && raw.title) {
    products = [raw];
  } else {
    return NextResponse.json(
      {
        error:
          "Expected an array of products, { products: [...] }, or CSV text",
      },
      { status: 400 }
    );
  }

  if (products.length === 0) {
    return NextResponse.json({ error: "No products to import" }, { status: 400 });
  }
  if (products.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 products per import" },
      { status: 400 }
    );
  }

  const normalized: any[] = [];
  const errors: string[] = [];
  products.forEach((p, i) => {
    if (!p || typeof p !== "object") {
      errors.push(`Row ${i + 1}: not an object`);
      return;
    }
    const title = (p.title || p.name || "").toString().trim();
    if (!title) {
      errors.push(`Row ${i + 1}: missing title`);
      return;
    }
    if (title.length > 200) {
      errors.push(`Row ${i + 1}: title too long (max 200 chars)`);
      return;
    }
    let tags: string[] = [];
    if (typeof p.tags === "string") {
      const s = p.tags.trim();
      if (s.startsWith("[")) {
        try {
          tags = JSON.parse(s);
        } catch {
          tags = s
            .split(/[|,]/)
            .map((t) => t.trim())
            .filter(Boolean);
        }
      } else if (s.includes("|")) {
        tags = s
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (s.includes(",")) {
        tags = s
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (s) {
        tags = [s];
      }
    } else if (Array.isArray(p.tags)) {
      tags = p.tags.map((t) => String(t));
    }
    normalized.push({
      projectId,
      title,
      description: p.description ? String(p.description) : null,
      category: p.category ? String(p.category) : null,
      tags: tags.length ? JSON.stringify(tags) : null,
      price:
        typeof p.price === "number"
          ? p.price
          : typeof p.price === "string" && p.price
          ? Number(p.price)
          : null,
      currency: p.currency ? String(p.currency) : "USD",
      sku: p.sku ? String(p.sku) : null,
      status: p.status ? String(p.status) : "idea",
      metadata: null,
    });
  });

  if (normalized.length === 0) {
    return NextResponse.json(
      {
        error: "No valid products to import",
        validationErrors: errors,
      },
      { status: 400 }
    );
  }

  const created = await db.product.createMany({
    data: normalized,
  });

  await logger.audit({
    userId: user.id,
    action: "commerce.project.import",
    category: "commerce",
    resourceId: project.id,
    metadata: {
      projectName: project.name,
      imported: created.count,
      skipped: errors.length,
    },
  });

  return NextResponse.json({
    imported: created.count,
    skipped: errors.length,
    validationErrors: errors,
  });
}

function parseCsv(csv: string): any[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const products: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const obj: any = {};
    headers.forEach((h, j) => {
      obj[h] = cells[j] ?? "";
    });
    products.push(obj);
  }
  return products;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  cells.push(cur);
  return cells;
}
