import { supabase } from "../config/supabase.js";

/* ------------------------------------------------------------------ */
/*  Column mapping: app-space ↔ DB-space                              */
/*  App code uses: _id, createdAt, updatedAt                          */
/*  Supabase DB uses: id, created_at, updated_at                      */
/*  All other columns stay camelCase in both layers (Option A).       */
/* ------------------------------------------------------------------ */

const DEFAULT_COLUMN_MAP = {
  _id: "id",
  createdAt: "created_at",
  updatedAt: "updated_at"
};

const buildReverseMap = (map) =>
  Object.fromEntries(Object.entries(map).map(([app, db]) => [db, app]));

const DEFAULT_REVERSE_MAP = buildReverseMap(DEFAULT_COLUMN_MAP);

/** Translate a single column name from app-space to DB-space */
const toDbCol = (colMap, name) => colMap[name] || name;

/** Translate a single column name from DB-space to app-space */
const fromDbCol = (revMap, name) => revMap[name] || name;

/** Translate an entire row's keys from app-space to DB-space (for inserts/updates) */
const toDbRow = (colMap, data) => {
  if (!data || typeof data !== "object") return data;
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[toDbCol(colMap, key)] = value;
  }
  return out;
};

/** Translate an entire row's keys from DB-space to app-space (for reads) */
const fromDbRow = (revMap, data) => {
  if (!data || typeof data !== "object") return data;
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[fromDbCol(revMap, key)] = value;
  }
  return out;
};

/* ------------------------------------------------------------------ */
/*  Relation map (uses app-space column names)                        */
/* ------------------------------------------------------------------ */

const relationMap = {
  bookings: {
    customer: { foreignKey: "userId", targetKey: "_id" },
    service: { foreignKey: "serviceId", targetKey: "_id" }
  },
  support_messages: {
    customer: { foreignKey: "userId", targetKey: "_id" }
  },
  auth_events: {
    user: { foreignKey: "userId", targetKey: "_id" }
  }
};

/* ------------------------------------------------------------------ */
/*  Sequelize-style operator filter translation                       */
/* ------------------------------------------------------------------ */

const getWhereKeys = (where) => [
  ...Object.keys(where || {}),
  ...Object.getOwnPropertySymbols(where || {})
];

const operatorName = (key) => (typeof key === "symbol" ? key.description || key.toString() : key);

const cleanLikeValue = (value) => String(value).replace(/%/g, "");

const formatInValue = (value) => {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  return `"${String(value).replace(/"/g, '\\"')}"`;
};

const formatOrValue = (value) => {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  return `"${String(value).replace(/"/g, '\\"')}"`;
};

const buildOrExpression = (colMap, field, value) => {
  const dbField = toDbCol(colMap, field);

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const opKeys = getWhereKeys(value);
    for (const opKey of opKeys) {
      const op = operatorName(opKey);
      const opValue = value[opKey];

      if (op.includes("like")) {
        return `${dbField}.ilike.${formatOrValue(`%${cleanLikeValue(opValue)}%`)}`;
      }
      if (op.includes("in")) {
        return `${dbField}.in.(${opValue.map(formatInValue).join(",")})`;
      }
      if (op.includes("ne")) {
        return `${dbField}.neq.${formatOrValue(opValue)}`;
      }
    }
  }

  return value === null
    ? `${dbField}.is.null`
    : `${dbField}.eq.${formatOrValue(value)}`;
};

function applySingleFilter(query, colMap, field, value) {
  if (value === undefined) return query;
  const dbField = toDbCol(colMap, field);

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const opKeys = getWhereKeys(value);
    for (const opKey of opKeys) {
      const op = operatorName(opKey);
      const opValue = value[opKey];

      if (op.includes("notIn")) {
        if (Array.isArray(opValue) && opValue.length) {
          query = query.not(dbField, "in", `(${opValue.map(formatInValue).join(",")})`);
        }
      } else if (op.includes("in")) {
        query = Array.isArray(opValue) && opValue.length ? query.in(dbField, opValue) : query;
      } else if (op.includes("ne")) {
        query = opValue === null ? query.not(dbField, "is", null) : query.neq(dbField, opValue);
      } else if (op.includes("like")) {
        query = query.ilike(dbField, `%${cleanLikeValue(opValue)}%`);
      }
    }
    return query;
  }

  return value === null ? query.is(dbField, null) : query.eq(dbField, value);
}

function applyFilters(query, colMap, where) {
  if (!where) return query;

  for (const key of getWhereKeys(where)) {
    const op = operatorName(key);
    const value = where[key];

    if (op.includes("or")) {
      const expressions = [];
      for (const condition of value || []) {
        for (const conditionKey of getWhereKeys(condition)) {
          expressions.push(buildOrExpression(colMap, conditionKey, condition[conditionKey]));
        }
      }
      if (expressions.length) query = query.or(expressions.join(","));
      continue;
    }

    if (op.includes("and")) {
      for (const condition of value || []) {
        query = applyFilters(query, colMap, condition);
      }
      continue;
    }

    query = applySingleFilter(query, colMap, key, value);
  }

  return query;
}

