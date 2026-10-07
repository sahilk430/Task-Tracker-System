// Counts documents of `Model` grouped by a reference `field`, limited to `ids`.
// Returns a plain map: { [idString]: count }
async function countBy(Model, field, ids) {
  const groups = await Model.aggregate([
    { $match: { [field]: { $in: ids } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ])
  return Object.fromEntries(groups.map((g) => [g._id.toString(), g.count]))
}

// Serialises `docs` and adds `_count` per the spec, e.g.
//   withCounts(websites, { tasks: [Task, 'website'], projects: [Project, 'website'] })
//   → [{ ...website, _count: { tasks: 3, projects: 1 } }]
async function withCounts(docs, spec) {
  const ids     = docs.map((d) => d._id)
  const entries = Object.entries(spec)
  const maps    = await Promise.all(entries.map(([, [Model, field]]) => countBy(Model, field, ids)))

  return docs.map((doc) => ({
    ...doc.toJSON(),
    _count: Object.fromEntries(entries.map(([key], i) => [key, maps[i][doc.id] || 0])),
  }))
}

module.exports = { countBy, withCounts }
