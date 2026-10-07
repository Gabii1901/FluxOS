# Checkout e planos pagos (Mercado Pago)

Data: 2026-10-07

## Objetivo

Depois que uma empresa se cadastra no FluxOS, ela precisa escolher e pagar um
plano antes de usar o sistema. Quatro planos:

| Plano | Preço/mês | Módulos |
|---|---|---|
| Básico | R$ 69,90 | dashboard, usuários, clientes, ordens de serviço |
| Intermediário | R$ 89,90 | Básico + estoque |
| Avançado | R$ 119,90 | Tudo (+ orçamentos, financeiro) |
| Personalizado | sob consulta | Tudo, configurado manualmente (sem checkout) |

Gateway: **Mercado Pago**. Sem período trial — o acesso só libera com
pagamento confirmado.

## Fluxo geral

1. Cadastro da empresa (já existe) → confirmação de e-mail (já existe).
2. Usuário logado cuja empresa não está com assinatura ativa é redirecionado
   para `/app/escolher-plano`.
3. Escolhe um plano pago → escolhe forma de pagamento (cartão ou boleto) →
   se boleto, escolhe o dia de vencimento (1–28) → backend cria a cobrança no
   Mercado Pago → redireciona para o checkout deles.
4. Escolhe Personalizado → tela "fale conosco" (WhatsApp), sem checkout;
   empresa fica `pendente` até configuração manual.
5. Mercado Pago notifica pagamentos via **webhook** (nunca confiamos no
   retorno do navegador) → backend busca o pagamento na API deles e atualiza
   o status da empresa.
6. Acesso ao sistema exige duas coisas independentes: e-mail confirmado
   (já existe) **e** assinatura `ativo` (novo).

## Formas de pagamento

- **Cartão**: assinatura recorrente de verdade (Mercado Pago "Preapproval")
  — eles debitam automaticamente todo mês, webhook avisa sucesso/falha.
- **Boleto**: sem auto-cobrança. Um job diário gera um boleto novo a cada
  ciclo, alguns dias antes do vencimento escolhido, e envia por e-mail
  (Resend). O boleto gerado pela API de Pagamentos do Mercado Pago já inclui
  QR Code/copia-e-cola Pix — mostrar as duas opções na tela. Carência de 3
  dias após o vencimento antes de marcar `inadimplente`.

## Modelo de dados

```prisma
enum PlanoSistema {
  basico
  intermediario
  avancado
  personalizado
}

enum StatusAssinatura {
  pendente
  ativo
  inadimplente
  cancelado
}

enum FormaPagamento {
  cartao
  boleto
}

model Empresa {
  // ...campos existentes
  plano            PlanoSistema      @default(pendente) // ver nota abaixo
  statusAssinatura StatusAssinatura  @default(pendente)
  formaPagamento   FormaPagamento?
  diaVencimento    Int?              // 1–28, só boleto
  mpAssinaturaId   String?           // preapproval id, só cartão

  cobrancas CobrancaPlano[]
}

model CobrancaPlano {
  id          String   @id @default(uuid())
  empresaId   String
  valor       Decimal  @db.Decimal(10, 2)
  vencimento  DateTime @db.Date
  status      String   // pendente | pago | vencido
  mpPagamentoId String?
  linkPagamento String?
  criadoEm    DateTime @default(now())

  empresa Empresa @relation(fields: [empresaId], references: [id], onDelete: Cascade)
}
```

Nota: `plano` precisa de um valor inicial neutro até a escolha — avaliar na
implementação se vira opcional (`PlanoSistema?`) em vez de ter um default
"pendente" artificial dentro do enum de planos.

## Backend

- `lib/mercadoPago.ts` — cliente da SDK oficial, usa `MERCADOPAGO_ACCESS_TOKEN`.
- `lib/planos.ts` — preço e módulos de cada plano num único lugar; função
  `moduloLiberadoNoPlano(plano, modulo)` usada antes da checagem de
  permissão do usuário (camada extra, não substitui o que já existe).
- `controllers/pagamentosController.ts`:
  - `POST /pagamentos/checkout` (autenticado)
  - `POST /pagamentos/webhook` (pública — recalcula tudo buscando na API do
    Mercado Pago, nunca confia no corpo recebido)
  - `GET /pagamentos/status` (autenticado)
- `lib/cronCobrancas.ts` — roda 1x/dia via `node-cron` dentro do próprio
  processo (sem mexer em cron do SO):
  - gera o boleto do ciclo alguns dias antes do vencimento e envia por e-mail;
  - marca `inadimplente` quem passou do vencimento + 3 dias.

## Frontend

- `/app/escolher-plano` — cards dos 4 planos; fluxo de forma de
  pagamento/vencimento; redireciona pro checkout do Mercado Pago.
- `/app/pagamento/retorno` — consulta `GET /pagamentos/status` em intervalos
  curtos até confirmar (webhook pode demorar alguns segundos); pra boleto,
  mostra "aguardando pagamento" com os dados do boleto/Pix.
- `RotaComAssinaturaAtiva` — mesmo padrão do `RotaProtegida` já existente,
  envolve as rotas internas; redireciona pra escolha de plano se a empresa
  não estiver `ativo`. `UsuarioLogado` passa a carregar `plano` e
  `statusAssinatura` no token/resposta de login, sem chamada extra.

## Casos de borda

- **Cartão recusado**: Mercado Pago tenta de novo automaticamente; se
  esgotar as tentativas, `inadimplente`.
- **Boleto vencido**: `inadimplente` após 3 dias de carência; o próximo
  ciclo é gerado normalmente na data certa.
- **Troca de plano**: cancela a cobrança atual e cria uma nova no plano
  escolhido; sem cobrança proporcional nesta primeira versão — o novo valor
  vale a partir do próximo ciclo, mas o acesso aos módulos muda na hora.
- **Cancelamento**: `statusAssinatura = cancelado`, perde acesso só no fim
  do período já pago.
- **Papel `desenvolvedor`**: sempre vê tudo, independente do plano da
  empresa (acesso interno/suporte).

## Fora de escopo (v1)

- Cobrança proporcional em troca de plano.
- Histórico/relatório de faturamento de assinaturas (além do
  `CobrancaPlano` básico).
- Múltiplas formas de pagamento simultâneas por empresa.
