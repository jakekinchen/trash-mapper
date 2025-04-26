'use client'

import React from 'react'
import Link from 'next/link'
import { TrashIcon } from './trash-icon'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full sage-gradient text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-center md:justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="bg-white/20 p-2.5 rounded-full flex items-center justify-center">
            <TrashIcon className="h-6 w-6 text-white trash-icon" />
          </div>
          <span className="text-xl font-bold tracking-wide">Trash Mapper ATX</span>
        </Link>
        <div className="hidden md:flex space-x-4">
          {/* Add additional navigation items here when needed */}
        </div>
      </div>
    </nav>
  )
} 