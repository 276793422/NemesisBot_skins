/**
 * openlikebuddy — 自绘 SVG 图标（24×24 viewBox 线性风格）。
 */
import { h, type FunctionalComponent } from 'vue'

const P: Record<string, string[]> = {
  plus: ['M12 5v14', 'M5 12h14'],
  chat: ['M21 11.5a8.4 8.4 0 0 1-8.5 8.3 9 9 0 0 1-3.9-.9L3 20l1.2-4.3a8 8 0 0 1-1.2-4.2A8.4 8.4 0 0 1 11.5 3.2 8.4 8.4 0 0 1 21 11.5z'],
  bot: ['M12 3v3', 'M7 6h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z', 'M9 12h.01', 'M15 12h.01'],
  folder: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  star: ['M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z'],
  zap: ['M13 2L4 14h6l-1 8 9-12h-6z'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  search: ['M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', 'M21 21l-4.3-4.3'],
  gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 20c1.5-3.2 4.5-5 8-5s6.5 1.8 8 5'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  chevD: ['M6 9l6 6 6-6'],
  chevR: ['M9 6l6 6-6 6'],
  send: ['M4 12l16-8-5 16-3.5-6z'],
  stop: ['M8 8h8v8H8z'],
  trash: ['M5 7h14', 'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2', 'M7 7l1 13a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L17 7'],
  edit: ['M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z'],
  doc: ['M6 3h8l4 4v14H6z', 'M14 3v4h4'],
  clock: ['M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z', 'M12 7v5l3 3'],
  check: ['M5 13l4 4 10-10'],
  monitor: ['M4 5h16v11H4z', 'M9 20h6', 'M12 16v4'],
  palette: ['M12 21a9 9 0 1 1 0-18c4.5 0 8 3 8 6.5 0 2.5-2 4.5-4.5 4.5H14a1.5 1.5 0 0 0-1 2.6c.3.4.5.8.5 1.2 0 .7-.6 1.2-1.5 1.2z', 'M7.5 11h.01', 'M10 8h.01', 'M14.5 8h.01'],
  info: ['M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z', 'M12 8h.01', 'M12 11v5'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5'],
  key: ['M15 9a6 6 0 1 1-4.2 1.8L3 18v3h3l1.5-1.5V17H9v-2h2.5l1.3-1.3A6 6 0 0 1 15 9z'],
  moon: ['M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z'],
  gift: ['M4 11h16v10H4z', 'M4 7h16v4H4z', 'M12 7v14', 'M12 7c-1.5-3-6-3.5-6-1s4 1 6 1zm0 0c1.5-3 6-3.5 6-1s-4 1-6 1z'],
  login: ['M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5', 'M4 12h11', 'M11 8l4 4-4 4'],
  globe: ['M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z', 'M3 12h18', 'M12 3c2.5 2.4 4 5.5 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.5-4-9s1.5-6.6 4-9z'],
  cpu: ['M8 8h8v8H8z', 'M5 5h14v14H5z', 'M9 2v3', 'M15 2v3', 'M9 19v3', 'M15 19v3', 'M2 9h3', 'M2 15h3', 'M19 9h3', 'M19 15h3'],
  layers: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'],
  terminal: ['M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M7 9l3 3-3 3', 'M12 15h5'],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'M9 13h6', 'M9 17h6'],
  db: ['M12 8c4.4 0 8-1.1 8-2.5S16.4 3 12 3 4 4.1 4 5.5 7.6 8 12 8z', 'M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13', 'M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5'],
  refresh: ['M20 12a8 8 0 1 1-2.3-5.6', 'M20 4v4h-4'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
}

export const NbIcon: FunctionalComponent<{ name: string; size?: number }> = (props) => {
  const paths = P[props.name] ?? []
  const size = props.size ?? 16
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.6,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    paths.map((d) => h('path', { d }))
  )
}
NbIcon.props = { name: { type: String, required: true }, size: { type: Number, default: 16 } }
