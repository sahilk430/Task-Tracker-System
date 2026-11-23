// Mirrors the server rule (server/src/utils/password.js)
export const PASSWORD_HINT = 'At least 8 characters, with a letter and a number.'

export const passwordProblem = (v) =>
  v.length < 8 || !/[A-Za-z]/.test(v) || !/\d/.test(v)
    ? 'Password must be at least 8 characters and include a letter and a number.'
    : ''
