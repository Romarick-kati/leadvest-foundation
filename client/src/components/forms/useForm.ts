import { useState } from 'react';
import { ApiError } from '../../lib/api';
import { translateServer, useT } from '../../i18n';

/**
 * Minimal form state helper: values, field errors from the server, a submitting flag and a
 * general error message. The server is the source of truth for validation.
 */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const t = useT();
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: '' }));
  };

  const bind = (key: keyof T & string) => ({
    name: key,
    value: (values[key] ?? '') as string,
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value as T[typeof key]),
  });

  const bindCheck = (key: keyof T & string) => ({
    name: key,
    checked: Boolean(values[key]),
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.checked as T[typeof key]),
  });

  async function submit<R>(fn: (v: T) => Promise<R>): Promise<R | undefined> {
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    try {
      const result = await fn(values);
      setDirty(false);
      return result;
    } catch (err) {
      // Messages are shown in the visitor's language when a translation exists.
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, translateServer(t, v)])));
        setFormError(err.code === 'network' ? t('errors.network') : translateServer(t, err.message));
      } else {
        setFormError(t('errors.generic'));
      }
      return undefined;
    } finally {
      setSubmitting(false);
    }
  }

  return { values, setValues, set, bind, bindCheck, errors, setErrors, formError, setFormError, submitting, submit, dirty, setDirty };
}
