import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { Cliente } from "../types/cliente";
import type { UsuarioResumo } from "../types/usuario";

interface Props {
  onCriada: () => void;
  onCancelar: () => void;
}

export function NovaOsForm({ onCriada, onCancelar }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<UsuarioResumo[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [prioridade, setPrioridade] = useState<"baixa" | "normal" | "alta" | "urgente">("normal");
  const [problemaRelatado, setProblemaRelatado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Cliente[]>("/clientes"),
      api.get<UsuarioResumo[]>("/usuarios"),
    ]).then(([clientesResp, usuariosResp]) => {
      setClientes(clientesResp.data);
      setColaboradores(usuariosResp.data.filter((u) => u.ativo));
    });
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api.post("/ordens-servico", {
        clienteId,
        tecnicoId: tecnicoId || undefined,
        prioridade,
        problemaRelatado,
      });
      onCriada();
    } catch {
      setErro("Não foi possível criar a OS. Confira os dados e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Cliente *</label>
        <select
          required
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        >
          <option value="">Selecione...</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Técnico</label>
        <select
          value={tecnicoId}
          onChange={(e) => setTecnicoId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        >
          <option value="">Sem técnico definido</option>
          {colaboradores.map((colaborador) => (
            <option key={colaborador.id} value={colaborador.id}>
              {colaborador.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Prioridade</label>
        <select
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        >
          <option value="baixa">Baixa</option>
          <option value="normal">Normal</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Problema relatado *
        </label>
        <textarea
          required
          rows={3}
          value={problemaRelatado}
          onChange={(e) => setProblemaRelatado(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
      </div>

      {erro && <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>}

      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Criar OS"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
