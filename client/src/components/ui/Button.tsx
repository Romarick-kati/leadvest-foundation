import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { useTxNode } from '../../i18n/phrases';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'sun';
type Size = 'sm' | 'md' | 'lg';

// Buttons: one shape (rounded), restrained hover (colour and a 1px lift), comfortable tap
// sizes (44px and up, except compact table actions).
const base =
  'inline-flex max-w-full items-center justify-center gap-2 rounded-full text-center font-semibold no-underline transition-[background-color,box-shadow,color,border-color,transform] duration-200 ease-out focus-visible:outline-none focus-visible:shadow-focus enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 select-none motion-safe:hover:-translate-y-px';

const variants: Record<Variant, string> = {
  primary: 'btn-shine relative overflow-hidden bg-blue-600 text-white shadow-soft hover:bg-blue-700 hover:shadow-card',
  secondary: 'border border-line-strong bg-surface text-heading hover:border-blue-600 hover:text-blue-700',
  ghost: 'text-heading hover:bg-blue-50',
  danger: 'bg-danger text-white hover:bg-[#912018]',
  sun: 'bg-sun text-navy shadow-soft hover:bg-[#F2BB24]',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-4 text-sm',
  md: 'min-h-11 px-5 text-[0.95rem]',
  lg: 'min-h-12 px-6 text-base sm:px-7',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  const n = useTxNode();
  return (
    <Link data-button className={cn(buttonClass(variant, size, className), 'active:scale-[0.98]')} {...rest}>
      {icon}
      {n(children)}
    </Link>
  );
}
