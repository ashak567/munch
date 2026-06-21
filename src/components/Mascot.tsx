import React from 'react'

export type MascotCharacter = 'general' | 'chef' | 'showtime' | 'coach' | 'shopper'
export type MascotExpression = 'idle' | 'happy' | 'think' | 'wry'

interface MascotProps {
  character?: MascotCharacter
  expression?: MascotExpression
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
}

const SIZE_MAP = {
  xs: 'w-8 h-8',
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32'
}

export default function Mascot({ 
  character = 'general', 
  expression = 'idle', 
  size = 'md', 
  className = '' 
}: MascotProps) {
  
  // Custom size string or mapping
  const sizeClass = typeof size === 'string' ? SIZE_MAP[size] : ''
  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : undefined

  // Animation class based on expression
  const getAnimationClass = () => {
    if (expression === 'happy') return 'animate-celebrate'
    if (expression === 'wry') return 'animate-sway'
    return 'animate-float'
  }

  // Draw appropriate accessory based on character
  const renderAccessory = () => {
    switch (character) {
      case 'chef':
        // Tall white Chef Hat
        return (
          <g id="chef-hat">
            {/* Puffy top */}
            <path 
              d="M 36 22 C 30 10, 42 6, 50 16 C 58 6, 70 10, 64 22 Z" 
              fill="#FFFFFF" 
              stroke="#4A4A4A" 
              strokeWidth="2.5" 
              strokeLinejoin="round"
            />
            <circle cx="43" cy="14" r="7" fill="#FFFFFF" stroke="#4A4A4A" strokeWidth="2.5" />
            <circle cx="57" cy="14" r="7" fill="#FFFFFF" stroke="#4A4A4A" strokeWidth="2.5" />
            <circle cx="50" cy="10" r="8" fill="#FFFFFF" stroke="#4A4A4A" strokeWidth="2.5" />
            {/* Hat band */}
            <rect 
              x="40" 
              y="20" 
              width="20" 
              height="6" 
              rx="1.5" 
              fill="#FFFFFF" 
              stroke="#4A4A4A" 
              strokeWidth="2.5" 
            />
          </g>
        )
      case 'showtime':
        // Retro 3D Glasses
        return (
          <g id="glasses" className="translate-y-1">
            {/* Frames */}
            <rect x="31" y="42" width="16" height="12" rx="2" fill="#FF5E5E" stroke="#4A4A4A" strokeWidth="2.5" />
            <rect x="53" y="42" width="16" height="12" rx="2" fill="#5EFFFF" stroke="#4A4A4A" strokeWidth="2.5" />
            {/* Bridge */}
            <rect x="47" y="45" width="6" height="3" fill="#4A4A4A" />
            {/* Temple connection */}
            <line x1="28" y1="46" x2="31" y2="46" stroke="#4A4A4A" strokeWidth="2.5" />
            <line x1="69" y1="46" x2="72" y2="46" stroke="#4A4A4A" strokeWidth="2.5" />
          </g>
        )
      case 'coach':
        // Yellow striped Sweatband
        return (
          <g id="sweatband" className="translate-y-[-6px]">
            <rect x="28" y="32" width="44" height="7" rx="2.5" fill="#FFE08A" stroke="#4A4A4A" strokeWidth="2.5" />
            <line x1="32" y1="35.5" x2="68" y2="35.5" stroke="#E6A15C" strokeWidth="1.5" strokeDasharray="3 2" />
          </g>
        )
      case 'shopper':
        // Small brown shopping bag next to the mascot
        return (
          <g id="shopping-bag" className="translate-x-[4px] translate-y-[6px]">
            {/* Handles */}
            <path d="M 16 66 Q 21 58 26 66" fill="none" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" />
            <path d="M 18 66 Q 21 60 24 66" fill="none" stroke="#4A4A4A" strokeWidth="1" strokeLinecap="round" />
            {/* Bag Body */}
            <path 
              d="M 12 66 L 30 66 L 33 86 L 9 86 Z" 
              fill="#E6AC8E" 
              stroke="#4A4A4A" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />
            {/* Clover logo on bag */}
            <path d="M 21 73 Q 18 73 21 76 Q 24 73 21 73 Z" fill="#8FD9A8" />
          </g>
        )
      default:
        return null
    }
  }

  // Draw mouth expression
  const renderMouth = () => {
    switch (expression) {
      case 'happy':
        // Huge open smile
        return (
          <g id="mouth-happy">
            <path d="M 43 54 Q 50 64 57 54 Z" fill="#FF8E8E" stroke="#4A4A4A" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 45 54 Q 50 54 55 54" fill="none" stroke="#4A4A4A" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )
      case 'think':
        // Small focused neutral line
        return <path d="M 46 56 Q 50 55 54 56" fill="none" stroke="#4A4A4A" strokeWidth="2.5" strokeLinecap="round" />
      case 'wry':
        // Curved wry mouth
        return <path d="M 45 57 Q 48 53 55 56" fill="none" stroke="#4A4A4A" strokeWidth="2.5" strokeLinecap="round" />
      case 'idle':
      default:
        // Standard smile
        return <path d="M 46 54 Q 50 58 54 54" fill="none" stroke="#4A4A4A" strokeWidth="2.5" strokeLinecap="round" />
    }
  }

  // Draw eyes based on expression
  const renderEyes = () => {
    // Shuffling/Thinking eyes look sideways
    const isThinking = expression === 'think'
    const pupilOffset = isThinking ? 2.5 : 0

    return (
      <g id="eyes">
        {/* Left eye */}
        <circle cx={42 + pupilOffset} cy="50" r="4.5" fill="#4A4A4A" />
        <circle cx={41.5 + pupilOffset} cy="48" r="1.5" fill="#FFFFFF" />
        
        {/* Right eye */}
        <circle cx={58 + pupilOffset} cy="50" r="4.5" fill="#4A4A4A" />
        <circle cx={57.5 + pupilOffset} cy="48" r="1.5" fill="#FFFFFF" />
      </g>
    )
  }

  return (
    <div 
      className={`relative inline-block ${sizeClass} ${className}`}
      style={sizeStyle}
    >
      <svg 
        viewBox="0 0 100 100" 
        className={`w-full h-full ${getAnimationClass()}`}
        style={{ transformOrigin: 'bottom center' }}
      >
        <g id="mascot-body">
          {/* 4 leaf clover base */}
          <path d="M 50 50 Q 30 30 50 10 Q 70 30 50 50 Z" fill="#8FD9A8" stroke="#6BBF8A" strokeWidth="2.5" />
          <path d="M 50 50 Q 70 30 90 50 Q 70 70 50 50 Z" fill="#8FD9A8" stroke="#6BBF8A" strokeWidth="2.5" />
          <path d="M 50 50 Q 70 70 50 90 Q 30 70 50 50 Z" fill="#8FD9A8" stroke="#6BBF8A" strokeWidth="2.5" />
          <path d="M 50 50 Q 30 70 10 50 Q 30 30 50 50 Z" fill="#8FD9A8" stroke="#6BBF8A" strokeWidth="2.5" />
          
          {/* Cheeks */}
          <ellipse cx="36" cy="55" rx="3.5" ry="2" fill="#FFCFB3" />
          <ellipse cx="64" cy="55" rx="3.5" ry="2" fill="#FFCFB3" />
          
          {/* Face details */}
          {renderEyes()}
          {renderMouth()}
        </g>

        {/* Character-specific accessory overlays */}
        {renderAccessory()}
      </svg>
    </div>
  )
}
