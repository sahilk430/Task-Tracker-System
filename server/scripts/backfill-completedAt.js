// One-off: fill `completedAt` on existing `done` tasks that don't have it yet.
//   node scripts/backfill-completedAt.js          → dry run, prints what would change
//   node scripts/backfill-completedAt.js --apply  → writes
// Source of the date: the latest "status → done" activity entry, else the task's updatedAt.
// Only touches tasks whose completedAt is empty, never changes updatedAt, safe to re-run.
require('dotenv').config()
const mongoose = require('mongoose')
const { connectDB } = require('../src/config/db')
const { Task, TaskActivity } = require('../src/models')

const APPLY = process.argv.includes('--apply')

async function run() {
  await connectDB(process.env.MONGODB_URI)

  const tasks = await Task.find({ status: 'done', completedAt: null }).select('title updatedAt').lean()
  console.log(`${tasks.length} done task(s) without completedAt`)
  if (!tasks.length) return

  const doneEvents = await TaskActivity.aggregate([
    { $match: { task: { $in: tasks.map((t) => t._id) }, action: 'status_changed', newValue: 'done' } },
    { $group: { _id: '$task', at: { $max: '$createdAt' } } },
  ])
  const doneAt = new Map(doneEvents.map((e) => [e._id.toString(), e.at]))

  const ops = tasks.map((t) => {
    const fromLog     = doneAt.get(t._id.toString())
    const completedAt = fromLog || t.updatedAt
    console.log(`  ${completedAt.toISOString()}  (${fromLog ? 'activity log' : 'updatedAt'})  ${t.title}`)
    return { updateOne: { filter: { _id: t._id, completedAt: null }, update: { $set: { completedAt } } } }
  })

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to save.')
    return
  }
  const result = await Task.bulkWrite(ops, { timestamps: false })
  console.log(`\nUpdated ${result.modifiedCount} task(s).`)
}

run()
  .catch((err) => { console.error(err); process.exitCode = 1 })
  .finally(() => mongoose.disconnect())
