import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

export type ServiceCategory = {
  id: string;
  name: string;
  description?: string;
};

type UnknownRecord = Record<string, unknown>;

export const categoryService = {
  async list(): Promise<ServiceCategory[]> {
    const { data } = await api.get<UnknownRecord[]>(API.categories.list);
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((row) => ({
      id: String(row._id ?? row.id ?? ''),
      name: String(row.name ?? 'Category'),
      description: typeof row.description === 'string' ? row.description : undefined,
    }));
  },
};
