import type { Category } from './types'

export const UNCATEGORIZED_CATEGORY_ID = 'nao-categorizado'
export const UNCATEGORIZED_CATEGORY_NAME = 'Não categorizado'

export const initialCategories: Category[] = [
  { id: 'salario', name: 'Salário', groupId: 'renda' },
  { id: 'ajuda-custo', name: 'Ajuda de custo', groupId: 'renda' },
  { id: 'caju', name: 'Caju', groupId: 'renda' },
  { id: 'saque-fgts', name: 'Saque FGTS', groupId: 'renda' },

  { id: 'dizimo', name: 'Dízimo', groupId: 'reservas-metas' },
  { id: 'poupado', name: 'Metas', groupId: 'reservas-metas' },

  { id: 'transferencia-orcamento-metas', name: 'Transferência para metas', groupId: 'transferencias' },

  { id: 'luz', name: 'Luz', groupId: 'casa' },
  { id: 'gas', name: 'Gás', groupId: 'casa' },
  { id: 'celular', name: 'Celular', groupId: 'casa' },

  { id: 'mercado', name: 'Mercado', groupId: 'mercado-alimentacao' },
  { id: 'restaurantes', name: 'Restaurantes e Delivery', groupId: 'mercado-alimentacao' },
  { id: 'mercado-mamis', name: 'Mercado Mamis', groupId: 'mercado-alimentacao' },

  { id: 'amor-saude', name: 'Amor Saúde', groupId: 'saude' },
  { id: 'farmacia', name: 'Farmácia', groupId: 'saude' },

  { id: 'uber', name: 'Uber', groupId: 'transporte' },

  { id: 'audible', name: 'Audible', groupId: 'assinaturas' },
  { id: 'meli-mais', name: 'Meli+', groupId: 'assinaturas' },
  { id: 'globoplay-mamis', name: 'Globoplay Mamis', groupId: 'assinaturas' },
  { id: 'netflix-mamis', name: 'Netflix Mamis', groupId: 'assinaturas' },
  { id: 'internet-mamis', name: 'Internet Mamis', groupId: 'assinaturas' },
  { id: 'academia-mamis', name: 'Academia Mamis', groupId: 'assinaturas' },
  { id: 'wellhub', name: 'Wellhub', groupId: 'assinaturas' },

  { id: 'oferta', name: 'Oferta', groupId: 'doacoes' },

  { id: 'outros', name: 'Outros', groupId: 'diversos' },
  { id: 'emprestimo-reserva', name: 'Empréstimo reserva', groupId: 'diversos' },
]
