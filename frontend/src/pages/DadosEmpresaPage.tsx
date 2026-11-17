import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { UsuariosComAcesso } from "../components/UsuariosComAcesso";
import { useAuth } from "../contexts/AuthContext";
import { api, urlArquivo } from "../lib/api";
import { consultarCnpj, formatarDocumento, resumoCnpj } from "../lib/cnpj";
import type { DadosEmpresa } from "../types/empresa";

const campo =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const rotulo = "mb-1 block text-sm font-medium text-slate-700";

const PLANO_LABEL: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
  personalizado: "Personalizado",
};

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativa",
  pendente: "Pendente",
  inadimplente: "Inadimplente",
  cancelado: "Cancelada",
};

interface Form {
  nome: string;
  cnpj: string;
  cpfCnpjBoleto: string;
  diaVencimento: string;
  enderecoCep: string;
  enderecoLogradouro: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoUf: string;
}

function formatarCep(valor: string) {
  const d = valor.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : valor;
}

function paraForm(e: DadosEmpresa): Form {
  return {
    nome: e.nome,
    cnpj: e.cnpj ? formatarDocumento(e.cnpj) : "",
    cpfCnpjBoleto: e.cpfCnpjBoleto ? formatarDocumento(e.cpfCnpjBoleto) : "",
    diaVencimento: e.diaVencimento ? String(e.diaVencimento) : "",
    enderecoCep: e.enderecoCep ? formatarCep(e.enderecoCep) : "",
    enderecoLogradouro: e.enderecoLogradouro ?? "",
    enderecoNumero: e.enderecoNumero ?? "",
    enderecoComplemento: e.enderecoComplemento ?? "",
    enderecoBairro: e.enderecoBairro ?? "",
    enderecoCidade: e.enderecoCidade ?? "",
    enderecoUf: e.enderecoUf ?? "",
  };
}

/**
 * Edição dos dados da empresa.
 * - /minha-empresa: a empresa do usuário logado (administrador ou desenvolvedor).
 * - /admin/empresas/:empresaId: qualquer empresa, pela tela de admin (só desenvolvedor).
 */
