# Auditoria de Storage: Políticas de Upload e Privacidade (Prompt 09)

Este documento define a governança de arquivos no FIXXER, garantindo que dados sensíveis nunca sejam expostos via URLs públicas.

## 1. Matriz de Exposição
| Conteúdo | Bucket | Acesso | Expiração |
| :--- | :--- | :--- | :--- |
| Avatar / Banner | `avatars` | Público | N/A |
| Documentos (RG/CNPJ) | `documents-private` | Assinado | 1 hora |
| Evidências de Disputa | `disputes-private` | Assinado | 24 horas |
| Comprovantes Financeiros| `finance-private` | Assinado | 1 hora |

## 2. Refatoração de Código
- **`uploadWithProgress`**: Adicionado parâmetro `isPrivate`. Se `true`, retorna `signedUrl` em vez de `publicUrl`.
- **Prevenção**: Bloqueio de novos uploads privados em buckets públicos.

## 3. Migração de URLs Legadas
- URLs `http` legadas devem ser mapeadas para os novos buckets.
- Conteúdo privado que estava em buckets públicos deve ser movido para buckets privados com RLS restritivo.

## 4. Checklist de Validação
- [ ] Usuário A consegue acessar `documents-private/user-B/rg.jpg`? (Deve falhar)
- [ ] O sistema aceita arquivo `.exe` renomeado para `.jpg`? (Validar MIME Real)
- [ ] URLs assinadas param de funcionar após expiração?
- [ ] O path traversal `../` é impedido na geração do `filePath`?
