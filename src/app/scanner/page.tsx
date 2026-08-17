// src/app/scanner/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/ui/BottomNav'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QrCode, AlertCircle } from 'lucide-react'

export default function ScannerPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    // Evita inicializar o scanner duas vezes no modo de desenvolvimento do React
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true, // Adiciona botão de lanterna se o celular suportar
        },
        false
      )

      scannerRef.current.render(
        (decodedText) => {
          // Quando lê com sucesso
          if (scannerRef.current) {
            scannerRef.current.clear() // Para a câmera
          }
          
          try {
            // Como o nosso QR Code guarda a URL completa, extraímos apenas o caminho (/aves/id)
            const url = new URL(decodedText)
            router.push(url.pathname)
          } catch {
            // Fallback caso o QR code contenha apenas o ID
            if (decodedText.startsWith('http')) {
               router.push(decodedText)
            } else {
               router.push(`/aves/${decodedText}`)
            }
          }
        },
        (err) => {
          // Erros de leitura ignoramos, pois ele tenta ler 10x por segundo
        }
      )
    }

    // Cleanup: Desliga a câmera quando sair da página
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => {
          console.error("Erro ao limpar scanner", e)
        })
        scannerRef.current = null
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 pb-20 flex flex-col">
      {/* Cabeçalho Escuro */}
      <header className="bg-gray-900 text-white p-4 sticky top-0 z-10 flex items-center gap-3">
        <QrCode className="w-6 h-6 text-emerald-500" />
        <h1 className="text-xl font-bold">Escanear Identificação</h1>
      </header>

      {/* Área da Câmera */}
      <main className="flex-1 flex flex-col items-center p-4">
        <p className="text-gray-400 text-center mb-6 text-sm">
          Aponte a câmera para o QR Code da ave para abrir a ficha completa imediatamente.
        </p>

        <div className="w-full max-w-sm bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800">
          {/* A div onde a biblioteca injeta o vídeo da câmera */}
          <div id="qr-reader" className="w-full" />
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </main>

      <BottomNav />

      {/* CSS Global injetado para limpar o layout padrão feio da biblioteca html5-qrcode */}
      <style dangerouslySetInnerHTML={{__html: `
        #qr-reader { border: none !important; }
        #qr-reader button { 
          background-color: #059669 !important; 
          color: white !important; 
          border: none !important; 
          padding: 10px 20px !important; 
          border-radius: 8px !important; 
          font-weight: bold !important; 
          margin: 10px 0 !important;
          cursor: pointer;
        }
        #qr-reader select {
          padding: 8px !important;
          border-radius: 8px !important;
          margin-bottom: 10px !important;
          background: #1f2937 !important;
          color: white !important;
          border: 1px solid #374151 !important;
        }
        #qr-reader__dashboard_section_csr span { color: white !important; }
        #qr-reader a { color: #34d399 !important; }
      `}} />
    </div>
  )
}