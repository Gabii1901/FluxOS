import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CabecalhoEmpresaImpressao } from "../components/CabecalhoEmpresaImpressao";
import { api } from "../lib/api";
import { formatarDocumento } from "../lib/cnpj";
import { valorPorExtenso } from "../lib/extenso";

interface ReciboDados {
  id: string;
  valor: string;
  metodo: string;
  pagoEm: string | null;
  fatura: {
    numero: number;
    ordemServico: {
      numero: number;
      cliente: { nome: string; documento: string | null };
      empresa: {
        nome: string;
        cnpj: string | null;
        enderecoCidade: string | null;
        enderecoUf: string | null;
        assinaturaRecibo: string | null;
        assinanteNome: string | null;
      };
    };
  };
}

const METODO_LABEL: Record<string, string> = {
  pix: "PIX",
  dinheiro: "dinheiro",
  cartao_credito: "cartão de crédito",
  cartao_debito: "cartão de débito",
  cartao: "cartão",
  boleto: "boleto",
  transferencia: "transferência",
};

export function ReciboImpressaoPage() {
  const { id } = useParams<{ id: string }>();
  const [recibo, setRecibo] = useState<ReciboDados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ReciboDados>(`/faturas/pagamentos/${id}/recibo`)
      .then((r) => setRecibo(r.data))
      .catch((e) => setErro(e?.response?.data?.erro ?? "Não foi possível carregar o recibo."));
  }, [id]);

  if (erro) return <p className="p-10 text-sm text-red-600">{erro}</p>;
  if (!recibo) return <p className="p-10 text-sm text-slate-500">Carregando...</p>;

  const os = recibo.fatura.ordemServico;
  const empresa = os.empresa;
  const valor = Number(recibo.valor);
  const data = new Date(recibo.pagoEm ?? Date.now());
  const cidade = empresa.enderecoCidade
    ? `${empresa.enderecoCidade}${empresa.enderecoUf ? `/${empresa.enderecoUf}` : ""}, `
    : "";
  const metodo = METODO_LABEL[recibo.metodo] ?? recibo.metodo;
  const numeroRecibo = recibo.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-8 py-10 text-slate-900">
      <div className="mb-6 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Imprimir
        </button>
      </div>

      <header className="mb-8 flex items-start justify-between border-b border-slate-300 pb-6">
        <CabecalhoEmpresaImpressao nomeEmpresa={empresa.nome} />
        <div className="text-right">
          <h1 className="text-xl font-semibold">Recibo</h1>
          <p className="text-sm text-slate-500">Nº {numeroRecibo}</p>
          <p className="mt-2 text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </header>

      <p className="text-base leading-8">
        Recebi(emos) de <strong>{os.cliente.nome}</strong>
        {os.cliente.documento && <>, CPF/CNPJ {formatarDocumento(os.cliente.documento)}</>}, a importância de{" "}
        <strong>{valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> (
        {valorPorExtenso(valor)}), paga em {metodo}, referente à Ordem de Serviço nº {os.numero} (fatura #
        {recibo.fatura.numero}).
      </p>
      <p className="mt-4 text-base leading-8">Para clareza, firmo(amos) o presente recibo, dando plena quitação do valor recebido.</p>

      <p className="mt-10 text-right text-sm">
        {cidade}
        {data.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}.
      </p>

      <div className="mx-auto mt-12 w-80 text-center">
        <div className="flex h-24 items-end justify-center">
          {empresa.assinaturaRecibo && (
            <img src={empresa.assinaturaRecibo} alt="Assinatura" className="max-h-24 max-w-full object-contain" />
          )}
        </div>
        <div className="border-t border-slate-800 pt-1 text-sm">
          {empresa.assinanteNome && <p className="font-medium">{empresa.assinanteNome}</p>}
          <p>{empresa.nome}</p>
          {empresa.cnpj && <p className="text-xs text-slate-500">CNPJ {formatarDocumento(empresa.cnpj)}</p>}
        </div>
      </div>
    </div>
  );
}