/* ------------------------------------------------------------------ */
/*  Attribute projection (app-space → DB-space)                       */
/* ------------------------------------------------------------------ */

const applyAttributes = (row, attributes, revMap) => {
  if (!row || !attributes) return row;

  if (Array.isArray(attributes)) {
    return attributes.reduce((picked, field) => {
      /* field is in app-space; row is already in app-space after fromDbRow */
      if (Object.prototype.hasOwnProperty.call(row, field)) picked[field] = row[field];
      return picked;
    }, {});
  }

  if (Array.isArray(attributes.exclude)) {
    const next = { ...row };
    for (const field of attributes.exclude) {
      delete next[field];
    }
    return next;
  }

  return row;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const toPlainValue = (value) => {
  if (value instanceof SupabaseModel) return value.toJSON();
  if (Array.isArray(value)) return value.map(toPlainValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlainValue(item)]));
  }
  return value;
};

async function applyIncludes(modelClass, rows, include) {
  if (!include?.length || !rows.length) return rows;

  const colMap = modelClass._colMap;
  const revMap = modelClass._revMap;

  for (const includeItem of include) {
    const relation = relationMap[modelClass.tableName]?.[includeItem.as];
    const relatedModel = includeItem.model;
    if (!relation || !relatedModel?.tableName) continue;

    /* foreignKey and targetKey are in app-space */
    const ids = [
      ...new Set(
        rows
          .map((row) => row[relation.foreignKey])
          .filter((value) => value !== null && value !== undefined)
      )
    ];

    if (!ids.length) {
      rows.forEach((row) => {
        row[includeItem.as] = null;
      });
      continue;
    }

    /* Query the related table using DB-space column name */
    const dbTargetKey = toDbCol(relatedModel._colMap, relation.targetKey);

    const { data, error } = await supabase
      .from(relatedModel.tableName)
      .select("*")
      .in(dbTargetKey, ids);

    if (error) throw error;

    const relRelMap = relatedModel._revMap;
    const relatedById = new Map(
      (data || []).map((dbRow) => {
        const appRow = fromDbRow(relRelMap, dbRow);
        return [
          appRow[relation.targetKey],
          new relatedModel(applyAttributes(appRow, includeItem.attributes, relRelMap))
        ];
      })
    );

    rows.forEach((row) => {
      row[includeItem.as] = relatedById.get(row[relation.foreignKey]) || null;
    });
  }

  return rows;
}

const normalizeOptions = (options) => options || {};

/* ------------------------------------------------------------------ */
/*  SupabaseModel base class                                          */
/* ------------------------------------------------------------------ */

export class SupabaseModel {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  static get tableName() {
    throw new Error("tableName not implemented");
  }

  static get primaryKey() {
    return "_id";
  }

  /** Override in subclass to add model-specific mappings */
  static get columnMap() {
    return {};
  }

  /* Cached merged column maps — computed once per class */
  static get _colMap() {
    if (!this.__colMapCache) {
      this.__colMapCache = { ...DEFAULT_COLUMN_MAP, ...this.columnMap };
    }
    return this.__colMapCache;
  }

  static get _revMap() {
    if (!this.__revMapCache) {
      this.__revMapCache = buildReverseMap(this._colMap);
    }
    return this.__revMapCache;
  }

  changed() {
    return true;
  }

  get(options = {}) {
    return options.plain ? this.toJSON() : this.toJSON();
  }

  toJSON() {
    return Object.fromEntries(
      Object.entries(this).map(([key, value]) => [key, toPlainValue(value)])
    );
  }

  /* ---- Static query methods ---- */

  static async findOne(options = {}) {
    const rows = await this.findAll({ ...normalizeOptions(options), limit: 1 });
    return rows[0] || null;
  }

  static async findByPk(id, options = {}) {
    const colMap = this._colMap;
    const revMap = this._revMap;
    const dbPk = toDbCol(colMap, this.primaryKey);

    let query = supabase
      .from(this.tableName)
      .select("*")
      .eq(dbPk, id);

    query = query.limit(1);

    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) return null;

