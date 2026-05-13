# ProspecLead Skill - Regras e Convenções do Projeto

## Regras de Segurança
- **NUNCA delete colunas ou tabelas existentes do banco Supabase**
- **NUNCA delete arquivos existentes** - apenas editar/adicionar
- **Sempre fazer backup antes de qualquer alteração no banco**
- **Usar migrations para alterar schema** - nunca fazer DROP sem confirmar
- **Preservar dados existentes** em qualquer operação

## Estrutura do Projeto
```
src/
├── components/
│   ├── ui/           # Componentes shadcn/ui (Button, Input, Card, etc)
│   └── *.tsx        # Componentes personalizados
├── pages/
│   ├── admin/        # Páginas administrativas (/admin/*)
│   ├── rh/           # Páginas RH (/rh/*)
│   └── *.tsx        # Páginas principais
├── hooks/            # Custom hooks (useAuth, useSync, etc)
├── lib/             # Utilitários (utils, format, whatsapp)
└── supabase/
    └── functions/   # Edge Functions Deno
```

## Convenções de Código

### Nomenclatura
- **Componentes**: PascalCase (AdminDashboard.tsx, LeadList.tsx)
- **Hooks**: camelCase com prefixo "use" (useAuth.tsx, useSync.tsx)
- **Funções utilitárias**: camelCase (formatDate, generateSlug)
- **Arquivos CSS/Tailwind**: kebab-case (meu-estilo.css)

### Padrões React
- Usar **TypeScript** em todos os arquivos
- Props com tipagem explícita
- Usar **shadcn/ui** para componentes base
- **Functional components** apenas
- Usar **React Query** para fetching (useQuery, useMutation)

### Padrões Backend (Supabase)
- Edge Functions em **Deno**
- Tabelas com **RLS** (Row Level Security)
- Triggers para **audit trail**
- Funções RPC para operações complexas

### Padrões UI
- **TailwindCSS** para estilos
- shadcn/ui para componentes base
- **lucide-react** para ícones
- **Sonner** para toasts
- **dark mode** suportado

## Commands Úteis

### Criar nova página
1. Criar arquivo em src/pages/[Nome].tsx
2. Importar no App.tsx
3. Adicionar rota em Routes

### Criar tabela no banco
1. Criar migration em supabase/migrations/
2. Executar com supabase db push
3. Adicionar RLS policies

### Criar Edge Function
1. Criar pasta em supabase/functions/[nome]/
2. Escrever código Deno
3. Deploy com supabase functions deploy [nome]

## Workflow para Editar

### 1. Analisar existente
- Ler arquivos relacionados
- Verificar banco de dados
- Entender contexto antes de mudar

### 2. Implementar mudança
- Adicionar apenas o necessário
- Testar localmente (npm run dev)
- Não quebrar funcionalidades existentes

### 3. Verificar
- Run npm run build para checar erros
- Verificar se lint passa
- Testar funcionalidades relacionadas

### 4. Deploy para Lovable
- Fazer commit das mudanças
- Push para repositório
- Lovable detecta automaticamente

## Tabelas do Banco (EXISTENTES - NÃO DELETAR)
- users (id, email, name, role, etc)
- leads (id, nome, telefone, email, etc)
- wallet_entries (id, user_id, valor, tipo, etc)
- checkins (id, user_id, local, foto, etc)
- promoter_products (id, promoter_id, produto_id, etc)
- products (id, nome, preco, etc)
- saques (id, user_id, valor, status, etc)
- kyc_documents (id, user_id, documento, status, etc)
- etc...

## Boas Práticas
- Sempre tipar dados (TypeScript)
- Usar constants para valores mágicos
- Comentar código complexo
- Separar responsabilidades
- Tratamento de erros adequado
- Loading states para operações async