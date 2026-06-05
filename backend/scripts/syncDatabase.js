import "../config/env.js";
import sequelize from "../config/sequelize.js";
import "../models/index.js";

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log(`MySQL schema synced: ${sequelize.config.database}@${sequelize.config.host}`);
    process.exit(0);
  } catch (error) {
    console.error(`MySQL sync error: ${error.message}`);
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

syncDatabase();
