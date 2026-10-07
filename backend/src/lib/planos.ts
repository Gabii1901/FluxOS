import { ModuloSistema, PlanoSistema } from "@prisma/client";

export interface DefinicaoPlano {
  nome: string;
  valor: number; // em reais
  modulos: ModuloSistema[];
}

const MODULOS_BASICO: ModuloSistema[] = ["dashboard", "usuarios", "clientes", "ordens_servico"];
const MODULOS_INTERMEDIARIO: ModuloSistema[] = [...MODULOS_BASICO, "estoque"];
const MODULOS_AVANCADO: ModuloSistema[] = [...MODULOS_INTERMEDIARIO, "orcamentos", "financeiro"];

export const PLANOS: Record<Exclude<PlanoSistema, "personalizado">, DefinicaoPlano> = {
  basico: { nome: "Básico", valor: 69.9, modulos: MODULOS_BASICO },
  intermediario: { nome: "Intermediário", valor: 89.9, modulos: MODULOS_INTERMEDIARIO },
  avancado: { nome: "Avançado", valor: 119.9, modulos: MODULOS_AVANCADO },
};

/** Planos que passam pelo checkout automático. "personalizado" é configurado manualmente. */
export const PLANOS_COM_CHECKOUT = Object.keys(PLANOS) as Array<keyof typeof PLANOS>;

export function moduloLiberadoNoPlano(plano: PlanoSistema | null, modulo: ModuloSistema): boolean {
  if (!plano) return false;
  if (plano === "personalizado") return true;
  return PLANOS[plano].modulos.includes(modulo);
}
