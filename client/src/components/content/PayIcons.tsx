/** Small drawn marks for the two ways to pay, so people recognise them at a glance. */
export function MomoIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} role="img" aria-label="MTN Mobile Money" focusable="false">
      <rect width="56" height="56" rx="14" fill="#FFCC00" />
      <text x="28" y="24" textAnchor="middle" fontSize="12" fontWeight="800" fill="#111" fontFamily="Arial, Helvetica, sans-serif">MTN</text>
      <text x="28" y="41" textAnchor="middle" fontSize="15" fontWeight="800" fill="#111" fontFamily="Arial, Helvetica, sans-serif">MoMo</text>
    </svg>
  );
}

export function CardIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} role="img" aria-label="Bank card" focusable="false">
      <rect width="56" height="56" rx="14" fill="#1D4ED8" />
      <rect x="9" y="16" width="38" height="25" rx="4" fill="#fff" />
      <rect x="9" y="21" width="38" height="6" fill="#1E3A8A" />
      <rect x="13" y="32" width="12" height="3" rx="1.5" fill="#94A3B8" />
    </svg>
  );
}

export function VisaMark({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 16" className={className} role="img" aria-label="Visa" focusable="false">
      <text x="24" y="13" textAnchor="middle" fontSize="15" fontWeight="800" fontStyle="italic" fill="#1A1F71" fontFamily="Arial, Helvetica, sans-serif">VISA</text>
    </svg>
  );
}

export function MastercardMark({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={className} role="img" aria-label="Mastercard" focusable="false">
      <circle cx="11" cy="10" r="8" fill="#EB001B" />
      <circle cx="21" cy="10" r="8" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  );
}

export function OrangeMoneyIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} role="img" aria-label="Orange Money" focusable="false">
      <rect width="56" height="56" rx="14" fill="#FF7900" />
      <text x="28" y="24" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">Orange</text>
      <text x="28" y="41" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">Money</text>
    </svg>
  );
}

/** Both mobile money logos together, so nobody thinks only one network is accepted. */
export function MobileMoneyIcons({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} aria-hidden>
      <MomoIcon className="absolute left-0 top-0 h-9 w-9 shadow-soft" />
      <OrangeMoneyIcon className="absolute bottom-0 right-0 h-9 w-9 rounded-[10px] ring-2 ring-surface" />
    </span>
  );
}

/** Small side by side marks used under a button label. */
export function MobileMoneyMarks() {
  return (
    <span className="flex items-center gap-2" aria-hidden>
      <MomoIcon className="h-6 w-6" />
      <OrangeMoneyIcon className="h-6 w-6" />
    </span>
  );
}
