# 📋 INSTRUÇÕES DE DEPLOYMENT - PsiCare

## ✅ Mudanças Implementadas

Todos os 6 problemas críticos foram corrigidos:

### 1. ✅ Chave Supabase em Variáveis de Ambiente
- Arquivo `.env.local` criado (para desenvolvimento)
- `config.js` atualizado para ler variáveis
- `.gitignore` configurado para proteger `.env.local`

### 2. ✅ Proteção contra XSS (Injeção de Script)
- Arquivo `security.js` criado com função `escapeHtml()`
- Todos os módulos atualizados para usar `escapeHtml()`
- Nomes de pacientes, CPF, texto agora são escapados

### 3. ✅ Correção de Template Injection
- Mudado de `onclick="função('${variável}')"` para **data attributes**
- Event listeners adicionados para maior segurança
- Protege contra XSS e injeção de código

### 4. ✅ Validação de Arquivo
- Arquivo `security.js` inclui `validateFile()`
- Máximo 5MB, tipos permitidos apenas: PDF, DOC, XLSX, JPG, PNG
- Upload será bloqueado se arquivo não passar na validação

### 5. ✅ Bug de Edição de Paciente
- Agora preenche CPF e Valor ao editar (não era preenchido antes)
- Usuário vê dados completos ao editar

### 6. ✅ Script.js Deletado
- Arquivo obsoleto removido
- Codebase limpo

---

## 🚀 PRÓXIMOS PASSOS

### 1. Adicionar Variáveis de Ambiente no Vercel

**Obrigatório antes de fazer deploy!**

1. Vá para seu projeto no Vercel: https://vercel.com/dashboard
2. Click em **Settings** → **Environment Variables**
3. Adicione estas 2 variáveis:

```
VITE_SUPABASE_URL=https://ezutgtfynlvbgbqmpqyb.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dXRndGZ5bmx2YmdicW1wcXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDMyODcsImV4cCI6MjA5NDIxOTI4N30.t1VcyLhhfe8n_l_YDUgkx6u-YGm_PpDG7lALE52loaE
```

4. **Regenerar chave no Supabase** (recomendado - a chave atual foi exposta)
   - Vá para https://app.supabase.com
   - Seu projeto → **Settings** → **API**
   - Clique em **Regenerate** perto de "anon public"
   - Copie a chave nova
   - Atualize a variável no Vercel

5. Clique em **Redeploy** no Vercel para aplicar mudanças

### 2. Verificar Row Level Security (RLS) no Supabase

**Crítico para privacidade!**

1. Vá para https://app.supabase.com (seu projeto)
2. Para **cada tabela** (`pacientes`, `consultas`, `sessoes`, `prontuarios`, `perfis`):
   - Click na tabela
   - Abra aba **RLS** (deve estar AZUL/ATIVADO)
   - Verifique se tem policy que filtra por `psicologa_id = auth.uid()`

Se não tiver:
- Click em **"New Policy"** → **"For authenticated users"**
- Escolha **SELECT**, **INSERT**, **UPDATE**, **DELETE**
- Coloque na expressão:
  ```sql
  psicologa_id = auth.uid()
  ```

### 3. Testar Segurança Localmente

Antes de fazer deploy, teste:

```bash
# 1. Deletar script.js se ainda existir
rm script.js

# 2. Começar desenvolvimento
npm run dev  (ou vite ou o que usar)

# 3. Tentar:
# - Logar como psicóloga A
# - Ver se consegue ver dados de psicóloga B (não deveria conseguir!)
# - Tentar fazer upload de arquivo.exe (deveria ser bloqueado)
# - Tentar injetar <img onerror="alert('xss')"> em nome de paciente (não deve executar)
```

### 4. Fazer Deploy

```bash
git add .
git commit -m "🔒 Corrigir vulnerabilidades de segurança críticas"
git push origin main  # ou branch que usa no Vercel
```

---

## 📊 Checklist Final

- [ ] `.env.local` criado com variáveis
- [ ] Variáveis adicionadas no Vercel
- [ ] Chave Supabase regenerada (opcional mas recomendado)
- [ ] RLS verificado/configurado no Supabase
- [ ] Teste local realizado
- [ ] Commit + Push feito
- [ ] Vercel fez redeploy automático
- [ ] Verificar em produção: https://seu-site.vercel.app

---

## ⚠️ IMPORTANTE

- **Nunca faça commit de .env.local** (arquivo está no .gitignore)
- **Nunca compartilhe a VITE_SUPABASE_KEY** em público
- **Se a chave for comprometida**, regenere no Supabase imediatamente
- **Teste todo fluxo antes de liberar para psicólogas usarem**

---

## 🆘 Problemas Comuns

### "VITE_SUPABASE_KEY não está definido"
→ Adicione a variável no Vercel em Environment Variables

### "Não consegue logar após deploy"
→ Verifique se as variáveis estão corretas no Vercel

### "Consegue ver dados de outro psicólogo"
→ RLS não está configurado no Supabase. Ative!

### "Arquivo malicioso foi aceito no upload"
→ Limpe a pasta de documentos no Supabase Storage

---

## 📞 Suporte

Se tiver problema:
1. Verificar console (F12 → Console)
2. Verificar Vercel logs
3. Verificar Supabase logs
4. Checar que variáveis estão no Vercel

Sucesso! 🎉
