import { ModuloSistema } from "@prisma/client";
import { prisma } from "./prisma";

export const MODULOS: ModuloSistema[] = [
  "dashboard",
  "ordens_servico",
  "orcamentos",
  "clientes",
  "estoque",
  "usuarios",
  "financeiro",
];

export type Acao = "ver" | "criar" | "editar" | "apagar";

export interface PermissaoModulo {
  ver: boolean;
  criar: boolean;
  editar: boolean;
  apagar: boolean;
}

export type MapaPermissoes = Record<ModuloSistema, PermissaoModulo>;

const CAMPO_POR_ACAO = {
  ver: "podeVer",
  criar: "podeCriar",
  editar: "podeEditar",
  apagar: "podeApagar",
} as const;

function permissaoTotal(): PermissaoModulo {
  return { ver: true, criar: true, editar: true, apagar: true };
}

function permissaoVazia(): PermissaoModulo {
  return { ver: false, criar: false, editar: false, apagar: false };
}

export async function montarMapaPermissoes(usuarioId: string, papel: string): Promise<MapaPermissoes> {
  const mapa = {} as MapaPermissoes;

  if (papel === "desenvolvedor") {
    for (const modulo of MODULOS) mapa[modulo] = permissaoTotal();
    return mapa;
  }

  const registros = await prisma.permissaoUsuario.findMany({ where: { usuarioId } });
  const porModulo = new Map(registros.map((r) => [r.modulo, r]));

  for (const modulo of MODULOS) {
    const registro = porModulo.get(modulo);
    mapa[modulo] = registro
      ? {
          ver: registro.podeVer,
          criar: registro.podeCriar,
          editar: registro.podeEditar,
          apagar: registro.podeApagar,
        }
      : permissaoVazia();
  }

  return mapa;
}

export async function temPermissao(
  usuarioId: string,
  papel: string,
  modulo: ModuloSistema,
  acao: Acao,
): Promise<boolean> {
  if (papel === "desenvolvedor") return true;

  const registro = await prisma.permissaoUsuario.findUnique({
    where: { usuarioId_modulo: { usuarioId, modulo } },
  });

  if (!registro) return false;

  return registro[CAMPO_POR_ACAO[acao]];
}
