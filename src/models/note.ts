// Note entity types
export interface Note {
    id: number;
    title: string;
    content: string;
    category_id: number | null;
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
}

export interface UpdateNoteInput {
    title?: string;
    content?: string;
    category_id?: number;
}
