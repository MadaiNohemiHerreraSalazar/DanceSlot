# DanceSlot - Reserva de salas de dança

Sistema para os professores da companhia reservarem as salas de ensaio e de aula.
A companhia funciona **de segunda a domingo, das 6h às 23h**.


## Como rodar

```bash
cd backend
npm install
npm start
```

Abra http://localhost:3000. Na primeira execução o banco (`backend/database.sqlite`) é criado
com 4 salas e 3 professores de exemplo (senha de todos: `danca123`):

| Professor      | E-mail               |
| -------------- | -------------------- |
| Amanda Ribeiro | amanda@danceslot.com |
| Bruno Teixeira | bruno@danceslot.com  |
| Carla Mendes   | carla@danceslot.com  |

> Se você já tinha um `database.sqlite` da versão anterior, ele é migrado automaticamente:
> a tabela antiga fica guardada como `agendamentos_antigos` e a nova é criada.

## Gerenciar logins (somente funcionários acessam)

Não existe cadastro público. Quem cria os logins é a administração da companhia:

```bash
npm run usuarios -- listar
npm run usuarios -- criar "Nome do Professor" email@companhia.com senha123
npm run usuarios -- desativar email@companhia.com   # bloqueia o acesso na hora
npm run usuarios -- ativar email@companhia.com
```

## Regras implementadas

- **Login obrigatório**: toda rota da API (exceto `POST /api/auth/login`) exige token. A sessão dura 8 horas.
- **Sem choque de horário**: uma sala reservada num horário não pode ser reservada por outro professor
  naquele mesmo horário. A verificação é feita no servidor, em uma única instrução SQL
  (`INSERT ... WHERE NOT EXISTS`), então dois professores clicando ao mesmo tempo não conseguem
  reservar a mesma sala. Reservas coladas (ex.: 14h-16h e 16h-17h) são permitidas.
- **Horário de funcionamento**: reservas em horas cheias, de 6h a 23h, no mesmo dia.
- **Não reserva no passado**: horários que já passaram ficam bloqueados.
- **Cada professor só altera as próprias reservas**: editar ou cancelar reserva de outro professor retorna 403.
  O dono da reserva vem sempre do login, nunca do que o navegador envia.
- Senhas guardadas com hash (scrypt) e 5 tentativas erradas bloqueiam o login por 1 minuto.

## Estrutura

```
backend/
  server.js
  scripts/usuarios.js            gerenciar logins
  src/
    app.js
    config/database.js           tabelas: usuarios, salas, agendamentos
    middleware/auth.js           exige login
    models/                      usuarioModel, salaModel, agendamentoModel (regras de horário)
    controllers/                 authController, salaController, agendamentoController
    routes/                      authRoutes, salaRoutes, agendamentoRoutes
    utils/                       senha.js (hash), token.js (sessão)
frontend/
  index.html  css/styles.css  js/api.js  js/app.js
```

## API

| Método | Rota                              | Descrição                                   |
| ------ | --------------------------------- | ------------------------------------------- |
| POST   | /api/auth/login                   | `{ email, senha }` → `{ token, usuario }`   |
| GET    | /api/auth/me                      | usuário logado                              |
| GET    | /api/salas                        | lista as salas                              |
| GET    | /api/agendamentos?de=AAAA-MM-DD&ate=AAAA-MM-DD | reservas de todos no período   |
| GET    | /api/agendamentos/minhas          | reservas futuras do professor logado        |
| POST   | /api/agendamentos                 | `{ titulo, sala_id, data_hora_inicio, data_hora_fim }` (409 se ocupado) |
| PUT    | /api/agendamentos/:id             | altera reserva própria                      |
| DELETE | /api/agendamentos/:id             | cancela reserva própria                     |

Data e hora no formato `AAAA-MM-DDTHH:00`. O envio do token é `Authorization: Bearer <token>`.

## Observações

- "Horário que já passou" usa o relógio do computador onde o servidor roda.
- O segredo das sessões é gerado na primeira execução em `backend/.segredo` (não compartilhe nem versione).
  Em produção, defina a variável `SEGREDO_TOKEN`.
