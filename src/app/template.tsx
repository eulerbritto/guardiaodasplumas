// src/app/template.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Estados possíveis: 'initial' -> 'open' -> 'closing' -> 'done'
  // Se não estiver na Home ('/'), já começa como 'done' para pular a animação
  const [phase, setPhase] = useState<'initial' | 'open' | 'closing' | 'done'>(
    pathname === '/' ? 'initial' : 'done'
  )

  useEffect(() => {
    // Se NÃO estiver na Home, não faz nada com timers
    if (pathname !== '/') return;

    // 1. Logo que a tela monta, dispara a classe "open" para o pavão abrir a cauda
    const timerOpen = setTimeout(() => {
      setPhase('open')
    }, 50)

    // 2. Após 1 segundo (tempo de abrir + breve pausa visual), começa a fechar a cauda
    const timerClosing = setTimeout(() => {
      setPhase('closing')
    }, 1000)

    // 3. Após 1.7 segundos (quando o CSS de fechar terminar), some com a animação da DOM
    const timerDone = setTimeout(() => {
      setPhase('done')
    }, 1700)

    return () => {
      clearTimeout(timerOpen)
      clearTimeout(timerClosing)
      clearTimeout(timerDone)
    }
  }, [pathname])

  return (
    <>
      {/* O Pavão só é renderizado enquanto não estiver 'done' */}
      {phase !== 'done' && (
        <div 
          className={`peacock-transition ${phase === 'open' ? 'open' : ''} ${phase === 'closing' ? 'closing' : ''}`}
        >
          <div className="peacock-feather feather-1"></div>
          <div className="peacock-feather feather-2"></div>
          <div className="peacock-feather feather-3"></div>
          <div className="peacock-feather feather-4"></div>
          <div className="peacock-feather feather-5"></div>
          <div className="peacock-feather feather-6"></div>
          <div className="peacock-feather feather-7"></div>
          <div className="peacock-feather feather-8"></div>
          <div className="peacock-eye"></div>
        </div>
      )}

      {/* Conteúdo da página */}
      {children}
    </>
  )
}