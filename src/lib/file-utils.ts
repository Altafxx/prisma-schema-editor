import JSZip from "jszip";

/**
 * Read a Prisma file and return its content as text
 */
export async function readPrismaFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve(content);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}

/**
 * Extract all .prisma files from a zip archive
 */
export async function extractPrismaFilesFromZip(
    file: File
): Promise<Array<{ name: string; content: string }>> {
    try {
        const zip = await JSZip.loadAsync(file);
        const prismaFiles: Array<{ name: string; content: string }> = [];

        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            // Only process .prisma files, skip directories
            if (!zipEntry.dir && filename.endsWith(".prisma")) {
                const content = await zipEntry.async("string");
                prismaFiles.push({
                    name: filename,
                    content,
                });
            }
        }

        return prismaFiles;
    } catch (error) {
        throw new Error(`Failed to extract zip file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Create a zip archive from an array of files
 */
export async function createZipFromFiles(
    files: Array<{ name: string; content: string }>
): Promise<Blob> {
    const zip = new JSZip();

    files.forEach((file) => {
        zip.file(file.name, file.content);
    });

    return await zip.generateAsync({ type: "blob" });
}

/**
 * Download a blob as a file
 */
export function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

