interface YearSelectorProps {
  years: number[]
  selected: number
  onSelect: (year: number) => void
}

export function YearSelector({ years, selected, onSelect }: YearSelectorProps) {
  return (
    <select className="year-selector" value={selected} onChange={(e) => onSelect(Number(e.target.value))}>
      {years.map((year) => (
        <option value={year} key={year}>
          {year}
        </option>
      ))}
    </select>
  )
}
