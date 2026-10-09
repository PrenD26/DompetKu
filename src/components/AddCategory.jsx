import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { btn, btn2, input, label } from '../lib/ui'

export default function AddCategory({ categories, defaultKind = 'pengeluaran', lockKind = false, onSaved, onClose }) {
  const [kind, setKind] = useState(defaultKind)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Nama kategori wajib diisi')
    if (categories.some((c) => c.kind === kind && c.name.toLowerCase() === n.toLowerCase()))
      return setError('Kategori itu sudah ada')
    setBusy(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({ kind, name: n })
      .select('id')
      .single()
    setBusy(false)
    if (error) return setError(error.message)
    onSaved(data.id)
  }

  return (
    <form onSubmit={submit}>
      <h3 className="text-lg font-extrabold">Tambah kategori</h3>
      <label className={label}>Jenis</label>
      <select className={input} value={kind} disabled={lockKind} onChange={(e) => setKind(e.target.value)}>
        <option value="pemasukan">Pemasukan</option>
        <option value="pengeluaran">Pengeluaran</option>
      </select>
      <label className={label}>Nama kategori</label>
      <input className={input} value={name} onChange={(e) => setName(e.target.value)}
             placeholder="misal: Hobi" />
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FBEAE8] px-3 py-2 text-sm text-neg">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={btn} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
        <button type="button" className={btn2} onClick={onClose}>Batal</button>
      </div>
    </form>
  )
}