'use client'

import { useCallback, useState } from 'react'

interface CopyableAddressProps {
  address: string
  className?: string
}

export function CopyableAddress({ address, className = '' }: CopyableAddressProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent any parent link navigation
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  return (
    <button
      onClick={handleCopy}
      className={`group flex items-center gap-2 text-gray-300 text-sm break-all text-left hover:text-white transition-colors cursor-pointer ${className}`}
    >
      <span>{address}</span>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        className={`w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity ${copied ? 'text-green-500' : ''}`}
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {copied ? (
          // Checkmark icon
          <path d="M20 6L9 17L4 12" />
        ) : (
          // Clipboard icon
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
    </button>
  )
} 