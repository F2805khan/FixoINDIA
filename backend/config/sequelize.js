import "./env.js";
import { Sequelize } from "sequelize";

const logging = process.env.SQL_DEBUG === "true" ? console.log : false;

const createSequelize = () => {
  const uri = process.env.MYSQL_URL?.trim();
  const ssl =
    process.env.MYSQL_SSL === "true"
      ? { ssl: { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED === "true" } }
      : {};

  if (uri) {
    return new Sequelize(uri, {
      dialect: "mysql",
      logging,
      dialectOptions: ssl,
      define: {
        underscored: false,
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: "updatedAt"
      }
    });
  }

  const database = process.env.MYSQL_DATABASE?.trim();
  const username = (process.env.MYSQL_USER ?? "root").trim();
  const password = process.env.MYSQL_PASSWORD ?? "";
  const host = process.env.MYSQL_HOST?.trim() || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT || 3306);

  if (!database) {
    console.error(
      "MySQL: Set MYSQL_URL or MYSQL_DATABASE (+ MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT) in backend/.env."
    );
    process.exit(1);
  }

  return new Sequelize(database, username, password, {
    host,
    port,
    dialect: "mysql",
    logging,
    dialectOptions: ssl,
    define: {
      underscored: false,
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    }
  });
};

const sequelize = createSequelize();

export default sequelize;
