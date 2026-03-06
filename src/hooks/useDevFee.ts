import { getDevFeeSats } from '../services/feeService';

interface DevFeeInfo {
    readonly feeSats: bigint;
}

export function useDevFee(): DevFeeInfo {
    return { feeSats: getDevFeeSats() };
}
