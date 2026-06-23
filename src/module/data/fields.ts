/**
 * Shorthand accessors for the Foundry data field classes.
 * Avoids repeating the long `foundry.data.fields.*` namespace everywhere.
 */
export const fields = foundry.data.fields;

/** A non-negative integer field with a default. */
export function intField(initial = 0, opts: Record<string, unknown> = {}) {
  return new fields.NumberField({
    required: true,
    nullable: false,
    integer: true,
    initial,
    ...opts
  });
}

/** A required string field with a default. */
export function strField(initial = "", opts: Record<string, unknown> = {}) {
  return new fields.StringField({
    required: true,
    nullable: false,
    blank: true,
    initial,
    ...opts
  });
}

/** An HTML (ProseMirror) field for rich text descriptions. */
export function htmlField(initial = "") {
  return new fields.HTMLField({ required: true, nullable: false, blank: true, initial });
}

/** A boolean field with a default. */
export function boolField(initial = false) {
  return new fields.BooleanField({ required: true, nullable: false, initial });
}

/**
 * A {value, max} resource pair, e.g. Power.
 */
export function resourceField(value = 0, max = 0) {
  return new fields.SchemaField({
    value: intField(value),
    max: intField(max)
  });
}
