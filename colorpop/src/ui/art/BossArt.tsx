import { Brutzel, type BrutzelMood } from './Brutzel'
import { Frostel } from './Frostel'

/** Renders the right boss character for a boss id. */
export function BossArt({ id, mood, size, className }: { id: string; mood: BrutzelMood; size: number; className?: string }) {
  return id === 'frostel' ? <Frostel mood={mood} size={size} className={className} /> : <Brutzel mood={mood} size={size} className={className} />
}
