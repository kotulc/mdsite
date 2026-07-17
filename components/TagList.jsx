/**
 * Renders page categories and tags as pill chips.
 * Categories use a distinct style from tags.
 */
import Chip from './Chip'


export default function TagList({ categories = [], tags = [] }) {
  if (!categories.length && !tags.length) return null
  return (
    <div className="tag-list">
      {categories.map(c => <Chip key={c} label={c} variant="category" />)}
      {tags.map(t => <Chip key={t} label={t} variant="tag" />)}
    </div>
  )
}
