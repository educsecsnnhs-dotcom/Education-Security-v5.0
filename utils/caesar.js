// utils/caesar.js
/**
 * Caesar cipher helpers used by backend.
 * - Reads CIPHER_KEY from process.env (default 3)
 * - Exports encryptPassword and decryptPassword used elsewhere in the codebase
 *
 * This implementation mirrors the frontend caesar logic: it rotates
 * uppercase letters A-Z, lowercase a-z, and digits 0-9. Other chars passthrough.
 */

const SHIFT = (() => {
  const env = parseInt(process.env.CIPHER_KEY, 10);
  return Number.isFinite(env) ? env : 3; // Default shift of 3
})();

function _shiftChar(code, base, range, shift) {
  // code: char code, base: starting char code for range, range: length (26 or 10)
  return ((code - base + shift + range) % range) + base;
}

function encryptPassword(text) {
  if (text === undefined || text === null) return "";
  const s = Number(SHIFT);
  return String(text)
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      // A-Z
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(_shiftChar(code, 65, 26, s));
      }
      // a-z
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(_shiftChar(code, 97, 26, s));
      }
      // 0-9
      if (code >= 48 && code <= 57) {
        return String.fromCharCode(_shiftChar(code, 48, 10, s));
      }
      // passthrough
      return char;
    })
    .join("");
}

function decryptPassword(text) {
  if (text === undefined || text === null) return "";
  const s = Number(SHIFT);
  // Decrypting is same as encrypting with negative shift
  // The `(26 * 1000)` part is to ensure the result of `code - base + (-s)` is positive before modulo,
  // which is a common trick for negative numbers with JS modulo operator.
  return String(text)
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(_shiftChar(code, 65, 26, -s));
      }
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(_shiftChar(code, 97, 26, -s));
      }
      if (code >= 48 && code <= 57) {
        return String.fromCharCode(_shiftChar(code, 48, 10, -s));
      }
      return char;
    })
    .join("");
}

module.exports = {
  encryptPassword,
  decryptPassword,
};
