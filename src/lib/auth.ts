import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { createDb } from '@/db';
import * as schema from '@/db/schema';

export function createAuth(d1: D1Database) {
    const db = createDb(d1);

    return betterAuth({
        secret: process.env.BETTER_AUTH_SECRET,
        database: drizzleAdapter(db, {
            provider: 'sqlite',
            schema: {
                user: schema.users,
                session: schema.sessions,
                account: schema.accounts,
                verification: schema.verifications
            }
        }),
        emailAndPassword: {
            enabled: true,
            minPasswordLength: 8
        },
        user: {
            additionalFields: {
                role: {
                    type: 'string',
                    required: false,
                    defaultValue: 'user',
                    input: false // 不允许用户自己设置角色
                }
            }
        },
        plugins: [
            admin({
                defaultRole: 'user',
                adminRole: 'admin'
            })
        ],
        session: {
            expiresIn: 60 * 60 * 24 * 7, // 7 days
            updateAge: 60 * 60 * 24 // 1 day
        },
        trustedOrigins: ['http://localhost:3000']
    });
}

export type Auth = ReturnType<typeof createAuth>;

