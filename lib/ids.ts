// Row ids are uuids, like "3f2b…-…". Checking the shape first matters:
// anything else sent to Postgres as an id fails with "invalid input syntax
// for type uuid" and shows the error screen, when "it doesn't exist" (or
// "that's not allowed") is the honest answer.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
