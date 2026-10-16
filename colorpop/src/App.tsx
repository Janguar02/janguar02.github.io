import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { lazy, Suspense } from 'react'
import { AppProvider, useApp } from './app/AppContext'
import { Backdrop } from './ui/art/Backdrop'
import { Logo } from './ui/art/Logo'
import { Btn } from './ui/components/Common'
import { GameScreen } from './ui/screens/GameScreen'
import { MainMenu } from './ui/screens/MainMenu'

const Inventory = lazy(() => import('./ui/screens/Inventory').then(m => ({ default: m.Inventory })))
const Settings = lazy(() => import('./ui/screens/Settings').then(m => ({ default: m.Settings })))
const WorldMap = lazy(() => import('./ui/screens/WorldMap').then(m => ({ default: m.WorldMap })))

function Loading({ error }: { error: string | null }) {
  return (
    <div className="relative grid min-h-[100dvh] place-items-center">
      <Backdrop theme="menu" />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <Logo size={48} />
        {error ? (
          <div className="panel max-w-[300px] p-4 text-center">
            <p className="font-display font-semibold text-[#3B2160]">Wörterbuch konnte nicht geladen werden.</p>
            <Btn variant="green" size="sm" className="mt-3" onClick={() => window.location.reload()}>
              Erneut versuchen
            </Btn>
          </div>
        ) : (
          <div className="w-[220px]">
            <div className="bar h-4">
              <motion.div
                className="bar-fill"
                style={{ background: 'linear-gradient(180deg,#FFE36B,#FFB21E)' }}
                initial={{ width: '5%' }}
                animate={{ width: '92%' }}
                transition={{ duration: 2.5, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-center font-display text-sm font-semibold text-white/80">Lade 140.000 Wörter …</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Router() {
  const { screen, dict, dictError, reduced } = useApp()
  if (!dict) return <Loading error={dictError} />
  const key = screen.name === 'game' ? `game-${screen.key}` : screen.name
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}><AnimatePresence mode="wait">
      <motion.div key={key} className="min-h-[100dvh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
        <Suspense fallback={<div role="status" className="grid min-h-[100dvh] place-items-center font-display text-white">Wird geöffnet …</div>}>
        {screen.name === 'menu' && <MainMenu />}
        {screen.name === 'map' && <WorldMap focus={screen.focus} />}
        {screen.name === 'inventory' && <Inventory back={screen.back} />}
        {screen.name === 'settings' && <Settings back={screen.back} />}
        {screen.name === 'game' && <GameScreen levelId={screen.levelId} resume={screen.resume} />}
        </Suspense>
      </motion.div>
    </AnimatePresence></MotionConfig>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  )
}
