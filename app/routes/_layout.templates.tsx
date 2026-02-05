import { useState } from "react";
import { useLoaderData, useSubmit, Form } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { getDB } from "~/utils/db";
import type { CodeTemplate } from "~/types";

interface LoaderData {
  templates: CodeTemplate[];
}

export async function loader({ context }: LoaderFunctionArgs): Promise<LoaderData> {
  // 预渲染时可能没有数据库上下文
  if (!(context as { DB?: D1Database }).DB) {
    return { templates: [] };
  }
  
  const db = getDB(context as { DB: D1Database });
  const templates = await db.getTemplates();
  return { templates };
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    // 检查数据库上下文
    if (!(context as { DB?: D1Database }).DB) {
      return Response.json({ error: "数据库未配置，请在 Cloudflare 控制台创建 D1 数据库" }, { status: 500 });
    }
    
    const db = getDB(context as { DB: D1Database });
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    if (intent === "create" || intent === "update") {
      const template = {
        id: (formData.get("id") as string) || Date.now().toString(),
        name: formData.get("name") as string,
        type: formData.get("type") as "一维码" | "二维码",
        prefix: formData.get("prefix") as string,
        padding_length: parseInt(formData.get("padding_length") as string) || 5,
        remark: formData.get("remark") as string,
      };

      if (intent === "create") {
        await db.createTemplate(template);
      } else {
        await db.updateTemplate(template.id, template);
      }
    } else if (intent === "delete") {
      const id = formData.get("id") as string;
      await db.deleteTemplate(id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Action error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "操作失败" }, { status: 500 });
  }
}

export default function Templates() {
  const { templates } = useLoaderData<LoaderData>();
  const submit = useSubmit();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CodeTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openModal = (template?: CodeTemplate) => {
    setEditingTemplate(template || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    
    submit(formData, { method: "post" });
    closeModal();
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("id", deleteConfirm);
      submit(formData, { method: "post" });
      setDeleteConfirm(null);
    }
  };

  return (
    <>
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-10 border-b border-[#f1f1f1] bg-white">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          <h1 className="text-lg font-medium text-black">标签模板</h1>
        </div>
        <button 
          onClick={() => openModal()} 
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-sm text-xs hover:bg-slate-800 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          新建模板
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="border-t border-slate-100">
            {templates.length === 0 ? (
              <div className="py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">folder_open</span>
                <p className="text-sm text-slate-400 mb-4">暂无模板</p>
                <button onClick={() => openModal()} className="px-4 py-2 bg-black text-white text-xs rounded-sm">创建第一个模板</button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                    <th className="py-5 font-semibold w-[25%]">模板名称</th>
                    <th className="py-5 font-semibold w-[10%]">类型</th>
                    <th className="py-5 font-semibold w-[15%]">前缀</th>
                    <th className="py-5 font-semibold w-[10%]">填充长度</th>
                    <th className="py-5 font-semibold w-[25%]">备注</th>
                    <th className="py-5 font-semibold w-[15%] text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {templates.map((template) => (
                    <tr key={template.id} className="group hover:bg-[#fafafa] transition-colors border-b border-slate-50">
                      <td className="py-5 font-medium text-black">{template.name}</td>
                      <td className="py-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          template.type === '二维码' 
                            ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                            : 'bg-black text-white'
                        }`}>
                          {template.type}
                        </span>
                      </td>
                      <td className="py-5 font-mono text-[11px] text-slate-600">{template.prefix || '-'}</td>
                      <td className="py-5 text-slate-600">{template.padding_length}位</td>
                      <td className="py-5 text-slate-400 text-xs truncate">{template.remark || '-'}</td>
                      <td className="py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openModal(template)} 
                            className="p-1.5 text-slate-400 hover:text-black transition-colors"
                            title="编辑"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(template.id)} 
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="删除"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <footer className="h-16 flex-shrink-0 flex items-center justify-between px-10 border-t border-[#f1f1f1] bg-white text-[10px] text-slate-400 uppercase tracking-widest font-light">
        <p className="font-normal">© 2024 <span className="text-black font-medium">TENWIN SYSTEMS</span></p>
        <div className="flex gap-8">
          <a className="hover:text-black transition-colors" href="#">文档手册</a>
          <a className="hover:text-black transition-colors" href="#">技术支持</a>
        </div>
      </footer>

      {/* Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-medium text-black">{editingTemplate ? '编辑模板' : '新建模板'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-black transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input type="hidden" name="intent" value={editingTemplate ? "update" : "create"} />
              <input type="hidden" name="id" value={editingTemplate?.id || ''} />
              
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">模板名称</label>
                <input 
                  type="text" 
                  name="name" 
                  defaultValue={editingTemplate?.name || ''}
                  required 
                  className="w-full px-4 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-black" 
                  placeholder="例如：SKU-标准工业级"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">编码类型</label>
                  <select 
                    name="type" 
                    required 
                    defaultValue={editingTemplate?.type || '一维码'}
                    className="w-full px-4 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-black"
                  >
                    <option value="一维码">一维码 (CODE128)</option>
                    <option value="二维码">二维码 (QR Code)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">填充长度</label>
                  <input 
                    type="number" 
                    name="padding_length" 
                    min="1" 
                    max="20" 
                    defaultValue={editingTemplate?.padding_length || 5}
                    className="w-full px-4 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">前缀</label>
                <input 
                  type="text" 
                  name="prefix" 
                  defaultValue={editingTemplate?.prefix || ''}
                  className="w-full px-4 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-black font-mono" 
                  placeholder="例如：SKU-"
                />
                <p className="text-xs text-slate-400 mt-1">可选，将添加到序号前</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">备注</label>
                <textarea 
                  name="remark" 
                  rows={2} 
                  defaultValue={editingTemplate?.remark || ''}
                  className="w-full px-4 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-black resize-none" 
                  placeholder="模板用途说明..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={closeModal} 
                  className="px-4 py-2 border border-slate-200 rounded-sm text-xs text-slate-600 hover:border-black hover:text-black transition-all"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-sm text-xs hover:bg-slate-800 transition-all"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-amber-500">warning</span>
              <h3 className="text-lg font-medium text-black">确认删除</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">删除模板后，已生成的批次记录仍将保留，但无法再使用该模板生成新批次。</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="px-4 py-2 border border-slate-200 rounded-sm text-xs text-slate-600 hover:border-black hover:text-black transition-all"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 bg-red-600 text-white rounded-sm text-xs hover:bg-red-700 transition-all"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
