const { Schema } = require('mongoose')

// API-friendly JSON: `id` string instead of `_id`, no `__v`
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id
    return ret
  },
}

// Shared schema options: createdAt/updatedAt + the JSON shape above
const schemaOptions = { timestamps: true, toJSON }

// ObjectId reference to another model
const ref = (modelName, extra = {}) => ({ type: Schema.Types.ObjectId, ref: modelName, ...extra })

module.exports = { schemaOptions, toJSON, ref }
