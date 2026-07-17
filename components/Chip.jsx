/**
 * Pill chip for page categories and tags.
 * Shared by TagList and MetaSidebar; variant selects the chip-<variant> style.
 */
export default function Chip({ label, variant = 'tag' }) {
  return <span className={`chip chip-${variant}`}>{label}</span>
}
