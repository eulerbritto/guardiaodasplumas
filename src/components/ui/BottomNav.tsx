// src/components/ui/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ListOrdered, QrCode, PlusCircle, Settings } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', icon: Home, label: 'Início' },
    { href: '/aves', icon: ListOrdered, label: 'Plantel' },
    { href: '/novo', icon: PlusCircle, label: 'Registrar', highlight: true },
    { href: '/scanner', icon: QrCode, label: 'Scanner' },
    { href: '/config', icon: Settings, label: 'Ajustes' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-2 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          if (item.highlight) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full pt-1 pb-1">
                <div className="bg-emerald-600 p-2 rounded-full -mt-6 border-4 border-gray-50 shadow-sm">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-medium text-emerald-600 mt-1">
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full pt-1 pb-1">
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-600' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}