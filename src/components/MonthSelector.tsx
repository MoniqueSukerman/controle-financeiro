interface MonthSelectorProps {
  months: string[]
  selected: number
  onSelect: (index: number) => void
}

export function MonthSelector({ months, selected, onSelect }: MonthSelectorProps) {
  return (
    <select className="month-selector" value={selected} onChange={(e) => onSelect(Number(e.target.value))}>
      {months.map((month, index) => (
        <option value={index} key={month}>
          {month}
        </option>
      ))}
    </select>
  )
}
