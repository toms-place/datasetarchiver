const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  env: process.env.NODE_ENV,
  protocol: process.env.PROTOCOL,
  host: process.env.HOST,
  port: process.env.PORT,
  DB_Server: process.env.DB_Server,
  DB_Name: process.env.DB_Name,
  CRAWL_InitRange: process.env.CRAWL_InitRange,
  CRAWL_EndRange: process.env.CRAWL_EndRange
};