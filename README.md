# Lugar de Ser — Espaço Terapêutico ✿
### Sistema de Gestão Clínica para Psicólogas

Este é um ecossistema digital desenvolvido para simplificar a gestão de clínicas de psicologia, unindo prontuário clínico, agenda inteligente e controle financeiro em uma interface moderna e segura.

---

## 🚀 Funcionalidades Principais

- **Painel de Controle (Início):** Resumo em tempo real de pacientes ativos, sessões semanais e saúde financeira (recebidos vs. pendentes).
- **Gestão de Pacientes:** Cadastro completo com histórico, CPF (paciente e responsável) e controle de valor de sessão por paciente.
- **Prontuário Digital Avançado:**
  - Registro de evoluções clínicas por sessão.
  - **Sistema de Anexos Seguro:** Upload de documentos (PDFs, imagens) diretamente no prontuário.
  - Segurança de dados com links assinados (Signed URLs) que expiram automaticamente.
- **Agenda Inteligente:** Controle de horários com filtros por dia e semana, permitindo visão clara da ocupação.
- **Módulo Financeiro:** Registro de sessões realizadas, controle de status de pagamento (Pago/Pendente) e indicação de emissão de recibo para convênios.
- **Relatórios Gerenciais:** Geração automática de relatórios mensais formatados para exportação e declaração de IR.

---

## 🛠️ Stack Tecnológica

- **Frontend:** HTML5, CSS3 (Design Boho Chic personalizado) e JavaScript Vanilla.
- **Backend-as-a-Service:** [Supabase](https://supabase.com/)
  - **Auth:** Autenticação robusta e sistema de convites para novas profissionais.
  - **Database:** PostgreSQL com Row Level Security (RLS) para isolamento de dados.
  - **Storage:** Armazenamento seguro de documentos médicos.
  - **Edge Functions / Triggers:** Automação de criação de perfis e validações de integridade.

---

## 🔒 Segurança e Arquitetura (Visão Senior)

O projeto foi construído seguindo as melhores práticas de segurança para dados sensíveis (em conformidade com princípios da LGPD):

1.  **Isolamento de Dados (RLS):** Cada psicóloga possui acesso exclusivo aos seus próprios pacientes e registros. As políticas de segurança no nível do banco garantem que uma profissional não possa ler ou gravar dados de outra.
2.  **Proteção de Anexos:** Os documentos médicos são armazenados em Buckets privados. O sistema gera **Signed URLs** temporárias, garantindo que o link do documento só funcione para a profissional logada e expire após o uso.
3.  **Triggers de Integridade:** Gatilhos automatizados no Postgres garantem que toda nova conta de autenticação crie automaticamente um perfil vinculado, mantendo a consistência do sistema.

---

## ⚙️ Configuração do Ambiente Supabase

Para o correto funcionamento do sistema, é necessário configurar as seguintes tabelas e buckets no seu projeto Supabase:

### Tabelas (Esquema Public)
- `perfis`: (id, nome, crp, email)
- `pacientes`: (id, nome, cpf, cpf_responsavel, valor_sessao, telefone, psicologa_id)
- `consultas`: (id, paciente_id, psicologa_id, data, hora, observacao)
- `sessoes`: (id, paciente_id, psicologa_id, data, valor, status_pagamento, status_receita)
- `prontuarios`: (id, paciente_id, psicologa_id, data, texto)

### Storage
- Criar bucket: `documentos-pacientes` (Privado).
- Aplicar políticas de RLS para `SELECT` e `INSERT` para usuários autenticados.

---

## ✒️ Customização e Estilo

O sistema utiliza uma paleta de cores **Boho Chic**, focada em proporcionar um ambiente calmo e profissional. As variáveis de estilo estão centralizadas no arquivo `style.css` para facilitar a manutenção da identidade visual.

---
*Desenvolvido com foco em ética profissional e eficiência clínica.*
