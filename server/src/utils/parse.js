// Copies the listed keys that are present (not undefined) in `source`.
// Type casting ('' → null, '4' → 4, date strings → Date) is left to the Mongoose schema.
function pick(source, keys) {
  const out = {}
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key]
  return out
}

// Safe case-insensitive "contains" match for user-provided search text
const containsRegex = (text) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

module.exports = { pick, containsRegex }
