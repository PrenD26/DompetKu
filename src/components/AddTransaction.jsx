import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { rupiah } from '../lib/format'
import { btn, btn2, input, label } from '../lib/ui'
import MoneyInput from './MoneyInput'
import AddWallet from './AddWallet'
import AddCategory from './AddCategory'

const today = () => new Date().toLocaleDateString('en-CA')
const NEW = '__new'
const alertBox = 'mt-3 rounded-xl bg-[#FBEAE8] px-3 py-2 text-sm text-neg'

export default function AddTransaction({ accounts, categories, reload, onSaved, onClose }) {
  const [view, setView] = useState('form')
  const [target, setTarget] = useState('from')
  const [kind, setKind] = useState('pemasukan')
  const [accountId, setAccountId] = useState((accounts.find((a) => a.kind === 'tunai') ?? accounts[0])?.id ?? '')
  const [toId, setToId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const balanceOf = (id) => Number(accounts.find((a) => a.id === id)?.balance ?? 0)
  const nominal = Number(amount) || 0
  const spends = kind === 'pengeluaran' || kind === 'transfer'
  const short = spends && nominal > balanceOf(accountId)
  const cats = categories.filter((c) => c.kind === kind)

  const pickWallet = (field) => (e) => {
    const v = e.target.value
    if (v === NEW) { setTarget(field); setView('wallet'); return }
    if (field === 'from') {
      setAccountId(v)
      if (v === toId) setToId('')
    } else {
      setToId(v)
    }
  }

  const pickCategory = (e) => {
    if (e.target.value === NEW) { setView('category'); return }
    setCategoryId(e.target.value)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!nominal) return setError('Nominal harus lebih dari 0')
    if (short) return setError('Saldo tidak mencukupi')
    if (kind === 'transfer' && (!toId || toId === accountId))
      return setError('Pilih wallet tujuan yang berbeda')
    setBusy(true)
    const { error } = await supabase.from('transactions').insert({
      kind,
      account_id: accountId,
      to_account_id: kind === 'transfer' ? toId : null,
      category_id: kind === 'transfer' ? null : categoryId || null,
      amount: nominal,
      note: note.trim() || null,
      occurred_on: date,
    })
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  if (view === 'wallet')
    return (
      <AddWallet
        accounts={accounts}
        onSaved={async (id) => {
          await reload()
          if (target === 'from') setAccountId(id)
          else setToId(id)
          setView('form')
        }}
        onClose={() => setView('form')}
      />
    )

  if (view === 'category')
    return (
      <AddCategory
        categories={categories}
        defaultKind={kind}
        lockKind
        onSaved={async (id) => { await reload(); setCategoryId(id); setView('form') }}
        onClose={() => setView('form')}
      />
    )

  return (
    <form onSubmit={submit}>
      <h3 className="text-lg font-extrabold">Catatan transaksi</h3>

      <label className={label}>Jenis</label>
      <select className={input} value={kind}
              onChange={(e) => { setKind(e.target.value); setCategoryId(''); setError('') }}>
        <option value="pemasukan">Pemasukan</option>
        <option value="pengeluaran">Pengeluaran</option>
        <option value="transfer">Transfer</option>
      </select>

      <label className={label}>{kind === 'transfer' ? 'Dari wallet' : 'Wallet'}</label>
      <select className={input} value={accountId} onChange={pickWallet('from')}>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        <option value={NEW}>+ Tambah wallet</option>
      </select>
      <p className="mt-1 text-xs text-muted">Saldo: {rupiah(balanceOf(accountId))}</p>

      {kind === 'transfer' ? (
        <>
          <label className={label}>Ke wallet</label>
          <select className={input} value={toId} onChange={pickWallet('to')}>
            <option value="">Pilih wallet tujuan</option>
            {accounts.filter((a) => a.id !== accountId)
              .map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            <option value={NEW}>+ Tambah wallet</option>
          </select>
        </>
      ) : (
        <>
          <label className={label}>Kategori</label>
          <select className={input} value={categoryId} onChange={pickCategory}>
            <option value="">Tanpa kategori</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value={NEW}>+ Tambah kategori</option>
          </select>
        </>
      )}

      <label className={label}>Nominal</label>
      <MoneyInput value={amount} onChange={(v) => { setAmount(v); setError('') }} />
      {short && (
        <p role="alert" className={alertBox}>
          Saldo tidak mencukupi. Saldo wallet ini {rupiah(balanceOf(accountId))}.
        </p>
      )}

      <label className={label}>Keterangan</label>
      <input className={input} value={note} onChange={(e) => setNote(e.target.value)}
             placeholder="misal: makan mie ayam 2 porsi" />
      <label className={label}>Tanggal</label>
      <input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      {error && <p role="alert" className={alertBox}>{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={btn} disabled={busy || short}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
        <button type="button" className={btn2} onClick={onClose}>Batal</button>
      </div>
    </form>
  )
}