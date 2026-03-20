import 'dotenv/config';
import knexFactory from 'knex';
import { encryptString } from '../src/lib/crypto.js';
import { getZoneByCode } from '../src/db/zonesRepo.js';
import { upsertZoneCredentials } from '../src/db/zoneCredentialsRepo.js';
function requireEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Falta variable de entorno ${name}`);
    return v;
}
async function main() {
    const zoneCode = requireEnv('ZONE_CODE');
    const appKey = requireEnv('JIMI_APP_KEY');
    const appSecret = requireEnv('JIMI_APP_SECRET');
    const userId = requireEnv('JIMI_USER_ID');
    const userPwdMd5 = requireEnv('JIMI_USER_PWD_MD5');
    const encKey = requireEnv('ENCRYPTION_KEY_B64');
    const db = knexFactory({
        client: 'mysql2',
        connection: {
            host: requireEnv('DB_HOST'),
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
            user: requireEnv('DB_USER'),
            password: process.env.DB_PASSWORD ?? '',
            database: requireEnv('DB_NAME'),
        },
    });
    try {
        const zone = await getZoneByCode(db, zoneCode);
        if (!zone)
            throw new Error(`Zona no existe en DB: ${zoneCode}`);
        await upsertZoneCredentials(db, {
            zone_id: zone.id,
            app_key: appKey,
            app_secret_encrypted: encryptString(appSecret, encKey),
            user_id: userId,
            user_pwd_md5_encrypted: encryptString(userPwdMd5, encKey),
        });
        // No imprimimos secretos; solo confirmación
        // eslint-disable-next-line no-console
        console.log(`Credenciales guardadas (cifradas) para zone=${zoneCode}`);
    }
    finally {
        await db.destroy();
    }
}
main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
});
