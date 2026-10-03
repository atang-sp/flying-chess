import QRCode from 'qrcode'

// A public entry link, never the current URL (which may carry auth/room tokens).
export const POSTER_GAME_URL = 'https://atang-sp.github.io/flying-chess/'

export interface SharePosterContent {
  readonly brand: string
  readonly title: string
  readonly lines: readonly string[]
  readonly invitation: string
  readonly nickname?: string
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  y: number,
  size: number,
  maxLines: number
): number {
  context.font = `600 ${size}px system-ui, sans-serif`
  const characters = Array.from(text.replace(/\s+/g, ' ').trim())
  const rows: string[] = []
  let row = ''
  for (const character of characters) {
    if (context.measureText(row + character).width > 724) {
      rows.push(row)
      row = character
    } else row += character
  }
  if (row) rows.push(row)
  const visible = rows.slice(0, maxLines)
  if (rows.length > maxLines) {
    let last = visible[maxLines - 1]
    while (context.measureText(`${last}…`).width > 724)
      last = Array.from(last).slice(0, -1).join('')
    visible[maxLines - 1] = `${last}…`
  }
  for (const line of visible) {
    context.fillText(line, 88, y)
    y += size * 1.45
  }
  return y
}

export async function createSharePoster(
  content: SharePosterContent
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 1200
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  const gradient = context.createLinearGradient(0, 0, 900, 1200)
  gradient.addColorStop(0, '#234638')
  gradient.addColorStop(1, '#0b1915')
  context.fillStyle = gradient
  context.fillRect(0, 0, 900, 1200)
  context.strokeStyle = '#cbaa63'
  context.lineWidth = 2
  context.strokeRect(40, 40, 820, 1120)
  context.fillStyle = '#cbaa63'
  drawText(context, content.brand, 120, 30, 2)

  // A code-drawn die keeps export offline and free of external asset dependencies.
  context.fillStyle = '#e9dcc0'
  context.fillRect(88, 216, 100, 100)
  context.fillStyle = '#234638'
  for (const [x, y] of [
    [112, 240],
    [164, 240],
    [112, 266],
    [164, 266],
    [112, 292],
    [164, 292],
  ]) {
    context.beginPath()
    context.arc(x, y, 7, 0, Math.PI * 2)
    context.fill()
  }
  context.fillStyle = '#fff5df'
  let y = drawText(context, content.title, 390, 52, 2) + 24
  context.fillStyle = '#d6dfd8'
  for (const line of content.lines.slice(0, 3)) y = drawText(context, line, y, 27, 1) + 18
  if (content.nickname) {
    context.fillStyle = '#cbaa63'
    drawText(context, content.nickname.slice(0, 40), Math.min(y + 12, 860), 28, 2)
  }
  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, POSTER_GAME_URL, {
    width: 180,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
  context.drawImage(qrCanvas, 88, 930, 180, 180)
  context.fillStyle = '#e9dcc0'
  context.font = '600 25px system-ui, sans-serif'
  // Footer stays clear of the QR code in every language.
  const invitation = Array.from(content.invitation)
  let footerLine = ''
  let footerY = 986
  for (const character of invitation) {
    if (context.measureText(footerLine + character).width > 460) {
      context.fillText(footerLine, 302, footerY)
      footerY += 36
      footerLine = character
      if (footerY > 1094) break
    } else footerLine += character
  }
  if (footerY <= 1094) context.fillText(footerLine, 302, footerY)
  // Keep preview/download independent of blob URL and FileReader resource loads,
  // which WebKit can reject under offline network emulation.
  const dataUrl = canvas.toDataURL('image/png')
  if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error('PNG export failed')
  const binary = atob(dataUrl.split(',')[1])
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  return { blob: new Blob([bytes], { type: 'image/png' }), dataUrl }
}

export function canSharePoster(file: File): boolean {
  try {
    return typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true
  } catch {
    return false
  }
}
