import { DEV_FEE_SATS } from '../config/constants';

/**
 * Fee is always required on every revoke/edit.
 */
export function isFeeRequired(): boolean {
    return true;
}

export function getDevFeeSats(): bigint {
    return DEV_FEE_SATS;
}
