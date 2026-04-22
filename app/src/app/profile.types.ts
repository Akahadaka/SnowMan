export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export type ProfilesMap = Record<string, Profile>;
