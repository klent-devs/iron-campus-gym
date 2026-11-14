import { initials } from '@icg/demo-data';

const SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-11 w-11 border-2 border-brand text-sm',
  xl: 'h-24 w-24 border-[3px] border-brand text-[32px]',
};

/** Round grey circle with someone's initials (no photos are stored). */
export function Avatar({ name, size = 'sm', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center rounded-full bg-line font-heading font-semibold ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
