import { input } from '../lib/ui'

export default function MoneyInput({ value, onChange, placeholder = '0' }) {
  const shown = value ? new Intl.NumberFormat('id-ID').format(Number(value)) : ''
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">Rp</span>
      <input
        className={input + ' pl-10'}
        inputMode="numeric"
        value={shown}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13))}
      />
    </div>
  )
}