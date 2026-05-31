export default function AppLogo({ size = 'md' }) {
  const cfg = {
    sm: { h: 'h-7',  fontSize: '22px' },
    md: { h: 'h-9',  fontSize: '26px' },
    lg: { h: 'h-14', fontSize: '42px' },
  }
  const { h, fontSize } = cfg[size] || cfg.md
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.svg" className={`${h} w-auto object-contain`} alt="" />
      <span className="text-white leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize, letterSpacing: '0.12em', marginTop: '10px' }}>
        GETAFIX
      </span>
    </div>
  )
}
