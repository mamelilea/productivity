// Custom Type entity types - for reusable custom types in tasks and schedules
export type CustomTypeEntity = 'TASK' | 'SCHEDULE';

export interface CustomType {
    id: number;
    name: string;
    entity_type: CustomTypeEntity;
    created_at: string;
}

export interface CreateCustomTypeInput {
    name: string;
    entity_type: CustomTypeEntity;
}
