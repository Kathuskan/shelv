const crypto = require("crypto");
const mongoose = require("mongoose");
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const assert = (condition, message, status = 422) => {
  if (!condition) throw new HttpError(status, message);
};
function text(value, name, max = 200, required = true) {
  assert(
    typeof value === "string" || (!required && value == null),
    `${name} must be text.`
  );
  const result = (value || "").trim();
  assert(
    (!required || result.length > 0) && result.length <= max,
    `${name} is required and must be at most ${max} characters.`
  );
  return result;
}
function integer(value, name, min, max) {
  assert(
    (typeof value === "number" || typeof value === "string") &&
      String(value).trim() !== "",
    `${name} is required.`
  );
  const n = Number(value);
  assert(
    Number.isSafeInteger(n) && n >= min && n <= max,
    `${name} must be a whole number from ${min} to ${max}.`
  );
  return n;
}
function money(value, name, allowZero = false) {
  assert(
    typeof value === "string" || typeof value === "number",
    `${name} is required.`
  );
  assert(
    /^\d+(\.\d{1,2})?$/.test(String(value)),
    `${name} must have at most two decimal places.`
  );
  return integer(
    Math.round(Number(value) * 100),
    name,
    allowZero ? 0 : 100,
    100000000
  );
}
function id(value) {
  assert(
    typeof value === "string" && mongoose.isObjectIdOrHexString(value),
    "Invalid identifier.",
    400
  );
  return value;
}
const districts = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];
function address(input) {
  assert(
    input && typeof input === "object" && !Array.isArray(input),
    "Enter a delivery address."
  );
  const out = {};
  for (const [key, label, max, required] of [
    ["recipient", "Recipient name", 100, true],
    ["phone", "Phone", 20, true],
    ["line1", "Street address", 180, true],
    ["line2", "Apartment or landmark", 180, false],
    ["city", "City", 80, true],
    ["district", "District", 40, true],
    ["postalCode", "Postal code", 5, true],
    ["instructions", "Delivery instructions", 300, false],
  ])
    out[key] = text(input[key], label, max, required);
  assert(
    /^(?:0\d{9}|\+94\d{9})$/.test(out.phone.replace(/[ -]/g, "")),
    "Enter a Sri Lankan phone number, for example 0771234567."
  );
  assert(/^\d{5}$/.test(out.postalCode), "Enter a five-digit postal code.");
  assert(districts.includes(out.district), "Select a valid district.");
  assert(
    !input.country || input.country === "LK",
    "Delivery is currently available within Sri Lanka."
  );
  out.country = "LK";
  return out;
}
const fingerprint = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
module.exports = {
  HttpError,
  assert,
  text,
  integer,
  money,
  id,
  address,
  districts,
  fingerprint,
  asyncRoute,
};
