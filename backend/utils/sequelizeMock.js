export const Op = {
  or: Symbol("or"),
  ne: Symbol("ne"),
  notIn: Symbol("notIn"),
  in: Symbol("in"),
  like: Symbol("like"),
  and: Symbol("and"),
};

export const DataTypes = {
  STRING: "STRING",
  TEXT: "TEXT",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  DECIMAL: "DECIMAL",
  DATE: "DATE",
  UUID: "UUID",
  UUIDV4: "UUIDV4",
  ENUM: (...args) => ({ type: "ENUM", values: args }),
};

export class Model {}
