import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { btn, btn2, input, label } from '../lib/ui'
import MoneyInput from './MoneyInput'

export default function AddWallet({ accounts, onSaved, onClose }) {
  const [kind, setKind] = useState('bank')
  const [name, setName] = useState('')
  const [opening, setOpening] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Nama wallet wajib diisi')
    if (accounts.some((a) => a.name.toLowerCase() === n.toLowerCase()))
      return setError('Nama wallet itu sudah dipakai')
    setBusy(true)
    const { data, error } = await supabase
      .from('accounts')
      .insert({ name: n, kind, opening_balance: Number(opening) || 0 })
      .select('id')
      .single()
    setBusy(false)
    if (error) return setError(error.message)
    onSaved(data.id)
  }

  return (
    <form onSubmit={submit}>
      <h3 className="text-lg font-extrabold">Tambah wallet</h3>
      <label className={label}>Jenis</label>
      <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="bank">Bank</option>
        <option value="ewallet">E-wallet</option>
      </select>
      <label className={label}>Nama wallet</label>
      <input className={input} value={name} onChange={(e) => setName(e.target.value)}
             placeholder={kind === 'bank' ? 'misal: BCA' : 'misal: GoPay'} />
      <label className={label}>Saldo awal</label>
      <MoneyInput value={opening} onChange={setOpening} />
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FBEAE8] px-3 py-2 text-sm text-neg">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={btn} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
        <button type="button" className={btn2} onClick={onClose}>Batal</button>
      </div>
    </form>
  )
}