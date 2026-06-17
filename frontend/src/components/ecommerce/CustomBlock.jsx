import React from 'react'

export default function CustomBlock({ content, background, textColor, padding }) {
  if (!content) return null
  
  return (
    <section 
      style={{ 
        background: background || 'transparent', 
        color: textColor || 'inherit',
        padding: padding || '0'
      }}
      className="max-w-7xl mx-auto"
    >
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </section>
  )
}
