import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useApp, type Screen } from '../../app/AppContext'
import { sfx } from '../../audio/sfx'
import { equipItem, ITEM_ORDER, ITEMS, ROLE_LABELS, synergiesFor, unequipItem } from '../../game/items'
import { levelFromXp, SKIN_ORDER, SKINS } from '../../game/progression'
import { buyItem } from '../../game/save'
import { SkinSwatch } from '../components/ResultOverlay'
import { MAX_EQUIPPED, type ItemId } from '../../game/types'
import { Backdrop } from '../art/Backdrop'
import { CoinIcon, ItemIcon, LockIcon } from '../art/Icons'
import { BackButton, Btn, CoinPill, Toast } from '../components/Common'

export function Inventory({ back }: { back: Screen }) {
  const { save, updateSave, go } = useApp()
  const [selected, setSelected] = useState<ItemId>(save.equipped[0] ?? 'wordBlade')
  const [toast, setToast] = useState<string | null>(null)
  const [popSlot, setPopSlot] = useState<number | null>(null)
  const item = ITEMS[selected]
  const owned = save.owned.includes(selected)
  const equipped = save.equipped.includes(selected)
  const synergies = synergiesFor(save.equipped)
  const player = levelFromXp(save.xp)

  const flash = (t: string) => {
    setToast(t)
    setTimeout(() => setToast(null), 1500)
  }

  const toggle = (id: ItemId) => {
    if (save.equipped.includes(id)) {
      const r = unequipItem(save.equipped, id)
      if (r.ok) {
        sfx.deselect()
        updateSave((s) => ({ ...s, equipped: r.equipped }))
      }
      return
    }
    const r = equipItem(save.equipped, save.owned, id)
    if (!r.ok) {
      sfx.invalid()
      flash(r.reason === 'full' ? 'Alle 3 Slots belegt – lege zuerst ein Item ab' : 'Item noch nicht freigeschaltet')
      return
    }
    sfx.equip()
    setPopSlot(r.equipped.length - 1)
    setTimeout(() => setPopSlot(null), 500)
    updateSave((s) => ({ ...s, equipped: r.equipped }))
  }

  const buy = (id: ItemId) => {
    const next = buyItem(save, id)
    if (!next) {
      sfx.invalid()
      flash('Nicht genug Münzen')
      return
    }
    sfx.coin()
    updateSave(() => next)
    flash(`${ITEMS[id].name} freigeschaltet!`)
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-[520px] flex-col px-4 pb-8 pt-[max(10px,env(safe-area-inset-top))]">
      <Backdrop theme="menu" />
      <div className="relative z-10 flex items-center justify-between">
        <BackButton onClick={() => go(back)} />
        <div className="text-pop-sm text-2xl">Ausrüstung</div>
        <CoinPill coins={save.coins} />
      </div>

      {/* slots */}
      <div className="panel-dark relative z-10 mt-4 px-3 pb-3 pt-2">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-white/75">Ausgerüstet</span>
          <span className="text-pop-sm text-sm">
            {save.equipped.length}/{MAX_EQUIPPED}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => {
            const id = save.equipped[i]
            return (
              <motion.button
                key={i}
                type="button"
                className="relative grid aspect-square place-items-center rounded-[20px]"
                style={{
                  background: id ? 'linear-gradient(180deg,#FFFDF6,#EBDDC4)' : 'rgba(255,255,255,.07)',
                  boxShadow: id ? '0 0 0 4px #3B2160, inset 0 -6px 0 #D5BF99, 0 6px 0 4px rgba(20,5,40,.35)' : 'inset 0 3px 8px rgba(0,0,0,.35), 0 0 0 3px rgba(255,255,255,.12)',
                }}
                animate={popSlot === i ? { scale: [1, 1.18, 1], rotate: [0, -6, 0] } : { scale: 1 }}
                transition={{ duration: 0.45 }}
                onClick={() => id && setSelected(id)}
                aria-label={id ? `${ITEMS[id].name} (ausgerüstet)` : `Slot ${i + 1} leer`}
              >
                {id ? (
                  <ItemIcon id={id} size={62} />
                ) : (
                  <span className="font-display text-[13px] font-semibold text-white/50">
                    Slot {i + 1}
                    <br />
                    frei
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {synergies.length > 0 && (
        <div className="relative z-10 mt-3 space-y-1.5">
          {synergies.map((sy) => (
            <p key={sy.name} className="rounded-xl bg-[#FFD23F]/90 px-3 py-1.5 text-[12.5px] font-bold leading-snug text-[#4A2A00] shadow-[0_0_0_2.5px_#3B2160]">
              <span className="font-extrabold">Synergie „{sy.name}“:</span> {sy.text}
            </p>
          ))}
        </div>
      )}

      {/* detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          className="panel relative z-10 mt-5 p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex gap-3">
            <div className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-2xl" style={{ background: `${item.accent}22`, boxShadow: `inset 0 0 0 3px ${item.accent}55` }}>
              <ItemIcon id={selected} size={60} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[22px] font-bold leading-tight text-[#3B2160]">{item.name}</div>
              <div className="text-[13.5px] font-bold text-[#6a5a8c]">{item.short}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white" style={{ background: ROLE_LABELS[item.role].color }}>
                  {ROLE_LABELS[item.role].label}
                </span>
                {item.combatOnly && <span className="inline-block rounded-full bg-[#FF6B8B]/15 px-2 py-0.5 text-[11px] font-extrabold text-[#C92D63]">Nur im Kampf</span>}
              </div>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {item.rules.map((r) => (
              <li key={r} className="flex gap-2 rounded-xl bg-white/80 px-3 py-2 text-[13.5px] font-bold leading-snug text-[#3B2160] shadow-[inset_0_-3px_0_#E7D3B3]">
                <span className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.accent }} />
                {r}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            {owned ? (
              <Btn variant={equipped ? 'cream' : 'green'} className="w-full" onClick={() => toggle(selected)} silent>
                {equipped ? 'Ablegen' : 'Ausrüsten'}
              </Btn>
            ) : item.price > 0 ? (
              <div className="flex flex-col gap-2">
                <Btn className="w-full" onClick={() => buy(selected)} silent disabled={save.coins < item.price}>
                  <CoinIcon size={26} /> {item.price} – Freischalten
                </Btn>
                <p className="text-center text-[12.5px] font-bold text-[#8a7aa8]">Freischaltung: {item.unlock}</p>
              </div>
            ) : (
              <p className="rounded-xl bg-[#3B2160]/[0.06] px-3 py-2 text-center text-[13px] font-bold text-[#6a5a8c]">
                <LockIcon size={16} className="mr-1 inline-block align-[-2px]" />
                Freischaltung: {item.unlock}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* collection */}
      <div className="relative z-10 mt-5">
        <div className="mb-2 px-1 text-[12px] font-extrabold uppercase tracking-[0.16em] text-white/80">Sammlung</div>
        <div className="grid grid-cols-3 gap-3">
          {ITEM_ORDER.map((id) => {
            const own = save.owned.includes(id)
            const eq = save.equipped.includes(id)
            const sel = id === selected
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  sfx.click()
                  setSelected(id)
                }}
                onDoubleClick={() => own && toggle(id)}
                className="relative flex flex-col items-center rounded-[18px] px-1 pb-2 pt-2"
                style={{
                  background: own ? 'linear-gradient(180deg,#FFFDF6,#F3E4C8)' : 'linear-gradient(180deg,#8E80AE,#6E6290)',
                  boxShadow: `0 0 0 ${sel ? 4 : 3}px ${sel ? '#FFC93D' : '#3B2160'}, inset 0 -5px 0 ${own ? '#D5BF99' : '#4E4370'}, 0 5px 0 3px rgba(20,5,40,.3)`,
                  transform: sel ? 'translateY(-3px)' : undefined,
                  transition: 'transform .15s',
                }}
                aria-label={`${ITEMS[id].name}${own ? '' : ' (gesperrt)'}${eq ? ', ausgerüstet' : ''}`}
              >
                <div style={{ filter: own ? undefined : 'grayscale(.7) brightness(.8)' }}>
                  <ItemIcon id={id} size={50} />
                </div>
                <div className={`mt-1 text-center font-display text-[12.5px] font-semibold leading-tight ${own ? 'text-[#3B2160]' : 'text-white'}`}>{ITEMS[id].name}</div>
                <div className="mt-0.5 text-[9.5px] font-extrabold uppercase tracking-wide" style={{ color: own ? ROLE_LABELS[ITEMS[id].role].color : '#E2DAF0' }}>
                  {ROLE_LABELS[ITEMS[id].role].label}
                </div>
                {eq && <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#2FCF8F] text-sm font-bold text-white shadow-[0_0_0_2.5px_#3B2160]">✓</span>}
                {!own && (
                  <span className="absolute -right-1.5 -top-1.5">
                    <LockIcon size={24} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {/* tile designs (cosmetics) */}
      <div className="relative z-10 mt-6">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-white/80">Steindesign</span>
          <span className="text-[11px] font-bold text-white/60">Spielerlevel {player.level}</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {SKIN_ORDER.map((id) => {
            const own = save.skins.includes(id)
            const on = save.skin === id
            return (
              <button
                key={id}
                type="button"
                disabled={!own}
                onClick={() => {
                  sfx.equip()
                  updateSave((s) => ({ ...s, skin: id }))
                }}
                className="flex flex-col items-center gap-1 rounded-2xl px-1 py-2"
                style={{ background: on ? 'rgba(255,211,63,.25)' : 'rgba(255,255,255,.07)', boxShadow: on ? '0 0 0 3px #FFC93D' : '0 0 0 2px rgba(255,255,255,.12)' }}
                aria-label={`${SKINS[id].name}${own ? (on ? ', aktiv' : '') : `, gesperrt: ${SKINS[id].unlock}`}`}
              >
                <span style={{ filter: own ? undefined : 'grayscale(.8) brightness(.7)' }}>
                  <SkinSwatch id={id} size={36} />
                </span>
                <span className="text-center text-[9.5px] font-extrabold leading-tight text-white/85">{own ? SKINS[id].name : SKINS[id].unlock}</span>
              </button>
            )
          })}
        </div>
      </div>
      <Toast text={toast} tone="warn" />
    </div>
  )
}
