"use client";

import { useCallback, useState } from "react";
import AdminDeleteConfirmDialog from "./AdminDeleteConfirmDialog";

type DeleteRequest = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function useAdminDeleteConfirm() {
  const [request, setRequest] = useState<DeleteRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const openDeleteConfirm = useCallback((opts: DeleteRequest) => {
    setRequest(opts);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    if (!loading) setRequest(null);
  }, [loading]);

  async function handleConfirm() {
    if (!request) return;
    setLoading(true);
    try {
      await request.onConfirm();
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }

  const DeleteConfirmDialog = request ? (
    <AdminDeleteConfirmDialog
      open
      title={request.title}
      description={request.description}
      confirmLabel={request.confirmLabel}
      loading={loading}
      onCancel={closeDeleteConfirm}
      onConfirm={handleConfirm}
    />
  ) : null;

  return { openDeleteConfirm, DeleteConfirmDialog };
}
