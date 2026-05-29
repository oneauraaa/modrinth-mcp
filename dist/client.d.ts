export declare function requireAuth(): void;
export declare function modrinthFetch(path: string, options?: RequestInit & {
    headers?: Record<string, string>;
}): Promise<unknown>;
export declare function modrinthUpload(path: string, formData: FormData, method?: string): Promise<unknown>;
