const { Schema, model } = require('mongoose')
const bcrypt = require('bcryptjs')
const { VALID_ROLES } = require('../config/constants')
const { schemaOptions, toJSON } = require('./schemaOptions')

const userSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role:         { type: String, enum: VALID_ROLES, default: 'seo_executive' },
  avatarUrl:    String,
  isActive:     { type: Boolean, default: true },
}, {
  ...schemaOptions,
  // Never serialise the hash, even when it was explicitly selected (login)
  toJSON: {
    ...toJSON,
    transform: (doc, ret) => {
      toJSON.transform(doc, ret)
      delete ret.passwordHash
      return ret
    },
  },
})

userSchema.statics.hashPassword = (password) => bcrypt.hash(password, 10)

// Requires the document to be loaded with `.select('+passwordHash')`
userSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash)
}

module.exports = model('User', userSchema)
