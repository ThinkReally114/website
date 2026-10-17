import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './Magnetic.css';

type Variant = 'primary' | 'ghost' | 'quiet';

function classNames(variant: Variant, size: 'md' | 'sm', className?: string) {
  return `mbtn mbtn-${variant} mbtn-${size} ${className ?? ''}`.trim();
}

interface MagneticButtonProps {
  onClick?: () => void;
  children: ReactNode;
  variant?: Variant;
  size?: 'md' | 'sm';
  className?: string;
  ariaLabel?: string;
}

export function MagneticButton({
  onClick,
  children,
  variant = 'ghost',
  size = 'md',
  className,
  ariaLabel
}: MagneticButtonProps) {
  return (
    <button
      type="button"
      className={classNames(variant, size, className)}
      aria-label={ariaLabel}
      onClick={onClick}>
      {children}
    </button>
  );
}

interface MagneticLinkProps {
  to?: string;
  href?: string;
  children: ReactNode;
  variant?: Variant;
  size?: 'md' | 'sm';
  className?: string;
  ariaLabel?: string;
}

export function MagneticLink({
  to,
  href,
  children,
  variant = 'ghost',
  size = 'md',
  className,
  ariaLabel
}: MagneticLinkProps) {
  const classes = classNames(variant, size, className);

  if (href) {
    return (
      <a className={classes} href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel}>
        {children}
      </a>
    );
  }

  return (
    <Link className={classes} to={to ?? '/'} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
