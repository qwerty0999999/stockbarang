import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const AVATAR_DIR = 'static/uploads/avatars';

// Ensure directory exists
import { mkdir } from 'node:fs/promises';
mkdir(AVATAR_DIR, { recursive: true }).catch(() => {});

export async function POST({ request, locals }: RequestEvent) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get('avatar') as File;

	if (!file || !(file instanceof File)) {
		return json({ error: 'File tidak valid' }, { status: 400 });
	}

	// Validate file type
	const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
	if (!allowedTypes.includes(file.type)) {
		return json({ error: 'Hanya file gambar (JPEG, PNG, GIF, WEBP) yang diperbolehkan' }, { status: 400 });
	}

	// Validate file size (max 2MB)
	if (file.size > 2 * 1024 * 1024) {
		return json({ error: 'Ukuran file maksimal 2MB' }, { status: 400 });
	}

	// Generate unique filename
	const mimeToExt: Record<string, string> = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/gif': 'gif',
		'image/webp': 'webp'
	};
	const ext = mimeToExt[file.type] || 'bin';
	const filename = `${randomUUID()}.${ext}`;
	const filePath = join(AVATAR_DIR, filename);

	try {
		// Save file
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filePath, buffer);

		// Update user avatar in database
		const avatarPath = `/uploads/avatars/${filename}`;
		await prisma.user.update({
			where: { id: locals.user.userId },
			data: { avatar: avatarPath }
		});

		return json({ success: true, avatar: avatarPath });
	} catch (error) {
		console.error('Upload error:', error);
		return json({ error: 'Gagal mengupload avatar' }, { status: 500 });
	}
}
