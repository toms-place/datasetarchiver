-- BEGIN TRANSACTION;

DROP INDEX IF EXISTS labidx;
DROP TABLE IF EXISTS lab;
drop index if exists p31idx;
drop table if exists p31;
CREATE TABLE lab (ent text, lab text, lang text);
CREATE INDEX labidx ON lab(ent);
CREATE TABLE p31 (ent text, typ text);
CREATE INDEX p31idx ON p31(ent);

.mode csv
-- .separator "|"
.import lab.csv lab
.import p31.csv p31

-- commit;
