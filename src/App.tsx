import { type ReactElement, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardSummary } from './components/DashboardSummary';
import { FilterBar } from './components/FilterBar';
import { ApprovalTable } from './components/ApprovalTable';
import { useApprovals } from './hooks/useApprovals';
import { useWallet } from './hooks/useWallet';
import type { Approval } from './types/approval';

export default function App(): ReactElement {
    const { approvals, isLoading } = useApprovals();
    const { isReady } = useWallet();

    const [filteredApprovals, setFilteredApprovals] = useState<Approval[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleFiltered = useCallback((filtered: Approval[]): void => {
        setFilteredApprovals(filtered);
    }, []);

    const handleSelectToggle = useCallback((id: string): void => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback((): void => {
        setSelectedIds((prev) => {
            if (prev.size === filteredApprovals.length) {
                return new Set<string>();
            }
            return new Set(filteredApprovals.map((a) => a.id));
        });
    }, [filteredApprovals]);

    const handleRevoke = useCallback((_approval: Approval): void => {
        // Stub - will be wired in Task 11
    }, []);

    const handleEdit = useCallback((_approval: Approval): void => {
        // Stub - will be wired in Task 11
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
                <DashboardSummary approvals={filteredApprovals} />
                <FilterBar approvals={approvals} onFiltered={handleFiltered} />
                <ApprovalTable
                    approvals={filteredApprovals}
                    selectedIds={selectedIds}
                    onSelectToggle={handleSelectToggle}
                    onSelectAll={handleSelectAll}
                    onRevoke={handleRevoke}
                    onEdit={handleEdit}
                    isLoading={isLoading}
                    isConnected={isReady}
                />
            </main>
            <Footer />
        </div>
    );
}
