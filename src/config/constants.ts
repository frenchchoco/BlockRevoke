export const FREE_REVOKE_LIMIT = 3;
export const DEV_FEE_SATS = 3000n;

const ENV_DEV_ADDRESS: string | undefined = import.meta.env.VITE_DEV_ADDRESS as
    | string
    | undefined;

/**
 * Dev fee recipient address. When `null` the fee output is silently skipped
 * so the dApp still works during development without a configured address.
 */
export const DEV_ADDRESS: string | null = ENV_DEV_ADDRESS ?? null;

export const U256_MAX = (1n << 256n) - 1n;
export const UNLIMITED_THRESHOLD = U256_MAX / 2n;
