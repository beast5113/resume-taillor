export interface Prompt {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Context {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DocxTemplate {
  id: string;
  name: string;
  storage_path: string;
  variables: string[];   // extracted <<variable>> names
  created_at: string;
  updated_at: string;
}
