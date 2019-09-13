import dotenv from 'dotenv';
dotenv.config();

let env = process.env.NODE_ENV || 'developement';
let protocol = process.env.PROTOCOL || 'http:';
let host = process.env.HOST || 'localhost';
let port = process.env.PORT || '3000';
let endpoint = process.env.ENDPOINT;
let DB_Server = process.env.DB_Server || 'localhost:27017';
let DB_Name = process.env.DB_Name || 'archiver';
let CRAWL_HostInterval = parseInt(process.env.CRAWL_HostInterval) || 5;
let CRAWL_minRange = parseInt(process.env.CRAWL_minRange) || 15;
let CRAWL_maxRange = parseInt(process.env.CRAWL_maxRange) || 120;
let ErrorCountTreshold = parseInt(process.env.ErrorCountTreshold) || 3;
let MaxFileSizeInBytes = parseInt(process.env.MaxFileSizeInBytes) || 100000000;
let CRAWL_DistributionArrayMax = parseInt(process.env.CRAWL_DistributionArrayMax) || 10;

export default {
  env: env,
  protocol: protocol,
  host: host,
  port: port,
  endpoint: endpoint,
  DB_Server: DB_Server,
  DB_Name: DB_Name,
  CRAWL_HostInterval: CRAWL_HostInterval,
  CRAWL_minRange: CRAWL_minRange,
  CRAWL_maxRange: CRAWL_maxRange,
  ErrorCountTreshold: ErrorCountTreshold,
  MaxFileSizeInBytes: MaxFileSizeInBytes,
  CRAWL_DistributionArrayMax: CRAWL_DistributionArrayMax
};