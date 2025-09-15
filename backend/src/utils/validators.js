const validator = require("validator");

const isValidMobile = (m) => /^[6-9]\d{9}$/.test(String(m || ""));

const isValidEmail = (e) => (typeof e === "string" && validator.isEmail(e));

module.exports = { isValidMobile, isValidEmail };
