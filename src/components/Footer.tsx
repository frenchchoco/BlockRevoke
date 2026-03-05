import type { ReactElement } from 'react';
import { useDevFee } from '../hooks/useDevFee';
import { FREE_REVOKE_LIMIT } from '../config/constants';

export function Footer(): ReactElement {
    const { freeRemaining, feeRequired } = useDevFee();

    return (
        <footer className="py-4 text-center text-sm text-zinc-500 border-t border-zinc-800">
            {feeRequired ? (
                <p>Fee: 3,000 sats per action</p>
            ) : (
                <p>
                    Free revokes: {freeRemaining}/{FREE_REVOKE_LIMIT} remaining
                </p>
            )}
        </footer>
    );
}
