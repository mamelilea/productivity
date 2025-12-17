// Category entity types
export type CategoryType = 'TASK' | 'NOTE';

export interface Category {
    id: number;
    name: string;
    type: CategoryType;
    color: string;
    created_at: string;
}

export interface CreateCategoryInput {
    name: string;
    type: CategoryType;
    color?: string;
}

export interface UpdateCategoryInput {
    name?: string;
    color?: string;
}
