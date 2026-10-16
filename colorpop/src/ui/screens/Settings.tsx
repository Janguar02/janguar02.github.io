import { useState } from 'react'
import { useApp, type Screen } from '../../app/AppContext'
import { clearRun, defaultSave } from '../../game/save'
import { Backdrop } from '../art/Backdrop'
import { SoundIcon } from '../art/Icons'
import { BackButton, Btn, Modal } from '../components/Common'
import { DifficultyPicker } from '../components/DifficultyPicker'

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1.5 rounded-2xl bg-[#3B2160]/10 p-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className="min-h-[44px] rounded-xl font-display text-[15px] font-semibold transition"
          style={
            value === v
              ? { background: 'linear-gradient(180deg,#A58BFF,#6C4BEF)', color: '#fff', boxShadow: 'inset 0 -4px 0 #4123b0, 0 0 0 2.5px #3B2160' }
              : { color: '#5b4a7c' }
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Settings({ back }: { back: Screen }) {
  const { save, updateSave, go, storage } = useApp()
  const [confirm, setConfirm] = useState(false)
  const set = (patch: Partial<typeof save.settings>) => updateSave((s) => ({ ...s, settings: { ...s.settings, ...patch } }))

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-[520px] flex-col px-4 pb-8 pt-[max(10px,env(safe-area-inset-top))]">
      <Backdrop theme="menu" />
      <div className="relative z-10 flex items-center gap-3">
        <BackButton onClick={() => go(back)} />
        <div className="text-pop-sm text-2xl">Einstellungen</div>
      </div>

      <div className="panel relative z-10 mt-5 space-y-5 p-5">
        <section>
          <h3 className="mb-2 font-display text-lg font-bold text-[#3B2160]">Sound</h3>
          <button
            type="button"
            role="switch"
            aria-checked={save.settings.sound}
            onClick={() => set({ sound: !save.settings.sound })}
            className="flex w-full items-center gap-3 rounded-2xl bg-white/80 p-3 text-left shadow-[inset_0_-3px_0_#E7D3B3]"
          >
            <SoundIcon size={30} on={save.settings.sound} className="text-[#6C4BEF]" />
            <span className="flex-1 font-display text-[16px] font-semibold text-[#3B2160]">Soundeffekte</span>
            <span className="relative h-8 w-14 rounded-full transition" style={{ background: save.settings.sound ? '#2FCF8F' : '#C9BBD9', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.2)' }}>
              <span className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all" style={{ left: save.settings.sound ? 28 : 4 }} />
            </span>
          </button>
        </section>

        <section>
          <h3 className="mb-2 font-display text-lg font-bold text-[#3B2160]">Schwierigkeit</h3>
          <DifficultyPicker />
        </section>

        <section>
          <h3 className="mb-1 font-display text-lg font-bold text-[#3B2160]">Animationen</h3>
          <p className="mb-2 text-[13px] font-bold text-[#6a5a8c]">„System“ folgt der Einstellung „Bewegung reduzieren“ deines Geräts.</p>
          <Segmented
            value={save.settings.motion}
            options={[
              ['system', 'System'],
              ['full', 'Voll'],
              ['reduced', 'Reduziert'],
            ]}
            onChange={(motion) => set({ motion })}
          />
        </section>

        <section>
          <h3 className="mb-2 font-display text-lg font-bold text-[#3B2160]">Spielstand</h3>
          <p className="mb-2 text-[13px] font-bold text-[#6a5a8c]">Dein Fortschritt wird automatisch auf diesem Gerät gespeichert.</p>
          <Btn variant="berry" size="sm" className="w-full" onClick={() => setConfirm(true)}>
            Fortschritt zurücksetzen
          </Btn>
        </section>

        <section className="rounded-2xl bg-[#3B2160]/[0.06] p-3 text-[12px] font-bold leading-relaxed text-[#6a5a8c]">
          <div className="mb-1 font-display text-sm font-bold text-[#3B2160]">Credits</div>
          Wörterbuch: Schnittmenge aus igerman98/de_DE_frami (Björn Jacke, F. M. Baumann; GPL-2.0/GPL-3.0/OASIS-OGPL) und der Wiktionary-basierten Liste „all-the-german-words“
          (MIT). Schriften: Fredoka &amp; Nunito (SIL Open Font License). Grafiken, Figuren und Sounds: eigens für dieses Projekt erstellt.
        </section>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <div className="panel p-5 text-center">
          <h3 className="font-display text-xl font-bold text-[#3B2160]">Wirklich zurücksetzen?</h3>
          <p className="mt-1 text-sm font-bold text-[#6a5a8c]">Münzen, Sterne und freigeschaltete Items gehen verloren.</p>
          <div className="mt-4 flex gap-2">
            <Btn variant="cream" size="sm" className="flex-1" onClick={() => setConfirm(false)}>
              Abbrechen
            </Btn>
            <Btn
              variant="berry"
              size="sm"
              className="flex-1"
              onClick={() => {
                clearRun(storage)
                updateSave((s) => ({ ...defaultSave(), settings: s.settings }))
                setConfirm(false)
                go({ name: 'menu' })
              }}
            >
              Zurücksetzen
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
