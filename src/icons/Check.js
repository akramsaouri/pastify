import React from 'react'

function Icon({checked}) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >{checked && <polyline stroke="var(--tertiary-color)" points="9 11 12 14 22 4"></polyline>}<path stroke="var(--gray-color)" d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
  )
}

export default Icon