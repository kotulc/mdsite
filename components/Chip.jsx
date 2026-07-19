/**
 * Pill chip for page categories and tags.
 * Used by TagList and consumer components; variant selects the chip-<variant> style.
 */
export default function Chip({ label, variant = 'tag' }) {
  return <span className={`chip chip-${variant}`}>{label}</span>
}
