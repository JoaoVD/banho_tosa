import type { Papel } from '@/domain/types';

export type SessionUser = { id: string; lojaId: string; papel: Papel; nome: string };

export interface AuthProvider {
  currentUser(): Promise<SessionUser | null>;
  signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }>;
  signOut(): Promise<void>;
}

export const ERRO_LOGIN = 'E-mail ou senha incorretos.';
