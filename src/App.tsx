import { type ReactElement, useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardSummary } from './components/DashboardSummary';
import { FilterBar } from './components/FilterBar';
import { ApprovalTable } from './components/ApprovalTable';
import { RevokeConfirmDialog } from './components/RevokeConfirmDialog';
import { EditModal } from './components/EditModal';
import { BatchActions } from './components/BatchActions';
import { ScanProgress } from './components/ScanProgress';
import { HistoryTimeline } from './components/HistoryTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { useApprovals } from './hooks/useApprovals';
import { useWallet } from './hooks/useWallet';
import { useRevokeAction } from './hooks/useRevokeAction';
import { useEditAction } from './hooks/useEditAction';
import { useBatchRevoke } from './hooks/useBatchRevoke';
import type { Approval } from './types/approval';

export default function App(): ReactElement {
    const { approvals, isLoading } = useApprovals();
    const { isReady } = useWallet();

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
        void executeBatch(selectedApprovals);
    }, [selectedApprovals, executeBatch]);

    const handleBatchCancel = useCallback((): void => {
        cancelBatch();
    }, [cancelBatch]);

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
                {isReady ? <ScanProgress /> : null}

                <Tabs defaultValue="approvals" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="approvals">Approvals</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="approvals">
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
                    </TabsContent>

                    <TabsContent value="history">
                        <HistoryTimeline />
                    </TabsContent>
                </Tabs>
            </main>
            <Footer />

            <RevokeConfirmDialog
                approval={revokeTarget}
                onConfirm={confirmRevoke}
                onCancel={cancelRevoke}
                isLoading={revokeLoading}
                error={revokeError}
            />

            <EditModal
                approval={editTarget}
                onSave={confirmEdit}
                onCancel={cancelEdit}
                isLoading={editLoading}
                error={editError}
            />

            {selectedIds.size > 0 ? (
                <BatchActions
                    selectedApprovals={selectedApprovals}
                    onExecute={handleBatchExecute}
                    onCancel={handleBatchCancel}
                    batchState={batchState}
                />
            ) : null}
        </div>
    );
}
