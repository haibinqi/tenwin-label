import type { CodeTemplate, CodeBatch, CodeItem } from "../app/types";

interface CloudflareEnvironment {
  DB: D1Database;
  CACHE: KVNamespace;
}

// Database helper
class Database {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async getTemplates(): Promise<CodeTemplate[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM code_templates ORDER BY created_at DESC'
    ).all<CodeTemplate>();
    return results || [];
  }

  async createTemplate(template: Omit<CodeTemplate, 'created_at'>): Promise<void> {
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

  async updateTemplate(id: string, template: Partial<CodeTemplate>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    
    if (template.name !== undefined) { fields.push('name = ?'); values.push(template.name); }
    if (template.type !== undefined) { fields.push('type = ?'); values.push(template.type); }
    if (template.prefix !== undefined) { fields.push('prefix = ?'); values.push(template.prefix); }
    if (template.padding_length !== undefined) { fields.push('padding_length = ?'); values.push(template.padding_length); }
    if (template.remark !== undefined) { fields.push('remark = ?'); values.push(template.remark); }
    
    if (fields.length === 0) return;
    
    values.push(id);
    await this.db.prepare(
      `UPDATE code_templates SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM code_templates WHERE id = ?').bind(id).run();
  }

  async getBatches(limit = 100): Promise<CodeBatch[]> {
    const { results } = await this.db.prepare(
      `SELECT * FROM code_batches ORDER BY created_at DESC LIMIT ?`
    ).bind(limit).all<CodeBatch>();
    return results || [];
  }

  async createBatch(batch: CodeBatch): Promise<void> {
    await this.db.prepare(
      `INSERT INTO code_batches (id, template_id, start_number, end_number, count, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      batch.id,
      batch.template_id,
      batch.start_number,
      batch.end_number,
      batch.count,
      batch.status
    ).run();
  }

  async voidBatch(id: string): Promise<void> {
    await this.db.prepare(
      "UPDATE code_batches SET status = 'void' WHERE id = ?"
    ).bind(id).run();
  }

  async createCodeItems(items: Omit<CodeItem, 'id'>[]): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT INTO code_items (batch_id, serial_number, code_text)
       VALUES (?, ?, ?)`
    );
    
    const batch = items.map(item => 
      stmt.bind(item.batch_id, item.serial_number, item.code_text)
    );
    
    await this.db.batch(batch);
  }

  async getTodayCount(): Promise<number> {
    const result = await this.db.prepare(
      `SELECT SUM(count) as total FROM code_batches 
       WHERE date(created_at) = date('now')`
    ).first<{ total: number }>();
    return result?.total || 0;
  }

  async getActiveBatchCount(): Promise<number> {
    const result = await this.db.prepare(
      "SELECT COUNT(*) as total FROM code_batches WHERE status = 'active'"
    ).first<{ total: number }>();
    return result?.total || 0;
  }

  async getTemplateCount(): Promise<number> {
    const result = await this.db.prepare(
      'SELECT COUNT(*) as total FROM code_templates'
    ).first<{ total: number }>();
    return result?.total || 0;
  }
}

// Handle API requests
async function handleRequest(request: Request, env: CloudflareEnvironment): Promise<Response> {
  const url = new URL(request.url);
  const db = new Database(env.DB);

  // Handle API routes
  if (url.pathname === '/api/templates') {
    if (request.method === 'GET') {
      const templates = await db.getTemplates();
      return Response.json({ templates });
    }
    
    if (request.method === 'POST') {
      const data = await request.json();
      await db.createTemplate({
        id: Date.now().toString(),
        name: data.name,
        type: data.type,
        prefix: data.prefix || '',
        padding_length: data.padding_length || 5,
        remark: data.remark || '',
      });
      return Response.json({ success: true });
    }
  }

  if (url.pathname.startsWith('/api/templates/')) {
    const id = url.pathname.split('/').pop();
    if (!id) return new Response('Not found', { status: 404 });

    if (request.method === 'PUT') {
      const data = await request.json();
      await db.updateTemplate(id, data);
      return Response.json({ success: true });
    }

    if (request.method === 'DELETE') {
      await db.deleteTemplate(id);
      return Response.json({ success: true });
    }
  }

  if (url.pathname === '/api/batches') {
    if (request.method === 'GET') {
      const batches = await db.getBatches();
      return Response.json({ batches });
    }
    
    if (request.method === 'POST') {
      const data = await request.json();
      // Create batch logic here
      return Response.json({ success: true });
    }
  }

  if (url.pathname === '/api/stats') {
    const [todayCount, activeBatches, templateCount] = await Promise.all([
      db.getTodayCount(),
      db.getActiveBatchCount(),
      db.getTemplateCount(),
    ]);
    return Response.json({ todayCount, activeBatches, templateCount });
  }

  // For all other routes, return the index.html for client-side routing
  // This assumes the static files are served by Pages
  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(
    request: Request,
    env: CloudflareEnvironment,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      // Check if it's a static asset request
      const url = new URL(request.url);
      if (url.pathname.startsWith('/assets/')) {
        return new Response('Not found', { status: 404 }); // Let Pages handle static assets
      }

      // Handle API requests
      if (url.pathname.startsWith('/api/')) {
        return await handleRequest(request, env);
      }

      // For page requests, return the appropriate HTML file
      // Pages will serve the static files
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return Response.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      );
    }
  },
};
