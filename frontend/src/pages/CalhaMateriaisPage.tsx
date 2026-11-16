import { useEffect, useState, type FormEvent } from "react";
import { CampoMoeda } from "../components/CampoMoeda";
import { api } from "../lib/api";
import type { MaterialChapa } from "../types/calha";

const campo = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const rotulo = "mb-1 block text-sm font-medium text-slate-700";

export function CalhaMateriaisPage() {
  const [materiais, setMateriais] = useState<MaterialChapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nome, setNome] = useState("");
  const [espessuraMm, setEspessuraMm] = useState("");
  const [tipo, setTipo] = useState("");
  const [cor, setCor] = useState("");
  const [precoM2, setPrecoM2] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function limparForm() {
    setNome("");
    setEspessuraMm("");
    setTipo("");
    setCor("");
    setPrecoM2("");
    setEditandoId(null);
    setMostrarForm(false);
  }

  function abrirEdicao(material: MaterialChapa) {
    setNome(material.nome);
    setEspessuraMm(material.espessuraMm ? String(Number(material.espessuraMm)).replace(".", ",") : "");
    setTipo(material.tipo ?? "");
    setCor(material.cor ?? "");
    setPrecoM2(Number(material.precoM2).toFixed(2));
    setEditandoId(material.id);
    setMostrarForm(true);
  }

  function carregar() {
    setCarregando(true);
    return api
      .get<MaterialChapa[]>("/calhas/materiais")
      .then((resposta) => setMateriais(resposta.data))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const dados = {
        nome,
        espessuraMm: espessuraMm ? Number(espessuraMm.replace(",", ".")) : undefined,
        tipo: tipo || undefined,
        cor: cor || undefined,
        precoM2: Number(precoM2.replace(",", ".")),
      };
      if (editandoId) await api.patch(`/calhas/materiais/${editandoId}`, dados);
      else await api.post("/calhas/materiais", dados);
      limparForm();
      carregar();
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(id: string) {
    if (!window.confirm("Remover esse material?")) return;
    await api.delete(`/calhas/materiais/${id}`);
    carregar();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Materiais / chapas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo usado nos orçamentos de calhas pra calcular o custo de material.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (mostrarForm ? limparForm() : setMostrarForm(true))}
          className={
            mostrarForm
              ? "rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              : "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          }
        >
          {mostrarForm ? "Cancelar" : "+ Novo material"}
        </button>
      </header>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4">
            <label className={rotulo}>Nome</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} className={campo} placeholder="Material 1" />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={rotulo}>Espessura (mm)</label>
              <input value={espessuraMm} onChange={(e) => setEspessuraMm(e.target.value)} className={campo} placeholder="43" />
            </div>
            <div>
              <label className={rotulo}>Tipo</label>
              <input value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo} placeholder="Galvalume" />
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={rotulo}>Cor</label>
              <input value={cor} onChange={(e) => setCor(e.target.value)} className={campo} placeholder="Natural (galvanizada)" />
            </div>
            <div>
              <label className={rotulo}>Preço por m² (R$)</label>
              <CampoMoeda required value={precoM2} onChange={setPrecoM2} className={campo} />
            </div>
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {enviando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar material"}
          </button>
        </form>
      )}

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : materiais.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum material cadastrado ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Espessura</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cor</th>
                <th className="px-4 py-3">Preço/m²</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materiais.map((material) => (
                <tr key={material.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{material.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{material.espessuraMm ? `${material.espessuraMm}mm` : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{material.tipo ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{material.cor ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {Number(material.precoM2).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(material)}
                        className="text-xs font-medium text-slate-700 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemover(material.id)}
                        className="text-xs font-medium text-red-700 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
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
