import { describe, it, expect } from 'vitest';

// Mock simples para validar a lógica de decisão de redirecionamento
const getRedirectPath = (uid: string, isAdmin: boolean) => {
  if (isAdmin) {
    return '/_authenticated/admin';
  }
  return '/_authenticated/dashboard';
};

describe('Fluxo de Redirecionamento FIXXER', () => {
  it('deve redirecionar o administrador master para o painel admin', () => {
    const path = getRedirectPath('any-uid', true);
    expect(path).toBe('/_authenticated/admin');
  });

  it('deve redirecionar usuários comuns para o dashboard operacional', () => {
    const path = getRedirectPath('any-uid', false);
    expect(path).toBe('/_authenticated/dashboard');
  });
});
