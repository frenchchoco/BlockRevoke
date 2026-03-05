import { type ReactElement, useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardSummary } from './components/DashboardSummary';
import { FilterBar } from './components/FilterBar';
import { ApprovalTable } from './components/ApprovalTable';
import { RevokeConfirmDialog } from './components/RevokeConfirmDialog';
import { EditModal } from './components/EditModal';
import { BatchActions } from './components/BatchActions';
import { useApprovals } from './hooks/useApprovals';
import { useWallet } from './hooks/useWallet';
import { useDevFee } from './hooks/useDevFee';
import { useRevokeAction } from './hooks/useRevokeAction';
import { useEditAction } from './hooks/useEditAction';
import { useBatchRevoke } from './hooks/useBatchRevoke';
import type { Approval } from './types/approval';

export default function App(): ReactElement {
    const { approvals, isLoading } = useApprovals();
    const { isReady } = useWallet();
    const { freeRemaining, feeRequired, feeSats } = useDevFee();

    const [filteredApprovals, setFilteredApprovals] = useState<Approval[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Revoke action
    const {
        targetApproval: revokeTarget,
        isLoading: revokeLoading,
        error: revokeError,
        startRevoke,
        confirmRevoke,
        cancelRevoke,
    } = useRevokeAction();

    // Edit action
    const {
        targetApproval: editTarget,
        isLoading: editLoading,
        error: editError,
        startEdit,
        confirmEdit,
        cancelEdit,
    } = useEditAction();

    // Batch revoke
    const {
        batchState,
        startBatch,
        executeBatch,
        cancelBatch,
    } = useBatchRevoke();

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

    const handleRevoke = useCallback(
        (approval: Approval): void => {
            startRevoke(approval);
        },
        [startRevoke],
    );

    const handleEdit = useCallback(
        (approval: Approval): void => {
            startEdit(approval);
        },
        [startEdit],
    );

    const selectedApprovals = useMemo((): Approval[] => {
        return approvals.filter((a) => selectedIds.has(a.id));
    }, [approvals, selectedIds]);

    const handleBatchExecute = useCallback((): void => {
        startBatch(selectedApprovals);
        void executeBatch();
    }, [selectedApprovals, startBatch, executeBatch]);

    const handleBatchCancel = useCallback((): void => {
        cancelBatch();
    }, [cancelBatch]);

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

            <RevokeConfirmDialog
                approval={revokeTarget}
                onConfirm={confirmRevoke}
                onCancel={cancelRevoke}
                isLoading={revokeLoading}
                error={revokeError}
                feeRequired={feeRequired}
                freeRemaining={freeRemaining}
                feeSats={feeSats}
            />

            <EditModal
                approval={editTarget}
                onSave={confirmEdit}
                onCancel={cancelEdit}
                isLoading={editLoading}
                error={editError}
                feeRequired={feeRequired}
                feeSats={feeSats}
            />

            {selectedIds.size > 0 ? (
                <BatchActions
                    selectedApprovals={selectedApprovals}
                    onExecute={handleBatchExecute}
                    onCancel={handleBatchCancel}
                    batchState={batchState}
                    feeRequired={feeRequired}
                    freeRemaining={freeRemaining}
                    feeSats={feeSats}
                />
            ) : null}
        </div>
    );
}
