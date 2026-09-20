import type { Group } from './types'

export const initialGroups: Group[] = [
  { id: 'renda', name: 'Renda', kind: 'entrada' },
  { id: 'reservas-metas', name: 'Reservas e metas', kind: 'meta' },
  { id: 'transferencias', name: 'Transferências', kind: 'transferencia' },
  { id: 'casa', name: 'Casa', kind: 'saida' },
  { id: 'mercado-alimentacao', name: 'Mercado e alimentação', kind: 'saida' },
  { id: 'saude', name: 'Saúde', kind: 'saida' },
  { id: 'transporte', name: 'Transporte', kind: 'saida' },
  { id: 'assinaturas', name: 'Assinaturas', kind: 'saida' },
  { id: 'doacoes', name: 'Doações', kind: 'saida' },
  { id: 'diversos', name: 'Outros', kind: 'saida' },
]