    const appRow = fromDbRow(revMap, data[0]);
    const [rowWithIncludes] = await applyIncludes(this, [appRow], options.include);
    return new this(applyAttributes(rowWithIncludes, options.attributes, revMap));
  }

  static async findAll(options = {}) {
    const { where, order, limit, include, attributes } = normalizeOptions(options);
    const colMap = this._colMap;
    const revMap = this._revMap;

    let query = supabase.from(this.tableName).select("*");
    query = applyFilters(query, colMap, where);

    if (order) {
      for (const [column, direction] of order) {
        const dbCol = toDbCol(colMap, column);
        query = query.order(dbCol, { ascending: String(direction).toUpperCase() === "ASC" });
      }
    }

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    const appRows = (data || []).map((dbRow) => fromDbRow(revMap, dbRow));
    const rowsWithIncludes = await applyIncludes(this, appRows, include);
    return rowsWithIncludes.map((row) => new this(applyAttributes(row, attributes, revMap)));
  }

  static async create(data) {
    const colMap = this._colMap;
    const revMap = this._revMap;
    const dbData = toDbRow(colMap, data);

    /* Let Supabase auto-generate the UUID primary key */
    const dbPk = toDbCol(colMap, this.primaryKey);
    if (dbPk === "id" && !dbData.id) {
      delete dbData.id;
    }

    /* Remove timestamp fields — let Supabase handle defaults */
    delete dbData.created_at;
    delete dbData.updated_at;

    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    return new this(fromDbRow(revMap, created));
  }

  static async bulkCreate(rows, options = {}) {
    if (!Array.isArray(rows) || !rows.length) return [];

    const colMap = this._colMap;
    const revMap = this._revMap;
    const dbPk = toDbCol(colMap, this.primaryKey);

    const dbRows = rows.map((row) => {
      const dbRow = toDbRow(colMap, row);
      if (dbPk === "id" && !dbRow.id) delete dbRow.id;
      delete dbRow.created_at;
      delete dbRow.updated_at;
      return dbRow;
    });

    const builder = supabase.from(this.tableName);
    const query = options.ignoreDuplicates
      ? builder.upsert(dbRows, { onConflict: dbPk, ignoreDuplicates: true })
      : builder.insert(dbRows);

    const { data, error } = await query.select();
    if (error) throw error;
    return (data || []).map((dbRow) => new this(fromDbRow(revMap, dbRow)));
  }

  static async update(values, options = {}) {
    const colMap = this._colMap;
    const revMap = this._revMap;
    const dbValues = toDbRow(colMap, values);

    let query = supabase.from(this.tableName).update(dbValues);
    query = applyFilters(query, colMap, options.where);

    const { data, error } = await query.select();
    if (error) throw error;
    return (data || []).map((dbRow) => new this(fromDbRow(revMap, dbRow)));
  }

  static async destroy(options = {}) {
    const colMap = this._colMap;
    const revMap = this._revMap;

    let query = supabase.from(this.tableName).delete();
    query = applyFilters(query, colMap, options.where);

    const { data, error } = await query.select();
    if (error) throw error;
    return (data || []).map((dbRow) => new this(fromDbRow(revMap, dbRow)));
  }

  static async count(options = {}) {
    const colMap = this._colMap;

    let query = supabase.from(this.tableName).select("*", { count: "exact", head: true });
    query = applyFilters(query, colMap, options.where);

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  /* ---- Instance methods ---- */

  async save() {
    const colMap = this.constructor._colMap;
    const revMap = this.constructor._revMap;
    const appPk = this.constructor.primaryKey;
    const dbPk = toDbCol(colMap, appPk);
    const primaryKeyValue = this[appPk];
    const data = this.toJSON();
    delete data[appPk];

    /* Remove timestamps — let DB handle them */
    delete data.createdAt;
    delete data.updatedAt;

    const dbData = toDbRow(colMap, data);

    if (primaryKeyValue) {
      const { data: updated, error } = await supabase
        .from(this.constructor.tableName)
        .update(dbData)
        .eq(dbPk, primaryKeyValue)
        .select()
        .single();

      if (error) throw error;
      Object.assign(this, fromDbRow(revMap, updated));
    } else {
      if (dbPk === "id") delete dbData.id;
      delete dbData.created_at;
      delete dbData.updated_at;

      const { data: created, error } = await supabase
        .from(this.constructor.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      Object.assign(this, fromDbRow(revMap, created));
    }

    return this;
  }

  async update(values) {
    const colMap = this.constructor._colMap;
    const revMap = this.constructor._revMap;
    const appPk = this.constructor.primaryKey;
    const dbPk = toDbCol(colMap, appPk);
    const primaryKeyValue = this[appPk];
    if (!primaryKeyValue) throw new Error("Cannot update instance without primary key");

    const dbValues = toDbRow(colMap, values);

    const { data: updated, error } = await supabase
      .from(this.constructor.tableName)
      .update(dbValues)
      .eq(dbPk, primaryKeyValue)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, fromDbRow(revMap, updated));
    return this;
  }

  async reload() {
    const appPk = this.constructor.primaryKey;
    const primaryKeyValue = this[appPk];
    if (!primaryKeyValue) throw new Error("Cannot reload instance without primary key");

    const fresh = await this.constructor.findByPk(primaryKeyValue);
    if (!fresh) throw new Error("Record no longer exists");

    Object.assign(this, fresh.toJSON());
    return this;
  }

  async destroy() {
    const colMap = this.constructor._colMap;
    const appPk = this.constructor.primaryKey;
    const dbPk = toDbCol(colMap, appPk);
    const primaryKeyValue = this[appPk];
    if (!primaryKeyValue) throw new Error("Cannot delete instance without primary key");

    const { error } = await supabase
      .from(this.constructor.tableName)
      .delete()
      .eq(dbPk, primaryKeyValue);

    if (error) throw error;
  }
}
