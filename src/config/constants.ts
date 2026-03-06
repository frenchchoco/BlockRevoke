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

/**
 * Any allowance >= 2^96 is effectively unlimited — no real token has this supply.
 * Used for risk scoring when the allowance isn't technically U256_MAX but is still absurd.
 */
export const DANGEROUS_THRESHOLD = 1n << 96n;
