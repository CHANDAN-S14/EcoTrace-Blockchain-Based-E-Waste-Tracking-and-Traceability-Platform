import React from 'react'
import { Leaf } from 'lucide-react'

export function WelcomeBanner() {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200">
      {/* Background authentic e-waste & greenery image with rich overlay */}
      <img
        src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1400&auto=format&fit=crop&q=80"
        alt="E-waste recycling and electronics"
        className="w-full h-44 sm:h-52 object-cover object-center brightness-75"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#063D27]/95 via-[#063D27]/75 to-transparent flex items-center justify-between p-6 sm:p-8">
        {/* Left Welcome Text */}
        <div className="max-w-xl space-y-1.5 text-white">
          <span className="inline-block text-[11px] font-bold tracking-widest text-emerald-300 uppercase">
            WELCOME BACK
          </span>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-white tracking-tight leading-tight">
            Tracking E-Waste <br className="hidden sm:inline" />
            for a Cleaner, Greener Tomorrow
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 font-medium pt-1">
            Transparent collection &bull; Traceable custody &bull; Reliable recycling &bull; Verified impact
          </p>
        </div>

        {/* Right Floating Badge matching reference image */}
        <div className="hidden lg:flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/60 text-gray-800 shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800 leading-snug max-w-[160px]">
            Every device recycled builds a cleaner planet.
          </span>
        </div>
      </div>
    </div>
  )
}
