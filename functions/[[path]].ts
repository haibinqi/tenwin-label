interface CloudflareEnvironment {
  DB: D1Database;
  CACHE: KVNamespace;
}

// Database helper class
class Database {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async createTemplate(template: any): Promise<void> {
    await this.db.prepare(
      `INSERT INTO code_templates (id, name, type, prefix, padding_length, remark)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      template.id,
      template.name,
      template.type,
      template.prefix,
      template.padding_length,
      template.remark
    ).run();
  }

  async updateTemplate(id: string, template: any): Promise<void> {
    await this.db.prepare(
      `UPDATE code_templates SET name = ?, type = ?, prefix = ?, padding_length = ?, remark = ? WHERE id = ?`
    ).bind(
      template.name,
      template.type,
      template.prefix,
      template.padding_length,
      template.remark,
      id
    ).run();
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM code_templates WHERE id = ?').bind(id).run();
  }
}

// Handle form actions
async function handleAction(request: Request, env: CloudflareEnvironment): Promise<Response> {
  const url = new URL(request.url);
  const db = new Database(env.DB);
  
  // Remove .data suffix for routing (React Router data requests)
  const pathname = url.pathname.replace(/\.data$/, '');
  
  try {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    // Handle template actions
    if (pathname === "/templates") {
      if (intent === "create") {
        await db.createTemplate({
          id: Date.now().toString(),
          name: formData.get("name") as string,
          type: formData.get("type") as string,
          prefix: formData.get("prefix") as string || "",
          padding_length: parseInt(formData.get("padding_length") as string) || 5,
          remark: formData.get("remark") as string || "",
        });
        return Response.json({ success: true });
      }
      
      if (intent === "update") {
        const id = formData.get("id") as string;
        await db.updateTemplate(id, {
          name: formData.get("name") as string,
          type: formData.get("type") as string,
          prefix: formData.get("prefix") as string || "",
          padding_length: parseInt(formData.get("padding_length") as string) || 5,
          remark: formData.get("remark") as string || "",
        });
        return Response.json({ success: true });
      }
      
      if (intent === "delete") {
        const id = formData.get("id") as string;
        await db.deleteTemplate(id);
        return Response.json({ success: true });
      }
    }

    // Default: return success
    return Response.json({ success: true });
  } catch (error) {
    console.error("Action error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}

export default {
  async fetch(
    request: Request,
    env: CloudflareEnvironment,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      // Let static assets be served by Pages
      if (url.pathname.startsWith("/assets/")) {
        return new Response("Not found", { status: 404 });
      }

      // Handle POST/PUT/DELETE requests (actions)
      if (request.method !== "GET" && request.method !== "HEAD") {
        return await handleAction(request, env);
      }

      // For GET requests, let Pages serve the static HTML
      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: String(error) }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },
};
