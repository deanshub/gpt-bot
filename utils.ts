export function getOrThrow<T>(envVar: string): string {
    const value = process.env[envVar];
    if (!value) {
        throw new Error(`Environment variable ${envVar} is not set`);
    }
    return value;
}