# Espaço Lumière

Site + agenda online + agente de IA no WhatsApp para o Espaço Lumière (lash designer, massagem, body piercing e sobrancelhas). Instagram: [@espacolumiiere](https://instagram.com/espacolumiiere).

**Stack:** Next.js (App Router) · Postgres (Neon) · Vercel · Claude API (WhatsApp).

## O que existe

| Parte | Onde |
|---|---|
| Site (início, serviços, estilos de cílios, tabela de valores, endereços) | `app/page.tsx` |
| Agenda interativa para clientes | `app/agendar/` |
| Ver/cancelar um agendamento pelo link | `app/agendamento/[token]/` |
| Painel da equipe (agenda do dia por profissional, profissionais, horários, datas em Natal, folgas, preços) | `app/admin/` (senha) |
| Agente de IA no WhatsApp | `app/api/whatsapp/route.ts`, `lib/agent.ts` |
| Regras de horário sem conflito | `lib/booking.ts`, `lib/slots.ts`, `db/schema.sql` |
| Serviços, preços, textos e horários iniciais | `lib/content.ts` |

## Como a agenda evita conflito de horário

1. Os horários livres são calculados no servidor a partir das janelas de atendimento, da duração do serviço e dos agendamentos existentes.
2. Ao reservar, o servidor recalcula e só aceita um horário que ainda esteja livre.
3. **Garantia final no banco:** uma *exclusion constraint* do Postgres (`appointments_no_overlap`) recusa qualquer reserva que se sobreponha a outra do mesmo profissional. Mesmo com duas pessoas clicando no mesmo instante, só uma vence; a outra recebe "horário acabou de ser reservado".
4. Site, WhatsApp e agendamento manual do painel usam a mesma função, então compartilham a mesma agenda.

**Profissionais:** cada profissional tem agenda própria (horários, datas em Natal e folgas) e atende as categorias que você marcar. Dois atendimentos nunca se sobrepõem para a mesma profissional, mas profissionais diferentes atendem ao mesmo tempo. Na agenda online a cliente escolhe a profissional ou "sem preferência" (o sistema usa a primeira livre, na ordem de cadastro). Cadastre-as em `/admin` > Profissionais; elas aparecem na seção "Profissionais" do site. Só a Livia Melo (lash) vem cadastrada; as demais precisam ser criadas, senão massagem, piercing e sobrancelhas ficam sem horários.

### Dias e locais

- **Horário semanal** (ex.: Angicos, terça a sábado): painel > Horários e datas.
- **Datas específicas em Natal**: nessas datas o horário semanal é *substituído* pelo que você cadastrar. O calendário do site marca esses dias com um ponto e mostra o endereço de Natal.
- **Folgas/feriados**: bloqueiam o dia inteiro.
- Cada janela pode ser restrita a categorias (ex.: massagem só às quintas).

## Colocando no ar

### 1. Banco (Neon)
1. Crie o projeto na Vercel (passo 3) e, em **Storage**, adicione **Neon (Postgres)**. A variável `DATABASE_URL` é criada sozinha.
2. Copie `.env.example` para `.env.local` e cole a `DATABASE_URL`.
3. `npm run db:setup` cria as tabelas e carrega serviços, endereços e os horários padrão de Angicos. Pode rodar de novo sem perder dados.

### 2. GitHub
```bash
git init && git add . && git commit -m "Espaço Lumière"
gh repo create espaco-lumiere --private --source . --push
```

### 3. Vercel
Importe o repositório em vercel.com/new. Cadastre as variáveis do `.env.example` (no mínimo `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`). Cada `git push` publica de novo.

### 4. Primeiro acesso
Abra `/admin`, confira os **preços e durações** (os valores de massagem, piercing e sobrancelhas estão como "Sob consulta"), ajuste os **horários semanais** e cadastre as **datas de Natal**.

## Agente de IA no WhatsApp

A cliente conversa no WhatsApp; a assistente (Claude) consulta a agenda real, oferece horários, confirma os dados e reserva. Ela só enxerga e cancela agendamentos do número que está conversando, e chama a equipe (`request_human`) para dúvidas de saúde, descontos ou reclamações, pausando por 12 h naquela conversa.

Configuração (WhatsApp Cloud API da Meta):
1. Em developers.facebook.com, crie um app **Business** e adicione o produto **WhatsApp**. Registre o número do espaço (ele deixa de funcionar no app comum de WhatsApp do celular).
2. Gere um **token permanente** (usuário do sistema) e anote o **Phone number ID**.
3. Em WhatsApp > Configuration > Webhook: URL `https://SEU-SITE/api/whatsapp`, token de verificação igual a `WHATSAPP_VERIFY_TOKEN`, e assine o campo **messages**.
4. Cadastre `ANTHROPIC_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` na Vercel e faça um novo deploy.

Notas:
- O modelo padrão é `claude-opus-5-5` com esforço baixo (respostas rápidas). Troque com `ANTHROPIC_MODEL`.
- Respostas livres só podem ser enviadas dentro de 24 h após a última mensagem da cliente. Lembretes proativos (ex.: "amanhã é seu horário") exigem *templates* aprovados pela Meta e ainda não estão implementados.

## Imagens

Fotos em `public/images/` (nomes fixos):

| Arquivo | Uso | Origem |
|---|---|---|
| `lash-brasileiro.jpg` | Volume Brasileiro | [Pexels 9409695](https://www.pexels.com/photo/9409695/) |
| `lash-egipcio.jpg` | Volume Egípcio | [Pexels 3657418](https://www.pexels.com/photo/3657418/) |
| `lash-glamour.jpg` | Volume Glamour | [Pexels 32039798](https://www.pexels.com/photo/32039798/) |
| `lash-luxo.jpg` | Volume Luxo | [Pexels 21412169](https://www.pexels.com/photo/21412169/) |
| `manutencao.jpg` | Seção Manutenção | [Pexels 8554941](https://www.pexels.com/photo/8554941/) |

São fotos de banco de imagens gratuito (licença Pexels: uso comercial permitido, sem atribuição obrigatória). **São ilustrativas**, não trabalhos do espaço, e só a do Luxo mostra extensão profissional de fato. Troque pelas fotos reais da Livia mantendo os mesmos nomes de arquivo (proporção 3:4). A legenda "Imagem ilustrativa" fica em `app/page.tsx`; remova quando usar fotos próprias.

Fotos das profissionais: coloque em `public/profissionais/` e informe o caminho (ex.: `/profissionais/ana.jpg`) em `/admin` > Profissionais.

## Desenvolvimento

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # regras de geração de horários
npm run typecheck
```

Sem `DATABASE_URL`, a página inicial funciona com o conteúdo padrão, mas agenda e painel precisam do banco.

`npm run test:booking` testa as regras reais de agendamento (profissionais, escolha, Natal, folgas, reservas simultâneas) num Postgres em memória.

`npm run test:schema` roda o schema num Postgres em memória e comprova que o banco recusa horários sobrepostos (inclui teste com 3 reservas simultâneas).
