import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart } from "../components/charts/BarChart";
import { api } from "../lib/api";
import type { RelatorioFinanceiro } from "../types/relatorio";

type Aba = "despesas" | "receitas" | "saldo";

const ABAS: { id: Aba; label: string }[] = [
  { id: "despesas", label: "Despesas" },
  { id: "receitas", label: "Receitas" },
  { id: "saldo", label: "Receitas x Despesas" },
];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function periodoUltimosMeses(qtd: number) {
  const hoje = new Date();
  return { inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth() - (qtd - 1), 1)), fim: iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)) };
}

function periodoDoAno(ano: number) {
  return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
}

const ATALHOS_PERIODO: { label: string; periodo: () => { inicio: string; fim: string } }[] = [
  { label: "Este mês", periodo: () => periodoUltimosMeses(1) },
  { label: "Últimos 3 meses", periodo: () => periodoUltimosMeses(3) },
  { label: "Últimos 6 meses", periodo: () => periodoUltimosMeses(6) },
  { label: "Últimos 12 meses", periodo: () => periodoUltimosMeses(12) },
  { label: "Este ano", periodo: () => periodoDoAno(new Date().getFullYear()) },
  { label: "Ano passado", periodo: () => periodoDoAno(new Date().getFullYear() - 1) },
];

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (d: string) => d.split("-").reverse().join("/");
const nomeMes = (mes: string) => {
  const [ano, m] = mes.split("-").map(Number);
  const texto = new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(" de ", "/").replace(".", "");
};

const SITUACAO_DESPESA = {
  paga: { label: "Paga", cls: "bg-emerald-100 text-emerald-700" },
  aberta: { label: "Em aberto", cls: "bg-slate-100 text-slate-700" },
  vencida: { label: "Vencida", cls: "bg-red-100 text-red-700" },
};

const num = { fontVariantNumeric: "tabular-nums" as const };
const th = "px-4 py-3";
const td = "px-4 py-2.5";

