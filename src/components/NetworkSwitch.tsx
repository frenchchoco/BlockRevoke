import type { ReactElement } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useNetworkStore } from '../stores/networkStore';
import { NETWORK_CONFIGS } from '../config/networks';
import type { NetworkId } from '../types/network';

const NETWORK_IDS: readonly NetworkId[] = ['mainnet', 'testnet'] as const;
const VALID_NETWORK_IDS = new Set<string>(NETWORK_IDS);

function isNetworkId(value: string): value is NetworkId {
    return VALID_NETWORK_IDS.has(value);
}

export function NetworkSwitch(): ReactElement {
    const networkId: NetworkId = useNetworkStore((s) => s.networkId);
    const setNetwork = useNetworkStore((s) => s.setNetwork);

    const handleChange = (v: string): void => {
        if (isNetworkId(v)) {
            setNetwork(v);
        }
    };

    return (
        <Select value={networkId} onValueChange={handleChange}>
            <SelectTrigger className="w-[140px]" size="sm">
                <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
                {NETWORK_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                        {NETWORK_CONFIGS[id].name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
