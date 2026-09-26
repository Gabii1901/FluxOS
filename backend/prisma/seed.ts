import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.create({
    data: { nome: "Oficina do João", plano: "trial" },
  });

  const senhaHash = await bcrypt.hash("123456", 10);

  const [admin, tecnico, atendente] = await Promise.all([
    prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nome: "Ana Souza",
        email: "ana@fluxos.dev",
        senhaHash,
        papel: "admin",
      },
    }),
    prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nome: "Carlos Lima",
        email: "carlos@fluxos.dev",
        senhaHash,
        papel: "colaborador",
      },
    }),
    prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nome: "Bianca Rocha",
        email: "bianca@fluxos.dev",
        senhaHash,
        papel: "colaborador",
      },
    }),
  ]);

  const clientesData = [
    { nome: "Maria Silva", telefone: "11988887777", email: "maria@example.com" },
    { nome: "Pedro Santos", telefone: "11977776666", email: "pedro@example.com" },
    { nome: "Loja Alvorada Ltda", telefone: "1133334444", documento: "12.345.678/0001-90" },
  ];

  const clientes = [];
  for (const dados of clientesData) {
    clientes.push(await prisma.cliente.create({ data: { ...dados, empresaId: empresa.id } }));
  }

  const itemNotebook = await prisma.itemAtendimento.create({
    data: {
      empresaId: empresa.id,
      clienteId: clientes[0].id,
      tipo: "equipamento",
      descricao: "Notebook Dell Inspiron 15",
      identificador: "SN-8843921",
    },
  });

  const ordensData = [
    {
      clienteId: clientes[0].id,
      itemId: itemNotebook.id,
      tecnicoId: tecnico.id,
      status: "em_diagnostico" as const,
      problemaRelatado: "Notebook não liga, sem sinal de energia.",
    },
    {
      clienteId: clientes[1].id,
      tecnicoId: tecnico.id,
      status: "aguardando_aprovacao" as const,
      problemaRelatado: "Troca de tela quebrada do celular.",
    },
    {
      clienteId: clientes[2].id,
      tecnicoId: tecnico.id,
      status: "em_execucao" as const,
      problemaRelatado: "Manutenção preventiva em 3 impressoras da loja.",
      prioridade: "alta" as const,
    },
    {
      clienteId: clientes[0].id,
      status: "entregue" as const,
      problemaRelatado: "Limpeza e troca de pasta térmica.",
    },
    {
      clienteId: clientes[1].id,
      status: "aberta" as const,
      problemaRelatado: "Bateria não segura carga.",
    },
  ];

  for (const dados of ordensData) {
    const os = await prisma.ordemServico.create({
      data: { ...dados, empresaId: empresa.id, atendenteId: atendente.id },
    });

    await prisma.osStatusHistorico.create({
      data: { osId: os.id, statusNovo: "aberta", usuarioId: atendente.id },
    });

    if (os.status !== "aberta") {
      await prisma.osStatusHistorico.create({
        data: {
          osId: os.id,
          statusAnterior: "aberta",
          statusNovo: os.status,
          usuarioId: tecnico.id,
        },
      });
    }
  }

  console.log("Seed concluído.");
  console.log(`Empresa: ${empresa.nome} (${empresa.id})`);
  console.log("Login de teste: ana@fluxos.dev / 123456");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
