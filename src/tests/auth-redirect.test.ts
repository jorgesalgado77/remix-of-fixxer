import { describe, it, expect } from 'vitest';

// Mock simples para validar a lógica de decisão de redirecionamento
const getRedirectPath = (email: string, role: string) => {
  const masterAdmin = 'jorgericardosalgado@gmail.com';
  if (email.trim() === masterAdmin && role.toLowerCase() === 'admin') {
    return '/_authenticated/admin';
  }
  return '/_authenticated/dashboard';
};

describe('Fluxo de Redirecionamento FIXXER', () => {
  it('deve redirecionar o administrador master para o painel admin', () => {
    const path = getRedirectPath('jorgericardosalgado@gmail.com', 'admin');
    expect(path).toBe('/_authenticated/admin');
  });

  it('deve redirecionar o lojista para o dashboard operacional', () => {
    const path = getRedirectPath('confere2024@gmail.com', 'lojista');
    expect(path).toBe('/_authenticated/dashboard');
  });

  it('deve garantir que lojistas com role admin (se houver erro de atribuição) não acessem o painel master se o e-mail não bater', () => {
    const path = getRedirectPath('confere2024@gmail.com', 'admin');
    expect(path).toBe('/_authenticated/dashboard');
  });
});
