import { FREE_REVOKE_LIMIT, DEV_FEE_SATS } from '../config/constants';

const STORAGE_KEY = 'blockrevoke-free-revokes';

interface FreeRevokeRecord {
    [walletAddress: string]: number;
}

function getRecords(): FreeRevokeRecord {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FreeRevokeRecord;
}

export function getFreeRevokesUsed(walletAddress: string): number {
    const records = getRecords();
    return records[walletAddress] ?? 0;
}

export function getFreeRevokesRemaining(walletAddress: string): number {
    return Math.max(0, FREE_REVOKE_LIMIT - getFreeRevokesUsed(walletAddress));
}

export function isFeeRequired(walletAddress: string): boolean {
    return getFreeRevokesUsed(walletAddress) >= FREE_REVOKE_LIMIT;
}

export function recordRevokeUsage(walletAddress: string): void {
    const records = getRecords();
    records[walletAddress] = (records[walletAddress] ?? 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getDevFeeSats(): bigint {
    return DEV_FEE_SATS;
}
