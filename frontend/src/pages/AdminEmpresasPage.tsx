import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { PLANO_LABEL, type Plano, type StatusAssinatura } from "../types/auth";

interface EmpresaResumo {
  id: string;
  nome: string;
  cnpj: string | null;
  plano: Plano | null;
  statusAssinatura: StatusAssinatura;
  formaPagamento: "cartao" | "boleto" | null;
  valorPersonalizado: string | null;
  criadoEm: string;
}

const campo = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const rotulo = "mb-1 block text-sm font-medium text-slate-700";

const STATUS_LABEL: Record<StatusAssinatura, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  inadimplente: "Inadimplente",
  cancelado: "Cancelado",
};

export function AdminEmpresasPage() {
  const [view, setView] = useState<"lista" | "criar-empresa" | "cobranca">("lista");
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaResumo | null>(null);

  async function carregarEmpresas() {
    setCarregando(true);
    try {
      const resposta = await api.get<EmpresaResumo[]>("/admin/empresas");
      setEmpresas(resposta.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarEmpresas();
  }, []);

  if (view === "criar-empresa") {
    return (
      <CriarEmpresaForm
        onCancelar={() => setView("lista")}
        onCriada={() => {
          setView("lista");
          carregarEmpresas();
        }}
      />
    );
  }

  if (view === "cobranca" && empresaSelecionada) {
    return (
      <CobrancaPersonalizadaForm
        empresa={empresaSelecionada}
        onCancelar={() => setView("lista")}
        onCriada={() => {
          setView("lista");
          carregarEmpresas();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Empresas (admin)</h1>
        <button
          type="button"
          onClick={() => setView("criar-empresa")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nova empresa
        </button>
      </div>

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Assinatura</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {empresas.map((empresa) => (
                <tr key={empresa.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{empresa.nome}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {empresa.plano ? PLANO_LABEL[empresa.plano] : "—"}
                    {empresa.valorPersonalizado && ` (R$ ${Number(empresa.valorPersonalizado).toFixed(2)})`}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        empresa.statusAssinatura === "ativo"
                          ? "bg-green-100 text-green-700"
                          : empresa.statusAssinatura === "inadimplente"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_LABEL[empresa.statusAssinatura]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{empresa.formaPagamento ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEmpresaSelecionada(empresa);
                        setView("cobranca");
                      }}
                      className="text-xs font-medium text-slate-900 underline"
                    >
                      Configurar cobrança
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CriarEmpresaForm({ onCancelar, onCriada }: { onCancelar: () => void; onCriada: () => void }) {
  const [empresaNome, setEmpresaNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [adminNome, setAdminNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminSenha, setAdminSenha] = useState("");

  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resposta.json();
      if (!dados.erro) {
        setLogradouro(dados.logradouro);
        setBairro(dados.bairro);
        setCidade(dados.localidade);
        setUf(dados.uf);
      }
    } catch {
      // segue com preenchimento manual
    }
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.post("/admin/empresas", {
        empresaNome,
        cnpj: cnpj || undefined,
        admin: { nome: adminNome, email: adminEmail, senha: adminSenha },
        endereco: { cep, logradouro, numero, complemento: complemento || undefined, bairro, cidade, uf },
      });
      onCriada();
    } catch (erro: any) {
      setErro(erro?.response?.data?.erro ?? "Não foi possível criar a empresa.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <button type="button" onClick={onCancelar} className="mb-4 text-xs font-medium text-slate-500 hover:text-slate-900">
        ← Voltar
      </button>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Nova empresa</h1>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4">
          <label className={rotulo}>Nome da empresa</label>
          <input required value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} className={campo} />
        </div>
        <div className="mb-4">
          <label className={rotulo}>CNPJ (opcional)</label>
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={campo} />
        </div>

        <p className="mb-3 mt-5 text-sm font-medium text-slate-700">Responsável (vai receber o login)</p>
        <div className="mb-4">
          <label className={rotulo}>Nome</label>
          <input required value={adminNome} onChange={(e) => setAdminNome(e.target.value)} className={campo} />
        </div>
        <div className="mb-4">
          <label className={rotulo}>E-mail</label>
          <input required type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className={campo} />
        </div>
        <div className="mb-4">
          <label className={rotulo}>Senha</label>
          <input required type="password" minLength={6} value={adminSenha} onChange={(e) => setAdminSenha(e.target.value)} className={campo} />
        </div>

        <p className="mb-3 mt-5 text-sm font-medium text-slate-700">Endereço</p>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>CEP</label>
            <input required value={cep} onChange={(e) => setCep(e.target.value)} onBlur={(e) => buscarCep(e.target.value)} className={campo} />
          </div>
          <div>
            <label className={rotulo}>Número</label>
            <input required value={numero} onChange={(e) => setNumero(e.target.value)} className={campo} />
          </div>
        </div>
        <div className="mb-4">
          <label className={rotulo}>Rua</label>
          <input required value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className={campo} />
        </div>
        <div className="mb-4">
          <label className={rotulo}>Complemento (opcional)</label>
          <input value={complemento} onChange={(e) => setComplemento(e.target.value)} className={campo} />
        </div>
        <div className="mb-4">
          <label className={rotulo}>Bairro</label>
          <input required value={bairro} onChange={(e) => setBairro(e.target.value)} className={campo} />
        </div>
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={rotulo}>Cidade</label>
            <input required value={cidade} onChange={(e) => setCidade(e.target.value)} className={campo} />
          </div>
          <div>
            <label className={rotulo}>UF</label>
            <input required maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} className={campo} />
          </div>
        </div>

        {erro && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {enviando ? "Criando..." : "Criar empresa"}
        </button>
      </form>
    </div>
  );
}

function CobrancaPersonalizadaForm({
  empresa,
  onCancelar,
  onCriada,
}: {
  empresa: EmpresaResumo;
  onCancelar: () => void;
  onCriada: () => void;
}) {
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<"cartao" | "boleto">("cartao");
  const [diaVencimento, setDiaVencimento] = useState(10);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ checkoutUrl?: string; boleto?: { linkPagamento?: string } } | null>(null);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await api.post(`/admin/empresas/${empresa.id}/cobranca`, {
        valor: Number(valor.replace(",", ".")),
        formaPagamento,
        diaVencimento: formaPagamento === "boleto" ? diaVencimento : undefined,
        cpfCnpj: formaPagamento === "boleto" ? cpfCnpj.replace(/\D/g, "") : undefined,
      });
      setResultado(resposta.data);
    } catch (erro: any) {
      setErro(erro?.response?.data?.erro ?? "Não foi possível criar a cobrança.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div className="mx-auto max-w-md px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-lg font-medium text-slate-900">Cobrança criada!</p>
          {resultado.checkoutUrl && (
            <a
              href={resultado.checkoutUrl}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-block w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Abrir link de autorização do cartão
            </a>
          )}
          {resultado.boleto?.linkPagamento && (
            <a
              href={resultado.boleto.linkPagamento}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-block w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Abrir boleto
            </a>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Envie esse link pro cliente ({empresa.nome}) concluir o pagamento.
          </p>
          <button type="button" onClick={onCriada} className="mt-4 text-sm font-medium text-slate-500 underline">
            Voltar pra lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-8">
      <button type="button" onClick={onCancelar} className="mb-4 text-xs font-medium text-slate-500 hover:text-slate-900">
        ← Voltar
      </button>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Cobrança personalizada</h1>
      <p className="mb-6 text-sm text-slate-500">{empresa.nome}</p>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4">
          <label className={rotulo}>Valor mensal (R$)</label>
          <input required value={valor} onChange={(e) => setValor(e.target.value)} className={campo} placeholder="150,00" />
        </div>

        <p className="mb-2 text-sm font-medium text-slate-700">Forma de pagamento</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormaPagamento("cartao")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              formaPagamento === "cartao" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"
            }`}
          >
            Cartão
          </button>
          <button
            type="button"
            onClick={() => setFormaPagamento("boleto")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              formaPagamento === "boleto" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"
            }`}
          >
            Boleto/Pix
          </button>
        </div>

        {formaPagamento === "boleto" && (
          <>
            <div className="mb-4">
              <label className={rotulo}>Dia do vencimento</label>
              <select value={diaVencimento} onChange={(e) => setDiaVencimento(Number(e.target.value))} className={campo}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((dia) => (
                  <option key={dia} value={dia}>Dia {dia}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className={rotulo}>CPF ou CNPJ do responsável</label>
              <input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} className={campo} placeholder="Só números" />
            </div>
          </>
        )}

        {erro && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {enviando ? "Processando..." : "Criar cobrança"}
        </button>
      </form>
    </div>
  );
}
