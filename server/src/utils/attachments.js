const mongoose = require('mongoose')
const { Readable } = require('stream')

const BUCKET = 'attachments'

// GridFS keeps files in the existing MongoDB database — no extra storage service or secrets
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET })

// Stores a buffer, resolves with the GridFS file id
function storeFile(buffer, filename, contentType) {
  return new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(filename, { metadata: { contentType } })
    Readable.from(buffer).pipe(upload)
      .on('error', reject)
      .on('finish', () => resolve(upload.id))
  })
}

const openFile = (fileId) => bucket().openDownloadStream(fileId)

async function removeFiles(fileIds) {
  await Promise.all(fileIds.map((id) => bucket().delete(id).catch((err) => {
    if (!/FileNotFound|File not found/i.test(err.message)) throw err
  })))
}

module.exports = { storeFile, openFile, removeFiles }
