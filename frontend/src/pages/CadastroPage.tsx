import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface EnderecoViaCep {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export function CadastroPage() {
  const [empresaNome, setEmpresaNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  async function handleReenviar() {
    setReenviando(true);
    try {
      await api.post("/auth/reenviar-confirmacao", { email });
      setReenviado(true);
    } finally {
      setReenviando(false);
    }
  }

  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados: EnderecoViaCep = await resposta.json();
      if (!dados.erro) {
        setLogradouro(dados.logradouro);
        setBairro(dados.bairro);
        setCidade(dados.localidade);
        setUf(dados.uf);
      }
    } catch {
      // Falha na busca não impede o preenchimento manual.
    } finally {
      setBuscandoCep(false);
    }
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.post("/auth/cadastro", {
        empresaNome,
        cnpj: cnpj || undefined,
        nome,
        email,
        senha,
        endereco: { cep, logradouro, numero, complemento: complemento || undefined, bairro, cidade, uf },
      });
      setConcluido(true);
    } catch (erro: any) {
      setErro(erro?.response?.data?.erro ?? "Não foi possível concluir o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 flex justify-center">
            <img src={`${import.meta.env.BASE_URL}logo_fluxos_full_trimmed.png`} alt="FluxOS" className="h-24 w-auto" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-lg font-medium text-slate-900">Quase lá!</p>
            <p className="mt-2 text-sm text-slate-600">
              Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para
              ativar sua conta e entrar no FluxOS.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Não achou? Confira também a caixa de spam/lixo eletrônico.
            </p>

            {reenviado ? (
              <p className="mt-4 text-sm font-medium text-green-700">Link reenviado! Confira seu e-mail.</p>
            ) : (
              <button
                type="button"
                onClick={handleReenviar}
                disabled={reenviando}
                className="mt-4 text-sm font-medium text-slate-900 underline disabled:opacity-60"
              >
                {reenviando ? "Enviando..." : "Reenviar e-mail de confirmação"}
              </button>
            )}

            <Link to="/login" className="mt-6 block text-sm font-medium text-slate-500 underline">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const campo = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
  const rotulo = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src={`${import.meta.env.BASE_URL}logo_fluxos_full_trimmed.png`} alt="FluxOS" className="h-24 w-auto" />
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-slate-700">Cadastre sua empresa</p>

          <div className="mb-4">
            <label htmlFor="empresaNome" className={rotulo}>Nome da empresa</label>
            <input
              id="empresaNome"
              required
              autoFocus
              value={empresaNome}
              onChange={(e) => setEmpresaNome(e.target.value)}
              className={campo}
              placeholder="Oficina do João"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="cnpj" className={rotulo}>CNPJ (opcional)</label>
            <input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className={campo}
              placeholder="00.000.000/0001-00"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="nome" className={rotulo}>Seu nome</label>
            <input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={campo}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className={rotulo}>E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={campo}
              placeholder="voce@empresa.com"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="senha" className={rotulo}>Senha</label>
            <input
              id="senha"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={campo}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <p className="mb-3 text-sm font-medium text-slate-700">
            Endereço <span className="font-normal text-slate-400">(exigido para emissão de boleto)</span>
          </p>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cep" className={rotulo}>CEP</label>
              <input
                id="cep"
                required
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                onBlur={(e) => buscarCep(e.target.value)}
                className={campo}
                placeholder="00000-000"
              />
            </div>
            <div>
              <label htmlFor="numero" className={rotulo}>Número</label>
              <input
                id="numero"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className={campo}
              />
            </div>
          </div>

          {buscandoCep && <p className="mb-3 text-xs text-slate-400">Buscando endereço...</p>}

          <div className="mb-4">
            <label htmlFor="logradouro" className={rotulo}>Rua</label>
            <input
              id="logradouro"
              required
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              className={campo}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="complemento" className={rotulo}>Complemento (opcional)</label>
            <input
              id="complemento"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className={campo}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="bairro" className={rotulo}>Bairro</label>
            <input
              id="bairro"
              required
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className={campo}
            />
          </div>

          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="cidade" className={rotulo}>Cidade</label>
              <input
                id="cidade"
                required
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="uf" className={rotulo}>UF</label>
              <input
                id="uf"
                required
                maxLength={2}
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                className={campo}
              />
            </div>
          </div>

          {erro && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {enviando ? "Cadastrando..." : "Criar conta"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Já tem conta?{" "}
            <Link to="/login" className="font-medium text-slate-900 underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
