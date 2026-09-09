import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import './QrScanner.css'

type QrScannerProps = {
  onScan: (value: string) => void
  onClose: () => void
}

function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const scannedRef = useRef(false)

  const [error, setError] = useState('')

  useEffect(() => {
    const video = videoRef.current

    if (video === null)
      return

    const videoElement: HTMLVideoElement = video
    const reader = new BrowserMultiFormatReader()

    readerRef.current = reader
    scannedRef.current = false

    async function startScanner() {
      try {
        if (!window.isSecureContext) {
          setError('La caméra nécessite une connexion sécurisée. Ouvrez cette page en HTTPS.')
          return
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError('La caméra n’est pas disponible dans ce navigateur.')
          return
        }

        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
            },
          },
          videoElement,
          (result) => {
            if (!result || scannedRef.current)
              return

            const value = result.getText().trim()
            if (!value) {
              setError('Le QR code ne contient aucune référence valide.')
              return
            }

            scannedRef.current = true
            controls.stop()
            controlsRef.current = null
            onScan(value)
          },
        )

        controlsRef.current = controls
      } catch (caughtError) {
        const name =
          caughtError instanceof DOMException ? caughtError.name : ''

        if (name === 'NotAllowedError') {
          setError('L’accès à la caméra a été refusé. Autorisez la caméra dans les réglages du navigateur.')
        } else if (name === 'NotFoundError') {
          setError('Aucune caméra disponible sur cet appareil.')
        } else if (name === 'NotReadableError') {
          setError('La caméra est déjà utilisée par une autre application.')
        } else {
          setError('Impossible d’ouvrir la caméra. Vérifiez les autorisations.')
        }
      }
    }

    startScanner()

    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
      readerRef.current = null
    }
  }, [onScan])

  function handleClose() {
    controlsRef.current?.stop()
    controlsRef.current = null
    onClose()
  }

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true">
      <div className="scanner-modal">
        <div className="scanner-header">
          <div>
            <h2>Scanner le QR code</h2>
            <p>Placez le QR code du salarié dans le cadre.</p>
          </div>

          <button
            className="scanner-close"
            type="button"
            aria-label="Fermer le scanner"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div className="scanner-view">
          <video
            ref={videoRef}
            className="scanner-video"
            muted
            playsInline
          />

          <div className="scanner-frame" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        {error && (
          <p className="scanner-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="scanner-cancel"
          type="button"
          onClick={handleClose}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

export default QrScanner
