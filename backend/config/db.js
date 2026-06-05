import { DataTypes } from "sequelize";
import sequelize from "./sequelize.js";
import "../models/index.js";

const ensureColumn = async (table, column, definition) => {
  const columns = await sequelize.getQueryInterface().describeTable(table);
  if (!columns[column]) {
    await sequelize.getQueryInterface().addColumn(table, column, definition);
  }
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    try {
      await sequelize.query(
        "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'owner') NOT NULL DEFAULT 'user'"
      );
    } catch {
      // Table may not exist yet; sync will create it with the updated enum.
    }
    await sequelize.sync();
    await ensureColumn("users", "city", { type: DataTypes.STRING, allowNull: true, defaultValue: "" });
    await ensureColumn("users", "latitude", { type: DataTypes.DECIMAL(10, 7), allowNull: true });
    await ensureColumn("users", "longitude", { type: DataTypes.DECIMAL(10, 7), allowNull: true });
    await ensureColumn("users", "subscriptionStatus", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active"
    });
    await ensureColumn("bookings", "salonName", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
    console.log(`MySQL connected: ${sequelize.config.database}@${sequelize.config.host}`);
  } catch (error) {
    console.error(`MySQL connection error: ${error.message}`);
    const code = error.original?.code || error.parent?.code;
    if (code === "ER_ACCESS_DENIED_ERROR") {
      console.error("Check MYSQL_USER and MYSQL_PASSWORD in backend/.env.");
    }
    if (code === "ER_BAD_DB_ERROR") {
      console.error("Create the MYSQL_DATABASE database first, or update MYSQL_DATABASE in backend/.env.");
    }
    process.exit(1);
  }
};

export default connectDB;
