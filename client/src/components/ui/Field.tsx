import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff } from './icons';
import { cn } from '../../lib/cn';

const control =
  'block w-full rounded border bg-surface px-3.5 py-2.5 text-body text-ink placeholder:text-ink-muted/80 transition-[border-color,box-shadow] focus:border-blue focus:outline-none focus:shadow-focus disabled:bg-navy-50 disabled:text-ink-muted';

interface FieldShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  optional?: boolean;
}

function FieldShell({ id, label, hint, error, required, optional, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-label text-heading">
        {label}
        {required && <span aria-hidden className="ml-0.5 text-danger">*</span>}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">(optional)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, hint, error, optional, id, className, type, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={rest.required} optional={optional}>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          type={isPassword && show ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fid, hint, error)}
          className={cn(control, error ? 'border-danger' : 'border-line-strong', isPassword && 'pr-12', className)}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r text-ink-muted hover:text-heading"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </FieldShell>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, hint, error, optional, id, className, rows = 5, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={rest.required} optional={optional}>
      <textarea
        ref={ref}
        id={fid}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(control, 'resize-y', error ? 'border-danger' : 'border-line-strong', className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  optional?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, options, placeholder, optional, id, className, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={rest.required} optional={optional}>
      <select
        ref={ref}
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(control, 'appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10', error ? 'border-danger' : 'border-line-strong', className)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23142B4A' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, hint, error, id, className, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={fid}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fid, hint, error)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line-strong accent-blue-600"
          {...rest}
        />
        <label htmlFor={fid} className="cursor-pointer text-sm text-ink">
          {label}
          {hint && (
            <span id={`${fid}-hint`} className="mt-0.5 block text-caption text-ink-muted">
              {hint}
            </span>
          )}
        </label>
      </div>
      {error && (
        <p id={`${fid}-error`} className="pl-8 text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

/** Accessible on/off switch. */
export function Toggle({ label, hint, checked, onChange, disabled, id }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; id?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={fid} className="text-sm font-semibold text-heading">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-caption text-ink-muted">{hint}</p>}
      </div>
      <button
        id={fid}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50',
          checked ? 'bg-blue-600' : 'bg-line-strong',
        )}
      >
        <span className={cn('inline-block h-6 w-6 rounded-full bg-surface shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
      </button>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded border border-[#FECDCA] bg-danger-50 px-4 py-3 text-sm font-medium text-danger">
      {message}
    </div>
  );
}
