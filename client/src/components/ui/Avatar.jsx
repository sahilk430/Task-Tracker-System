import { useState } from 'react'

const SIZES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?'

// Profile picture when the user has one (and it loads), otherwise initials
export default function Avatar({ name, src, size = 'md', className = '' }) {
  const [broken, setBroken] = useState(false)
  const base = `${SIZES[size]} rounded-full flex-shrink-0 ${className}`

  if (src && !broken) {
    return <img src={src} alt={name} onError={() => setBroken(true)} className={`${base} object-cover`} />
  }
  return (
    <div className={`${base} bg-blue-600 text-white font-semibold flex items-center justify-center`} aria-label={name}>
      {initials(name)}
    </div>
  )
}
