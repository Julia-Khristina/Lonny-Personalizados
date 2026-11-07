/* Imagens de placeholder geradas em SVG (sem dependência externa).
   Serão substituídas pelas fotos reais quando os dados forem enviados. */

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const SHAPES: Record<string, (c: string) => string> = {
  garrafa: (c) =>
    `<rect x="330" y="150" width="140" height="70" rx="14" fill="#2a1f1a"/>
     <rect x="280" y="210" width="240" height="470" rx="60" fill="${c}"/>
     <rect x="300" y="240" width="30" height="400" rx="15" fill="#fff" opacity=".18"/>`,
  caneca: (c) =>
    `<path d="M520 330 h50 a70 70 0 0 1 0 140 h-50" fill="none" stroke="${c}" stroke-width="34"/>
     <rect x="230" y="270" width="300" height="360" rx="34" fill="${c}"/>
     <rect x="255" y="295" width="26" height="300" rx="13" fill="#fff" opacity=".18"/>`,
  mochila: (c) =>
    `<path d="M330 240 a70 70 0 0 1 140 0" fill="none" stroke="#2a1f1a" stroke-width="24"/>
     <rect x="230" y="230" width="340" height="440" rx="70" fill="${c}"/>
     <rect x="290" y="470" width="220" height="150" rx="30" fill="#000" opacity=".12"/>`,
  caderno: (c) =>
    `<rect x="250" y="190" width="300" height="420" rx="16" fill="${c}"/>
     <rect x="250" y="190" width="40" height="420" rx="10" fill="#000" opacity=".18"/>
     <rect x="500" y="190" width="18" height="420" fill="#ff6200" opacity=".9"/>`,
  caneta: (c) =>
    `<g transform="rotate(-35 400 400)">
       <rect x="180" y="370" width="440" height="60" rx="30" fill="${c}"/>
       <polygon points="620,380 690,400 620,420" fill="#2a1f1a"/>
       <rect x="230" y="345" width="150" height="16" rx="8" fill="#888"/>
     </g>`,
  caixa: (c) =>
    `<polygon points="400,190 600,290 400,390 200,290" fill="${c}"/>
     <polygon points="200,290 400,390 400,630 200,530" fill="${c}" opacity=".78"/>
     <polygon points="600,290 400,390 400,630 600,530" fill="${c}" opacity=".6"/>`,
  tech: (c) =>
    `<rect x="250" y="230" width="300" height="360" rx="40" fill="${c}"/>
     <circle cx="400" cy="380" r="90" fill="#000" opacity=".2"/>
     <circle cx="400" cy="380" r="46" fill="#000" opacity=".25"/>`,
}

/** Placeholder de produto 800×800 com a forma do tipo de item. */
export function productPlaceholder(shape: keyof typeof SHAPES | string, color: string, label: string) {
  const draw = SHAPES[shape] ?? SHAPES.caixa
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="#ffffff"/>
    <ellipse cx="400" cy="700" rx="230" ry="26" fill="#000" opacity=".07"/>
    ${draw(color)}
    <text x="400" y="760" text-anchor="middle" font-family="Open Sauce Sans, system-ui, sans-serif" font-size="26" fill="#6b5360">${label}</text>
  </svg>`
  return svgUrl(svg)
}

/** Logo fictícia para pedidos de demonstração. */
export function demoLogo(text: string, color = '#1a0800') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240" viewBox="0 0 600 240">
    <circle cx="110" cy="120" r="80" fill="${color}"/>
    <circle cx="110" cy="120" r="34" fill="#fff"/>
    <text x="220" y="145" font-family="Georgia, serif" font-weight="700" font-size="80" fill="${color}">${text}</text>
  </svg>`
  return svgUrl(svg)
}
