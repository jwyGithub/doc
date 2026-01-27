import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getCloudflareEnv() {
	const { env } = await getCloudflareContext();
	return env as CloudflareEnv;
}

export async function getD1Database() {
	const env = await getCloudflareEnv();
	return env.DB;
}
