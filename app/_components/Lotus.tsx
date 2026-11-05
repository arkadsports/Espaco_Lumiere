// Ícone da marca (flor de lótus em traço dourado). Redesenhado em vetor a partir da logo enviada.
export default function Lotus({ size = 40, className }: { size?: number; className?: string }) {
  const w = (size * 690) / 420;
  return (
    <svg
      viewBox="300 370 690 420"
      width={w}
      height={size}
      className={className}
      role="img"
      aria-label="Espaço Lumière"
      fill="none"
      stroke="currentColor"
      strokeWidth={9}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M645 385C585 455 552 530 572 600C583 650 612 690 645 720C678 690 707 650 718 600C738 530 705 455 645 385Z" />
      <g>
        <path d="M408 487C470 486 530 500 565 528" />
        <path d="M408 487C400 580 480 690 645 720" />
        <path d="M320 634C380 600 440 590 500 596C560 603 610 650 645 720" />
        <path d="M320 634C380 740 520 790 645 720" />
      </g>
      <g transform="translate(1290 0) scale(-1 1)">
        <path d="M408 487C470 486 530 500 565 528" />
        <path d="M408 487C400 580 480 690 645 720" />
        <path d="M320 634C380 600 440 590 500 596C560 603 610 650 645 720" />
        <path d="M320 634C380 740 520 790 645 720" />
      </g>
    </svg>
  );
}
