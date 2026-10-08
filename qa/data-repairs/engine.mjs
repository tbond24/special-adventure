import fs from 'node:fs/promises';
import path from 'node:path';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
export const root=path.resolve(import.meta.dirname,'../..');
export async function database(){
 const db=new PGlite();
 await db.exec(await fs.readFile(path.join(import.meta.dirname,'platform.sql'),'utf8'));
 for(const name of (await fs.readdir(path.join(root,'supabase/migrations'))).filter(n=>n.endsWith('.sql')).sort()){
   let sql=await fs.readFile(path.join(root,'supabase/migrations',name),'utf8');
   // pgcrypto is only used for gen_random_uuid, built into this PostgreSQL. No
   // application function, policy or privilege statement is skipped/rewritten.
   sql=sql.replace(/^create extension if not exists pgcrypto;/m,'');
   try{await db.exec(sql);if(name==='20260906125127_init_vacancy_core.sql')await db.exec("insert into auth.users(id,raw_user_meta_data) values('11111111-1111-4111-8111-111111111111','{\"display_name\":\"Synthetic historical admin\"}');");await db.query('insert into supabase_migrations.schema_migrations values($1,$2)',[name.slice(0,14),name.slice(15,-4)]);}
   catch(error){error.message=`${name}: ${error.message}`;throw error;}
 }
 return db;
}
