import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

type UnknownRecord = Record<string, unknown>;

export type KnowledgeArticleSummary = {
  id: string;
  title: string;
  excerpt?: string;
  group?: string;
  order?: number;
};

export type KnowledgeArticleDetail = KnowledgeArticleSummary & {
  content: string;
};

function mapSummary(row: UnknownRecord): KnowledgeArticleSummary {
  return {
    id: String(row._id ?? row.id ?? ''),
    title: String(row.title ?? 'Article'),
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : undefined,
    group: typeof row.group === 'string' ? row.group : undefined,
    order: typeof row.order === 'number' ? row.order : undefined,
  };
}

export const knowledgeService = {
  async list(): Promise<KnowledgeArticleSummary[]> {
    const { data } = await api.get<{ articles?: UnknownRecord[] }>(API.knowledge.list);
    const rows = (data.articles ?? []).map(mapSummary);
    rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
    return rows;
  },

  async getById(id: string): Promise<KnowledgeArticleDetail> {
    const { data } = await api.get<UnknownRecord>(API.knowledge.byId(id));
    return {
      ...mapSummary(data),
      content: typeof data.content === 'string' ? data.content : '',
    };
  },
};
