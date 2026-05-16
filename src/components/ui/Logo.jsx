import logoWhite from '../../assets/logos/logo-white.svg'
import logoBlack from '../../assets/logos/logo-black.svg'
import flag from '../../assets/logos/flag.svg'

function Logo({ variant = 'white', size = 40, ...props }) {
  let logoSrc
  
  switch (variant) {
    case 'black':
      logoSrc = logoBlack
      break
    case 'flag':
      logoSrc = flag
      break
    case 'white':
    default:
      logoSrc = logoWhite
  }
  
  return (
    <img 
      src={logoSrc} 
      alt="NEXT Vision" 
      style={{ height: size, width: 'auto' }}
      {...props}
    />
  )
}

export default Logo