.separator ","
select lab, typ from lab join p31 on lab.ent = p31.ent where lang = 'en';
