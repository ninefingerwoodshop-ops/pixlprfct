const loopback = host => ['localhost', '127.0.0.1', '[::1]'].includes(host);
export const providers = Object.freeze({sqlite:'sqlite',postgres:'postgres',supabase:'postgres',render:'postgres',neon:'postgres',mysql:'mysql',mariadb:'mysql'});
export function readConfig(env = process.env) {
  const provider = env.PIXL_DATABASE_PROVIDER || 'sqlite';
  if (!providers[provider]) throw new Error('Choose SQLite, PostgreSQL, Supabase, Render, Neon, MySQL, or MariaDB.');
  let url;
  try { url = new URL(env.PIXL_APP_URL); } catch { throw new Error('Set PIXL_APP_URL to the full address of this installation.'); }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('PIXL_APP_URL must contain only the site origin.');
  const local = env.PIXL_LOCAL_DEVELOPMENT === 'true';
  if (local && !loopback(url.hostname)) throw new Error('Local development is only allowed on a loopback address.');
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('Internet installations require an HTTPS address.');
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32 || /REPLACE|CHANGE_ME/i.test(env.BETTER_AUTH_SECRET)) throw new Error('Set a random BETTER_AUTH_SECRET of at least 32 characters.');
  const engine = providers[provider], databaseUrl = env.DATABASE_URL;
  let databaseTLS=true;
  if (engine !== 'sqlite') {
    let db; try { db = new URL(databaseUrl); } catch { throw new Error('Set DATABASE_URL to the database connection string.'); }
    if (!(engine === 'postgres' ? ['postgres:', 'postgresql:'] : ['mysql:']).includes(db.protocol)) throw new Error('DATABASE_URL does not match the chosen database.');
    databaseTLS=!(local&&loopback(db.hostname));
    if (engine === 'postgres' && ['disable','allow','prefer','no-verify'].includes(db.searchParams.get('sslmode')) && databaseTLS) throw new Error('Use verified TLS for remote PostgreSQL connections.');
  }
  if (!local && (!env.SMTP_URL || !env.SMTP_FROM)) throw new Error('Set SMTP_URL and SMTP_FROM for verification, invitations, and password recovery.');
  if (env.SMTP_URL) { const smtp = new URL(env.SMTP_URL); if (!['smtp:','smtps:'].includes(smtp.protocol)) throw new Error('SMTP_URL must use smtp:// or smtps://.'); }
  const adminEmail = (env.PIXL_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!local && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('Set PIXL_ADMIN_EMAIL to the installation administrator’s email.');
  return {provider,engine,databaseUrl,databaseTLS,sqlitePath:env.PIXL_SQLITE_PATH || './data/pixlprfct.sqlite',baseURL:url.origin,secret:env.BETTER_AUTH_SECRET,local,adminEmail,smtpUrl:env.SMTP_URL,smtpFrom:env.SMTP_FROM,registration:env.PIXL_REGISTRATION !== 'closed',port:Number(env.PORT || 4174),host:local?'127.0.0.1':(env.HOST || '0.0.0.0')};
}