export function DadosEmpresaPage() {
  const { empresaId } = useParams<{ empresaId?: string }>();
  const { atualizarUsuario } = useAuth();
  const modoAdmin = !!empresaId;
  const baseUrl = modoAdmin ? `/admin/empresas/${empresaId}/dados` : "/empresa";

  const [empresa, setEmpresa] = useState<DadosEmpresa | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [infoCnpj, setInfoCnpj] = useState("");
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);
  const inputLogo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCarregando(true);
    api
      .get<DadosEmpresa>(baseUrl)
      .then((r) => {
        setEmpresa(r.data);
        setForm(paraForm(r.data));
      })
      .catch(() => setErro("Não foi possível carregar os dados da empresa."))
      .finally(() => setCarregando(false));
  }, [baseUrl]);

  function atualizar<K extends keyof Form>(chave: K, valor: Form[K]) {
    setSucesso(false);
    setForm((f) => (f ? { ...f, [chave]: valor } : f));
  }

  async function buscarCep(valor: string) {
    const d = valor.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const dados = await r.json();
      if (dados.erro) return;
      setForm((f) =>
        f
          ? {
              ...f,
              enderecoCep: formatarCep(d),
              enderecoLogradouro: dados.logradouro || f.enderecoLogradouro,
              enderecoBairro: dados.bairro || f.enderecoBairro,
              enderecoCidade: dados.localidade || f.enderecoCidade,
              enderecoUf: dados.uf || f.enderecoUf,
            }
          : f,
      );
    } catch {
      // segue com preenchimento manual
    }
  }

  async function handleBuscarCnpj() {
    if (!form) return;
    setBuscandoCnpj(true);
    setInfoCnpj("");
    try {
      const d = await consultarCnpj(form.cnpj);
      setSucesso(false);
      setForm((f) =>
        f
          ? {
              ...f,
              cnpj: formatarDocumento(d.cnpj),
              nome: d.nomeFantasia || d.razaoSocial || f.nome,
              enderecoCep: d.cep ? formatarCep(d.cep) : f.enderecoCep,
              enderecoLogradouro: d.logradouro || f.enderecoLogradouro,
              enderecoNumero: d.numero || f.enderecoNumero,
              enderecoComplemento: d.complemento || f.enderecoComplemento,
              enderecoBairro: d.bairro || f.enderecoBairro,
              enderecoCidade: d.municipio || f.enderecoCidade,
              enderecoUf: d.uf || f.enderecoUf,
            }
          : f,
      );
      setInfoCnpj([d.razaoSocial && `Razão social: ${d.razaoSocial}`, resumoCnpj(d)].filter(Boolean).join(" · "));
    } catch (e: any) {
      setInfoCnpj(e.message);
    } finally {
      setBuscandoCnpj(false);
    }
  }

  function handleCancelar() {
    if (empresa) setForm(paraForm(empresa));
    setErro(null);
    setSucesso(false);
    setInfoCnpj("");
  }

  async function handleSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!form) return;
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const { data } = await api.patch<DadosEmpresa>(baseUrl, {
        ...form,
        diaVencimento: form.diaVencimento ? Number(form.diaVencimento) : null,
      });
      setEmpresa(data);
      setForm(paraForm(data));
      setSucesso(true);
      // O nome da empresa aparece no menu/cabeçalho — atualiza a sessão.
      if (!modoAdmin) atualizarUsuario().catch(() => {});
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Não foi possível salvar. Confira os dados e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleEnviarLogo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroLogo(null);
    if (arquivo.size > 3 * 1024 * 1024) {
      setErroLogo("A imagem deve ter no máximo 3 MB.");
      return;
    }
    const dados = new FormData();
    dados.append("logo", arquivo);
    setEnviandoLogo(true);
    try {
      const { data } = await api.post<DadosEmpresa>(`${baseUrl}/logo`, dados);
      setEmpresa(data);
    } catch (e: any) {
      setErroLogo(e?.response?.data?.erro ?? "Não foi possível enviar a logo.");
    } finally {
      setEnviandoLogo(false);
      if (inputLogo.current) inputLogo.current.value = "";
    }
  }

  async function handleRemoverLogo() {
    if (!window.confirm("Remover a logo da empresa?")) return;
    setEnviandoLogo(true);
    try {
      const { data } = await api.delete<DadosEmpresa>(`${baseUrl}/logo`);
      setEmpresa(data);
    } finally {
      setEnviandoLogo(false);
    }
  }

  if (carregando) return <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-slate-500">Carregando...</div>;
  if (!empresa || !form) return <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-600">{erro}</div>;

  const sujo = JSON.stringify(form) !== JSON.stringify(paraForm(empresa));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {modoAdmin && (
        <Link to="/admin/empresas" className="mb-4 inline-block text-xs font-medium text-slate-500 hover:text-slate-900">
          ← Voltar para empresas
        </Link>
      )}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">{modoAdmin ? empresa.nome : "Minha empresa"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plano {empresa.plano ? PLANO_LABEL[empresa.plano] ?? empresa.plano : "—"} · Assinatura{" "}
          {STATUS_LABEL[empresa.statusAssinatura] ?? empresa.statusAssinatura}
        </p>
      </header>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Logo</h2>
        <p className="mb-4 text-xs text-slate-500">Aparece nas impressões de OS e orçamentos. PNG, JPG ou WEBP, até 3 MB.</p>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2">
            {empresa.logoUrl ? (
              <img src={urlArquivo(empresa.logoUrl)} alt="Logo da empresa" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-slate-400">Sem logo</span>
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <input
              ref={inputLogo}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleEnviarLogo(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={enviandoLogo}
              onClick={() => inputLogo.current?.click()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {enviandoLogo ? "Enviando..." : empresa.logoUrl ? "Trocar logo" : "Enviar logo"}
            </button>
            {empresa.logoUrl && (
              <button
                type="button"
                disabled={enviandoLogo}
                onClick={handleRemoverLogo}
                className="text-xs font-medium text-red-700 hover:underline disabled:opacity-60"
              >
                Remover logo
              </button>
            )}
            {erroLogo && <p className="text-xs text-red-600">{erroLogo}</p>}
          </div>
        </div>
      </section>

      <form onSubmit={handleSalvar} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Dados da empresa</h2>

        <div className="mb-4">
          <label className={rotulo}>CNPJ</label>
          <div className="flex gap-2">
            <input
              value={form.cnpj}
              onChange={(e) => atualizar("cnpj", e.target.value)}
              onBlur={(e) => atualizar("cnpj", formatarDocumento(e.target.value))}
              placeholder="00.000.000/0000-00"
              className={campo}
            />
            <button
              type="button"
              onClick={handleBuscarCnpj}
              disabled={buscandoCnpj}
              className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {buscandoCnpj ? "Buscando..." : "Buscar na Receita"}
            </button>
          </div>
          {infoCnpj && <p className="mt-1 text-xs text-slate-500">{infoCnpj}</p>}
        </div>

        <div className="mb-6">
          <label className={rotulo}>Nome da empresa *</label>
          <input required value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} className={campo} />
        </div>

        <h3 className="mb-3 text-sm font-semibold text-slate-900">Endereço</h3>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className={rotulo}>CEP</label>
            <input
              value={form.enderecoCep}
              onChange={(e) => atualizar("enderecoCep", e.target.value)}
              onBlur={(e) => buscarCep(e.target.value)}
              placeholder="00000-000"
              className={campo}
            />
          </div>
          <div className="sm:col-span-4">
            <label className={rotulo}>Logradouro</label>
            <input value={form.enderecoLogradouro} onChange={(e) => atualizar("enderecoLogradouro", e.target.value)} className={campo} />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo}>Número</label>
            <input value={form.enderecoNumero} onChange={(e) => atualizar("enderecoNumero", e.target.value)} className={campo} />
          </div>
          <div className="sm:col-span-4">
            <label className={rotulo}>Complemento</label>
            <input value={form.enderecoComplemento} onChange={(e) => atualizar("enderecoComplemento", e.target.value)} className={campo} />
          </div>
          <div className="sm:col-span-3">
            <label className={rotulo}>Bairro</label>
            <input value={form.enderecoBairro} onChange={(e) => atualizar("enderecoBairro", e.target.value)} className={campo} />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo}>Cidade</label>
            <input value={form.enderecoCidade} onChange={(e) => atualizar("enderecoCidade", e.target.value)} className={campo} />
          </div>
          <div className="sm:col-span-1">
            <label className={rotulo}>UF</label>
            <input
              maxLength={2}
              value={form.enderecoUf}
              onChange={(e) => atualizar("enderecoUf", e.target.value.toUpperCase())}
              className={campo}
            />
          </div>
        </div>

        <h3 className="mb-3 text-sm font-semibold text-slate-900">Cobrança da mensalidade FluxOS</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={rotulo}>CPF/CNPJ para o boleto</label>
            <input
              value={form.cpfCnpjBoleto}
              onChange={(e) => atualizar("cpfCnpjBoleto", e.target.value)}
              onBlur={(e) => atualizar("cpfCnpjBoleto", formatarDocumento(e.target.value))}
              className={campo}
            />
          </div>
          <div>
            <label className={rotulo}>Dia de vencimento</label>
            <select value={form.diaVencimento} onChange={(e) => atualizar("diaVencimento", e.target.value)} className={campo}>
              <option value="">—</option>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((dia) => (
                <option key={dia} value={dia}>
                  Dia {dia}
                </option>
              ))}
            </select>
          </div>
        </div>

        {erro && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        {sucesso && <p className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Dados salvos.</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancelar}
            disabled={salvando || !sujo}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando || !sujo}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>

      {modoAdmin && empresaId && <UsuariosComAcesso empresaId={empresaId} />}
    </div>
  );
}
