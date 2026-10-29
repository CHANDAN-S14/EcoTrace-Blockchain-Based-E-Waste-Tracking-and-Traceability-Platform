import React from 'react'
import { Loader2 } from 'lucide-react'

export function LoadingState({ message = 'Loading records...', size = 'md' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Loader2 className={`animate-spin text-[#176B45] ${size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'}`} />
      {message && <p className="text-xs text-[#66756D] mt-3 font-medium">{message}</p>}
    </div>
  )
}
