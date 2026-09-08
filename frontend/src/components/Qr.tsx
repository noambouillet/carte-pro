import { QRCodeSVG } from 'qrcode.react'

type QrProps = {
  value: string
}

function Qr({ value }: QrProps) {
  return <QRCodeSVG value={value} size={200} />
}

export default Qr
