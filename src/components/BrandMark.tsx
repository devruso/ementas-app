interface BrandMarkProps {
  alt?: string;
  className?: string;
}

export const BrandMark = ({
  alt = 'Instituto de Computacao da UFBA',
  className = '',
}: BrandMarkProps) => (
  <img
    src="/ic-logo-mark.svg"
    alt={alt}
    className={className}
    width={46}
    height={58}
    decoding="async"
  />
);
