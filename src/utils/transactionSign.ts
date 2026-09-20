import type { CategoryKind, Group } from '../data/types'

export type TransactionSign = 'entrada' | 'saida'

const oppositeKind: Record<TransactionSign, CategoryKind> = {
  entrada: 'saida',
  saida: 'entrada',
}

export function signOfAmount(amount: number): TransactionSign {
  return amount >= 0 ? 'entrada' : 'saida'
}

export function groupsForSign(groups: Group[], sign: TransactionSign): Group[] {
  return groups.filter((group) => group.kind !== oppositeKind[sign])
}
