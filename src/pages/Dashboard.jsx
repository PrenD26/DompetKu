import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rupiah } from '../lib/format'
import { btn, btn2, card } from '../lib/ui'
import AddWallet from '../components/AddWallet'
import AddCategory from '../components/AddCategory'
import AddTransaction from '../components/AddTransaction'
import Manage from '../components/Manage'

const KIND_LABEL = { tunai: 'Tunai', bank: 'Bank', ewallet: 'E-wallet' }

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center"
         onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"
           onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export default function Dashboard({ session }) {
  const [accounts, setAccounts] = useState([])
  const [archived, setArchived] = useState([])
  const [txs, setTxs] = useState([])
  const [categories, setCategories] = useState([])
  const [panel, setPanel] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [a, t, c] = await Promise.all([
      supabase.from('account_balances').select('*'),
      supabase.from('transactions').select('*')
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false }).limit(30),
      supabase.from('categories').select('*').order('name'),
    ])
    const err = a.error || t.error || c.error
    setError(err ? err.message : '')
    const sorted = (a.data ?? []).sort(
      (x, y) => (x.kind === 'tunai' ? -1 : 0) - (y.kind === 'tunai' ? -1 : 0) || x.name.localeCompare(y.name)
    )
    setAccounts(sorted.filter((x) => !x.archived_at))
    setArchived(sorted.filter((x) => x.archived_at))
    setTxs(t.data ?? [])
    setCategories(c.data ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  const close = () => setPanel(null)
  const saved = () => { setPanel(null); load() }

  const everyWallet = [...accounts, ...archived]
  const balanceOf = (id) => Number(everyWallet.find((a) => a.id === id)?.balance ?? 0)

  const remove = async (id) => {
    const t = txs.find((x) => x.id === id)
    if (t.kind === 'pemasukan' && balanceOf(t.account_id) < t.amount)
      return setError('Tidak bisa menghapus: saldo wallet akan menjadi minus.')
    if (t.kind === 'transfer' && balanceOf(t.to_account_id) < t.amount)
      return setError('Tidak bisa menghapus: saldo wallet tujuan akan menjadi minus.')
    if (!window.confirm('Hapus transaksi ini?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0)
  const byKind = (k) => accounts.filter((a) => a.kind === k).reduce((s, a) => s + Number(a.balance), 0)
  const accName = Object.fromEntries(everyWallet.map((a) => [a.id, a.name]))
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const meta = session.user.user_metadata
  const name = meta.full_name || session.user.email

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {meta.avatar_url ? (
            <img src={meta.avatar_url} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-200 font-bold text-brand-600">
              {name[0]?.toUpperCase()}
            </span>
          )}
          <div>
            <div className="text-sm text-muted">Selamat datang,</div>
            <div className="font-bold">{name}</div>
          </div>
        </div>
        <button className={btn2} onClick={() => supabase.auth.signOut()}>Keluar</button>
      </header>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FBEAE8] px-3 py-2 text-sm text-neg">{error}</p>}

      <section className="mt-5 rounded-3xl bg-brand-500 p-6 text-white">
        <div className="text-sm">Total Saldo <span className="opacity-80">· uang siap pakai</span></div>
        <div className="mb-4 mt-1 text-4xl font-extrabold">{rupiah(total)}</div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>Tunai {rupiah(byKind('tunai'))}</span>
          <span>Bank {rupiah(byKind('bank'))}</span>
          <span>E-wallet {rupiah(byKind('ewallet'))}</span>
        </div>
      </section>

      <div className="my-5 flex flex-wrap gap-3">
        <button className={btn} disabled={!loaded} onClick={() => setPanel('transaksi')}>+ Catatan Transaksi</button>
        <button className={btn2} disabled={!loaded} onClick={() => setPanel('wallet')}>+ Tambah Wallet</button>
        <button className={btn2} disabled={!loaded} onClick={() => setPanel('kategori')}>+ Tambah Kategori</button>
        <button className={btn2} disabled={!loaded} onClick={() => setPanel('kelola')}>Kelola</button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className={card}>
          <h2 className="mb-2 font-bold">Wallet</h2>
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-t border-line py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
                  {a.name[0]?.toUpperCase()}
                </span>
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-muted">{KIND_LABEL[a.kind]}</div>
                </div>
              </div>
              <b>{rupiah(a.balance)}</b>
            </div>
          ))}
        </section>

        <section className={card}>
          <h2 className="mb-2 font-bold">Transaksi terbaru</h2>
          {txs.length === 0 && <p className="text-sm text-muted">Belum ada transaksi.</p>}
          {txs.map((t) => {
            const isIn = t.kind === 'pemasukan'
            const isOut = t.kind === 'pengeluaran'
            const title = t.kind === 'transfer'
              ? `Transfer ${accName[t.account_id]} ke ${accName[t.to_account_id]}`
              : t.note || catName[t.category_id] || 'Tanpa keterangan'
            const sub = t.kind === 'transfer'
              ? t.occurred_on
              : `${catName[t.category_id] || 'Tanpa kategori'} · ${accName[t.account_id]} · ${t.occurred_on}`
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 border-t border-line py-3">
                <div className="flex items-center gap-3">
                  <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold '
                    + (isIn ? 'bg-[#E3F4EC] text-pos' : isOut ? 'bg-[#FBEAE8] text-neg' : 'bg-brand-100 text-brand-600')}>
                    {isIn ? '+' : isOut ? '−' : '⇄'}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs text-muted">
                      {sub} ·{' '}
                      <button className="cursor-pointer underline" onClick={() => remove(t.id)}>Hapus</button>
                    </div>
                  </div>
                </div>
                <b className={'whitespace-nowrap ' + (isIn ? 'text-pos' : isOut ? 'text-neg' : '')}>
                  {isIn ? '+ ' : isOut ? '- ' : ''}{rupiah(t.amount)}
                </b>
              </div>
            )
          })}
        </section>
      </div>

      {panel && loaded && (
        <Modal onClose={close}>
          {panel === 'wallet' && <AddWallet accounts={everyWallet} onSaved={saved} onClose={close} />}
          {panel === 'kategori' && <AddCategory categories={categories} onSaved={saved} onClose={close} />}
          {panel === 'transaksi' && (
            <AddTransaction accounts={accounts} categories={categories}
                            reload={load} onSaved={saved} onClose={close} />
          )}
          {panel === 'kelola' && (
            <Manage accounts={accounts} archived={archived} categories={categories}
                    reload={load} onClose={close} />
          )}
        </Modal>
      )}
    </div>
  )
}