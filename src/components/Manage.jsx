import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rupiah } from '../lib/format'
import { btn, btn2, input, label } from '../lib/ui'

const KIND_LABEL = { tunai: 'Tunai', bank: 'Bank', ewallet: 'E-wallet' }
const alertBox = 'mt-3 rounded-xl bg-[#FBEAE8] px-3 py-2 text-sm text-neg'
const link = 'cursor-pointer text-sm font-medium text-brand-600 underline'

function Rename({ title, current, taken, table, id, onDone, onClose }) {
  const [name, setName] = useState(current)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Nama wajib diisi')
    if (n.toLowerCase() !== current.toLowerCase() && taken.some((x) => x.toLowerCase() === n.toLowerCase()))
      return setError('Nama itu sudah dipakai')
    setBusy(true)
    const { error } = await supabase.from(table).update({ name: n }).eq('id', id)
    setBusy(false)
    if (error) return setError(error.message)
    onDone()
  }

  return (
    <form onSubmit={submit}>
      <h3 className="text-lg font-extrabold">{title}</h3>
      <label className={label}>Nama baru</label>
      <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      {error && <p role="alert" className={alertBox}>{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={btn} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
        <button type="button" className={btn2} onClick={onClose}>Batal</button>
      </div>
    </form>
  )
}

function RemoveWallet({ wallet, others, onDone, onClose }) {
  const [count, setCount] = useState(null)
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const balance = Number(wallet.balance)
  const mustMove = balance > 0

  useEffect(() => {
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`account_id.eq.${wallet.id},to_account_id.eq.${wallet.id}`)
      .then(({ count, error }) => (error ? setError(error.message) : setCount(count ?? 0)))
  }, [wallet.id])

  const archive = mustMove || count > 0

  const run = async () => {
    if (mustMove && !to) return setError('Pilih wallet tujuan untuk memindahkan saldo')
    setBusy(true)
    const { error } = archive
      ? await supabase.rpc('archive_wallet', { p_id: wallet.id, p_to: mustMove ? to : null })
      : await supabase.from('accounts').delete().eq('id', wallet.id)
    setBusy(false)
    if (error) return setError(error.message)
    onDone()
  }

  return (
    <div>
      <h3 className="text-lg font-extrabold">{archive ? 'Arsipkan' : 'Hapus'} wallet {wallet.name}</h3>
      {count === null && !error && <p className="mt-3 text-sm text-muted">Memeriksa...</p>}
      {count !== null && (
        <div className="mt-3 text-sm">
          {archive ? (
            <p>
              Wallet ini akan diarsipkan: hilang dari daftar dan pilihan, tetapi riwayat transaksinya tetap
              tersimpan dan wallet bisa dipulihkan kapan saja.
            </p>
          ) : (
            <p>Wallet ini belum punya transaksi dan saldonya Rp 0, jadi akan dihapus permanen.</p>
          )}
          {mustMove && (
            <>
              <p className="mt-3">
                Saldo {rupiah(balance)} akan dipindahkan lewat transfer ke:
              </p>
              <select className={input + ' mt-2'} value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">Pilih wallet tujuan</option>
                {others.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className={alertBox}>{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={btn} disabled={busy || count === null} onClick={run}>
          {busy ? 'Memproses...' : archive ? 'Arsipkan' : 'Hapus permanen'}
        </button>
        <button className={btn2} onClick={onClose}>Batal</button>
      </div>
    </div>
  )
}

function RemoveCategory({ category, categories, onDone, onClose }) {
  const [count, setCount] = useState(null)
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const options = categories.filter((c) => c.kind === category.kind && c.id !== category.id)

  useEffect(() => {
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', category.id)
      .then(({ count, error }) => (error ? setError(error.message) : setCount(count ?? 0)))
  }, [category.id])

  const run = async () => {
    if (count > 0 && !to) return setError('Pilih kategori pengganti')
    setBusy(true)
    const { error } = await supabase.rpc('delete_category', {
      p_old: category.id,
      p_new: count > 0 ? to : null,
    })
    setBusy(false)
    if (error) return setError(error.message)
    onDone()
  }

  return (
    <div>
      <h3 className="text-lg font-extrabold">Hapus kategori {category.name}</h3>
      {count === null && !error && <p className="mt-3 text-sm text-muted">Memeriksa...</p>}
      {count === 0 && <p className="mt-3 text-sm">Kategori ini belum dipakai, jadi langsung dihapus.</p>}
      {count > 0 && (
        <div className="mt-3 text-sm">
          <p>Kategori ini dipakai di {count} transaksi. Pindahkan semuanya ke kategori:</p>
          <select className={input + ' mt-2'} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Pilih kategori pengganti</option>
            {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      {error && <p role="alert" className={alertBox}>{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={btn} disabled={busy || count === null} onClick={run}>
          {busy ? 'Memproses...' : 'Hapus kategori'}
        </button>
        <button className={btn2} onClick={onClose}>Batal</button>
      </div>
    </div>
  )
}

export default function Manage({ accounts, archived, categories, reload, onClose }) {
  const [tab, setTab] = useState('wallet')
  const [view, setView] = useState(null)
  const [error, setError] = useState('')

  const done = async () => { await reload(); setView(null) }
  const back = () => setView(null)

  const restore = async (w) => {
    if (accounts.some((a) => a.name.toLowerCase() === w.name.toLowerCase()))
      return setError(`Sudah ada wallet aktif bernama ${w.name}. Ganti nama salah satunya dulu.`)
    const { error } = await supabase.from('accounts').update({ archived_at: null }).eq('id', w.id)
    if (error) return setError(error.message)
    setError('')
    await reload()
  }

  if (view?.type === 'rename-wallet')
    return <Rename title="Ganti nama wallet" current={view.item.name} table="accounts" id={view.item.id}
                   taken={[...accounts, ...archived].map((a) => a.name)} onDone={done} onClose={back} />
  if (view?.type === 'remove-wallet')
    return <RemoveWallet wallet={view.item} others={accounts.filter((a) => a.id !== view.item.id)}
                         onDone={done} onClose={back} />
  if (view?.type === 'rename-cat')
    return <Rename title="Ganti nama kategori" current={view.item.name} table="categories" id={view.item.id}
                   taken={categories.filter((c) => c.kind === view.item.kind).map((c) => c.name)}
                   onDone={done} onClose={back} />
  if (view?.type === 'remove-cat')
    return <RemoveCategory category={view.item} categories={categories} onDone={done} onClose={back} />

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold">Kelola</h3>
        <button className={btn2} onClick={onClose}>Tutup</button>
      </div>

      <div className="my-4 flex gap-2">
        {[['wallet', 'Wallet'], ['kategori', 'Kategori']].map(([key, text]) => (
          <button key={key} onClick={() => { setTab(key); setError('') }}
                  className={'cursor-pointer rounded-xl px-4 py-2 text-sm font-bold '
                    + (tab === key ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-600')}>
            {text}
          </button>
        ))}
      </div>

      {error && <p role="alert" className={alertBox}>{error}</p>}

      {tab === 'wallet' && (
        <div>
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border-t border-line py-3">
              <div>
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted">{KIND_LABEL[a.kind]} · {rupiah(a.balance)}</div>
              </div>
              {a.kind === 'tunai' ? (
                <span className="text-xs text-muted">Bawaan</span>
              ) : (
                <div className="flex gap-3">
                  <button className={link} onClick={() => setView({ type: 'rename-wallet', item: a })}>Ganti nama</button>
                  <button className={link} onClick={() => setView({ type: 'remove-wallet', item: a })}>Hapus</button>
                </div>
              )}
            </div>
          ))}

          {archived.length > 0 && (
            <>
              <h4 className="mb-1 mt-5 text-sm font-bold text-muted">Diarsipkan</h4>
              {archived.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 border-t border-line py-3">
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="flex gap-3">
                    <button className={link} onClick={() => setView({ type: 'rename-wallet', item: a })}>Ganti nama</button>
                    <button className={link} onClick={() => restore(a)}>Pulihkan</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'kategori' && (
        <div>
          {[['pemasukan', 'Pemasukan'], ['pengeluaran', 'Pengeluaran']].map(([kind, text]) => (
            <div key={kind} className="mb-4">
              <h4 className="mb-1 text-sm font-bold text-muted">{text}</h4>
              {categories.filter((c) => c.kind === kind).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 border-t border-line py-3">
                  <div className="text-sm font-medium">{c.name}</div>
                  {c.user_id ? (
                    <div className="flex gap-3">
                      <button className={link} onClick={() => setView({ type: 'rename-cat', item: c })}>Ganti nama</button>
                      <button className={link} onClick={() => setView({ type: 'remove-cat', item: c })}>Hapus</button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">Bawaan</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}