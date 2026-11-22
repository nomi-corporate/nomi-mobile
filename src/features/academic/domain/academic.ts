export type Subject = {
  id: string;
  name: string;
  code?: string | null;
  colorToken?: string | null;
  iconKey?: string | null;
  professorIds?: string[];
  archived: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SubjectList = {
  items: Subject[];
  nextCursor: string | null;
};

export type CreateSubjectInput = {
  name: string;
  code?: string;
  colorToken?: string;
  iconKey?: string;
  professorIds?: string[];
};

export type Professor = {
  id: string;
  name: string;
  email: string | null;
  office: string | null;
  archived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfessorList = {
  items: Professor[];
  nextCursor: string | null;
};

export type CreateProfessorInput = {
  name: string;
  email?: string | null;
  office?: string | null;
};

export type UpdateProfessorInput = {
  name?: string;
  email?: string | null;
  office?: string | null;
};