function Cartao({ titulo, valor, cor }: { titulo: string; valor: number; cor?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-1 text-xl font-semibold ${cor ?? "text-slate-900"}`} style={num}>
        {moeda(valor)}
      </p>
    </div>
  );
}

export function RelatoriosPage() {
  const [aba, setAba] = useState<Aba>("saldo");
  const [periodo, setPeriodo] = useState(() => periodoDoAno(new Date().getFullYear()));
  const [relatorio, setRelatorio] = useState<RelatorioFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!periodo.inicio || !periodo.fim) return;
    setCarregando(true);
    setErro(null);
    api
      .get<RelatorioFinanceiro>("/relatorios/financeiro", { params: periodo })
      .then((r) => setRelatorio(r.data))
      .catch((e) => setErro(e?.response?.data?.erro ?? "Não foi possível carregar o relatório."))
      .finally(() => setCarregando(false));
  }, [periodo]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhamento de despesas, receitas e saldo por mês.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 print:hidden"
        >
          Imprimir
        </button>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">De</label>
          <input
            type="date"
            value={periodo.inicio}
            onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Até</label>
          <input
            type="date"
            value={periodo.fim}
            onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ATALHOS_PERIODO.map((a) => (
            <button
              key={a.label}
              onClick={() => setPeriodo(a.periodo())}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:border-slate-900"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-slate-200 print:hidden">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              aba === a.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {a.label}
          </button>
        ))}
      </nav>

      <p className="mb-4 hidden text-sm text-slate-600 print:block">
        {ABAS.find((a) => a.id === aba)?.label} · {data(periodo.inicio)} a {data(periodo.fim)}
      </p>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {carregando && !relatorio && <p className="text-sm text-slate-500">Carregando...</p>}

      {relatorio && (
        <div className={carregando ? "opacity-60" : ""}>
          {aba === "despesas" && <AbaDespesas relatorio={relatorio} />}
          {aba === "receitas" && <AbaReceitas relatorio={relatorio} />}
          {aba === "saldo" && <AbaSaldo relatorio={relatorio} />}
        </div>
      )}
    </div>
  );
}

function AbaDespesas({ relatorio }: { relatorio: RelatorioFinanceiro }) {
  const { despesas, meses } = relatorio;
  const total = despesas.reduce((s, d) => s + d.valor, 0);
  const paga = despesas.filter((d) => d.situacao === "paga").reduce((s, d) => s + d.valor, 0);
  const vencida = despesas.filter((d) => d.situacao === "vencida").reduce((s, d) => s + d.valor, 0);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    despesas.forEach((d) => mapa.set(d.categoria, (mapa.get(d.categoria) ?? 0) + d.valor));
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ id: label, label, value }));
  }, [despesas]);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cartao titulo="Total de despesas" valor={total} />
        <Cartao titulo="Pagas" valor={paga} cor="text-emerald-700" />
        <Cartao titulo="Em aberto" valor={total - paga - vencida} />
        <Cartao titulo="Vencidas" valor={vencida} cor="text-red-600" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Despesas por mês (vencimento)</h2>
          <BarChart
            data={meses.map((m) => ({ id: m.mes, label: nomeMes(m.mes), value: m.despesaPaga + m.despesaEmAberto }))}
            ariaLabel="Total de despesas por mês"
            formatValue={moeda}
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Despesas por categoria</h2>
          <BarChart data={porCategoria} ariaLabel="Total de despesas por categoria" formatValue={moeda} />
        </section>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className={th}>Vencimento</th>
              <th className={th}>Descrição</th>
              <th className={th}>Categoria</th>
              <th className={th}>Situação</th>
              <th className={`${th} text-right`}>Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {despesas.map((d) => (
              <tr key={d.id}>
                <td className={td} style={num}>{data(d.vencimento)}</td>
                <td className={td}>
                  <p className="text-slate-900">{d.descricao}</p>
                  {d.fornecedor && <p className="text-xs text-slate-500">{d.fornecedor}</p>}
                </td>
                <td className={`${td} text-slate-600`}>{d.categoria}</td>
                <td className={td}>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SITUACAO_DESPESA[d.situacao].cls}`}>
                    {SITUACAO_DESPESA[d.situacao].label}
                    {d.pagoEm && ` em ${data(d.pagoEm)}`}
                  </span>
                </td>
                <td className={`${td} text-right text-slate-900`} style={num}>{moeda(d.valor)}</td>
              </tr>
            ))}
            {despesas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Nenhuma despesa no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AbaReceitas({ relatorio }: { relatorio: RelatorioFinanceiro }) {
  const { receitas, meses } = relatorio;
  const recebido = receitas.filter((r) => r.situacao === "recebida").reduce((s, r) => s + r.valor, 0);
  const aReceber = receitas.filter((r) => r.situacao === "a_receber").reduce((s, r) => s + r.valor, 0);

  const porMetodo = useMemo(() => {
    const mapa = new Map<string, number>();
    receitas
      .filter((r) => r.situacao === "recebida")
      .forEach((r) => mapa.set(r.metodo, (mapa.get(r.metodo) ?? 0) + r.valor));
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ id: label, label, value }));
  }, [receitas]);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Cartao titulo="Recebido" valor={recebido} cor="text-emerald-700" />
        <Cartao titulo="A receber" valor={aReceber} />
        <Cartao titulo="Total" valor={recebido + aReceber} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Recebido por mês</h2>
          <BarChart
            data={meses.map((m) => ({ id: m.mes, label: nomeMes(m.mes), value: m.receitaRecebida }))}
            ariaLabel="Receitas recebidas por mês"
            formatValue={moeda}
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Recebido por forma de pagamento</h2>
          <BarChart data={porMetodo} ariaLabel="Receitas recebidas por forma de pagamento" formatValue={moeda} />
        </section>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className={th}>Data</th>
              <th className={th}>Cliente</th>
              <th className={th}>OS</th>
              <th className={th}>Forma</th>
              <th className={th}>Situação</th>
              <th className={`${th} text-right`}>Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receitas.map((r) => (
              <tr key={r.id}>
                <td className={td} style={num}>{data(r.data)}</td>
                <td className={`${td} text-slate-900`}>{r.cliente}</td>
                <td className={td}>
                  <Link to={`/ordens-servico/${r.osId}`} className="text-slate-600 hover:underline">
                    #{r.osNumero}
                  </Link>
                </td>
                <td className={`${td} text-slate-600`}>{r.metodo}</td>
                <td className={td}>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.situacao === "recebida" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {r.situacao === "recebida" ? "Recebida" : "A receber"}
                  </span>
                </td>
                <td className={`${td} text-right text-slate-900`} style={num}>{moeda(r.valor)}</td>
              </tr>
            ))}
            {receitas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Nenhuma receita no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AbaSaldo({ relatorio }: { relatorio: RelatorioFinanceiro }) {
  const { meses } = relatorio;
  const soma = (campo: keyof (typeof meses)[number]) => meses.reduce((s, m) => s + (m[campo] as number), 0);
  const receitas = soma("receitaRecebida");
  const despesas = soma("despesaPaga");
  const saldo = receitas - despesas;
  const corSaldo = (v: number) => (v < 0 ? "text-red-600" : v > 0 ? "text-emerald-700" : "text-slate-600");

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cartao titulo="Receitas recebidas" valor={receitas} cor="text-emerald-700" />
        <Cartao titulo="Despesas pagas" valor={despesas} cor="text-red-600" />
        <Cartao titulo="Saldo do período" valor={saldo} cor={corSaldo(saldo)} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className={`${th} text-left`}>Mês</th>
              <th className={`${th} text-right`}>Receitas</th>
              <th className={`${th} text-right`}>Despesas</th>
              <th className={`${th} text-right`}>Saldo do mês</th>
              <th className={`${th} text-right`}>Saldo acumulado</th>
              <th className={`${th} text-right`} title="Contando também o que está a receber e a pagar">
                Saldo previsto
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100" style={num}>
            {meses.map((m) => (
              <tr key={m.mes}>
                <td className={`${td} font-medium text-slate-900`}>{nomeMes(m.mes)}</td>
                <td className={`${td} text-right text-slate-900`}>
                  {moeda(m.receitaRecebida)}
                  {m.receitaAReceber > 0 && (
                    <p className="text-xs text-slate-400">+ {moeda(m.receitaAReceber)} a receber</p>
                  )}
                </td>
                <td className={`${td} text-right text-slate-900`}>
                  {moeda(m.despesaPaga)}
                  {m.despesaEmAberto > 0 && (
                    <p className="text-xs text-slate-400">+ {moeda(m.despesaEmAberto)} a pagar</p>
                  )}
                </td>
                <td className={`${td} text-right font-medium ${corSaldo(m.saldoRealizado)}`}>{moeda(m.saldoRealizado)}</td>
                <td className={`${td} text-right ${corSaldo(m.saldoAcumulado)}`}>{moeda(m.saldoAcumulado)}</td>
                <td className={`${td} text-right text-slate-500`}>{moeda(m.saldoPrevisto)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold" style={num}>
            <tr>
              <td className={`${td} text-slate-900`}>Total</td>
              <td className={`${td} text-right`}>{moeda(receitas)}</td>
              <td className={`${td} text-right`}>{moeda(despesas)}</td>
              <td className={`${td} text-right ${corSaldo(saldo)}`}>{moeda(saldo)}</td>
              <td className={td}></td>
              <td className={`${td} text-right text-slate-500`}>{moeda(soma("saldoPrevisto"))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Saldo do mês = receitas recebidas − despesas pagas. Despesas contam no mês do vencimento; receitas, no mês em
        que foram recebidas. O saldo previsto inclui o que ainda está a receber e a pagar.
      </p>
    </>
  );
}
