import type { D1Database } from '@cloudflare/workers-types';
import type { CodeTemplate, CodeBatch, CodeBatchWithTemplate, CodeItem } from '~/types';

export class Database {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // ========== Templates ==========
  async getTemplates(): Promise<CodeTemplate[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM code_templates ORDER BY created_at DESC'
    ).all<CodeTemplate>();
    return results || [];
  }

  async getTemplate(id: string): Promise<CodeTemplate | null> {
    const result = await this.db.prepare(
      'SELECT * FROM code_templates WHERE id = ?'
    ).bind(id).first<CodeTemplate>();
    return result;
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

  // ========== Batches ==========
  async getBatches(limit = 100): Promise<CodeBatchWithTemplate[]> {
    const { results } = await this.db.prepare(
      `SELECT 
        b.*,
        t.name as template_name,
        t.prefix as template_prefix,
        t.padding_length as template_padding,
        t.type as template_type
       FROM code_batches b
       JOIN code_templates t ON b.template_id = t.id
       ORDER BY b.created_at DESC
       LIMIT ?`
    ).bind(limit).all<CodeBatchWithTemplate>();
    return results || [];
  }

  async getBatch(id: string): Promise<CodeBatchWithTemplate | null> {
    const result = await this.db.prepare(
      `SELECT 
        b.*,
        t.name as template_name,
        t.prefix as template_prefix,
        t.padding_length as template_padding,
        t.type as template_type
       FROM code_batches b
       JOIN code_templates t ON b.template_id = t.id
       WHERE b.id = ?`
    ).bind(id).first<CodeBatchWithTemplate>();
    return result;
  }

  async getLastBatchForTemplate(templateId: string): Promise<CodeBatch | null> {
    const result = await this.db.prepare(
      `SELECT * FROM code_batches 
       WHERE template_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`
    ).bind(templateId).first<CodeBatch>();
    return result;
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

  // ========== Code Items ==========
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

  async getCodeItems(batchId: string): Promise<CodeItem[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM code_items WHERE batch_id = ? ORDER BY serial_number'
    ).bind(batchId).all<CodeItem>();
    return results || [];
  }

  // ========== Stats ==========
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

// Helper to get DB instance from context
export function getDB(context: { DB: D1Database }): Database {
  return new Database(context.DB);
}
