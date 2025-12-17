// Note entity types
export interface Note {
    id: number;
    title: string;
    content: string;
    category_id: number | null;
    is_private: boolean;
    created_at: string;
    updated_at: string;
}

export interface NoteWithCategory extends Note {
    category_name?: string;
    category_color?: string;
}

export interface CreateNoteInput {
    title: string;
    content?: string;
    category_id?: number;
    is_private?: boolean;
}

export interface UpdateNoteInput {
    title?: string;
    content?: string;
    category_id?: number;
    is_private?: boolean;
}
