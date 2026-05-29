import { z } from 'zod';
import { modrinthFetch, requireAuth, modrinthUpload } from '../client.js';
import { readFile } from 'fs/promises';
function respond(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
export async function addFilesToVersion(args) {
    const formData = new FormData();
    const filePartNames = [];
    for (let i = 0; i < args.file_parts.length; i++) {
        const buffer = await readFile(args.file_parts[i]);
        const filename = args.file_parts[i].split('/').pop() ?? `file-${i}`;
        const partName = `file-${i}`;
        formData.append(partName, new Blob([buffer]), filename);
        filePartNames.push(partName);
    }
    formData.append('data', JSON.stringify({ file_parts: filePartNames }));
    return modrinthUpload(`/version/${args.versionId}/files`, formData);
}
export async function deleteFileFromVersion(args) {
    requireAuth();
    return modrinthFetch(`/version_file/${args.hash}?algorithm=${args.algorithm}`, { method: 'DELETE' });
}
export function registerVersionFileTools(server) {
    server.tool('modrinth_add_files_to_version', 'Upload additional files to an existing version (requires MODRINTH_TOKEN)', {
        versionId: z.string().describe('Version ID to add files to'),
        file_parts: z.array(z.string()).describe('Local file paths to upload'),
    }, async (args) => respond(await addFilesToVersion(args)));
    server.tool('modrinth_delete_file_from_version', 'Delete a file from a version by its hash (requires MODRINTH_TOKEN)', {
        hash: z.string().describe('File hash'),
        algorithm: z.enum(['sha1', 'sha512']).describe('Hash algorithm'),
    }, async (args) => respond(await deleteFileFromVersion(args)));
}
