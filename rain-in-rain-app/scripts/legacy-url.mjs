export function legacyURL(){const url=new URL(process.env.BASE_URL||'http://localhost:5173');url.searchParams.set('version','3');return url.href;}
