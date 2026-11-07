import { LOGO_INK, LOGO_LARANJA, LOGO_ROSA } from './logoPaths'

/* ─────────────────────────────────────────────
   Logo oficial (manual ID_LONNY_SET2026)
   - layout "stacked": estrelas acima (versão principal)
   - layout "horizontal": estrelas à esquerda
   - layout "wordmark": só o nome
   - tone "color": LON laranja · NY rosa · Personalizados na cor do texto
   - tone "mono": tudo na cor do texto (use branco sobre laranja, rosa ou preto)
   ───────────────────────────────────────────── */

export const ROSA = '#FF0080'
export const LARANJA = '#FF6200'

/** Estrela de 4 pontas com lados côncavos, centrada em (0,0), raio 1. */
const SPARKLE =
  'M0,-1 C0.07,-0.42 0.2,-0.12 1,0 C0.2,0.12 0.07,0.42 0,1 C-0.07,0.42 -0.2,0.12 -1,0 C-0.2,-0.12 -0.07,-0.42 0,-1 Z'

function Sparkle({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return <path d={SPARKLE} fill={fill} transform={`translate(${cx} ${cy}) scale(${r})`} />
}

type Layout = 'stacked' | 'horizontal' | 'wordmark'

const VIEWBOX: Record<Layout, string> = {
  wordmark: '110 138 1142 375',
  horizontal: '-365 138 1617 375',
  stacked: '110 -160 1142 673',
}

export function Logo({
  layout = 'horizontal',
  tone = 'color',
  className,
  title = 'Lonny Personalizados',
}: {
  layout?: Layout
  tone?: 'color' | 'mono'
  className?: string
  title?: string
}) {
  const lar = tone === 'color' ? LARANJA : 'currentColor'
  const ros = tone === 'color' ? ROSA : 'currentColor'
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEWBOX[layout]}
      className={className}
      role="img"
      aria-label={title}
      fill="currentColor"
    >
      {layout === 'horizontal' && (
        <>
          <Sparkle cx={-214} cy={363} r={139} fill={ros} />
          <Sparkle cx={-45} cy={225} r={68} fill={lar} />
        </>
      )}
      {layout === 'stacked' && (
        <>
          <Sparkle cx={649} cy={-37} r={72} fill={ros} />
          <Sparkle cx={737} cy={-107} r={43} fill={lar} />
        </>
      )}
      {LOGO_INK.map((d, i) => <path key={`i${i}`} d={d} />)}
      {LOGO_LARANJA.map((d, i) => <path key={`l${i}`} d={d} fill={lar} />)}
      {LOGO_ROSA.map((d, i) => <path key={`r${i}`} d={d} fill={ros} />)}
    </svg>
  )
}

/** Só as estrelas — para favicon, avatares e detalhes decorativos. */
export function Sparkles({ className, tone = 'color' }: { className?: string; tone?: 'color' | 'mono' }) {
  return (
    <svg viewBox="-150 -120 300 260" className={className} aria-hidden="true" fill="currentColor">
      <Sparkle cx={-25} cy={30} r={100} fill={tone === 'color' ? ROSA : 'currentColor'} />
      <Sparkle cx={85} cy={-60} r={52} fill={tone === 'color' ? LARANJA : 'currentColor'} />
    </svg>
  )
}
