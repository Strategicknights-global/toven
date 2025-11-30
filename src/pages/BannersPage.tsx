import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2, Eye, ExternalLink } from 'lucide-react';
import CreateBannerDialog from '../components/CreateBannerDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import Dialog from '../components/Dialog';
import { useBannersStore } from '../stores/bannersStore';
import type { BannerSchema, BannerPlacement } from '../schemas/BannerSchema';
import { BANNER_PLACEMENT_OPTIONS, getBannerPlacementMeta } from '../schemas/BannerSchema';

interface PlacementGroup {
  placement: BannerPlacement;
  title: string;
  description: string;
  banners: BannerSchema[];
}

const formatDateTime = (date?: Date | null): string => {
  if (!date) {
    return '—';
  }
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const BannersPage: React.FC = () => {
  const {
    banners,
    loading,
    creating,
    deletingId,
    loadBanners,
    createBanner,
    updateBanner,
    deleteBanner,
  } = useBannersStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetPlacement, setTargetPlacement] = useState<BannerPlacement>('home');
  const [previewBanner, setPreviewBanner] = useState<BannerSchema | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BannerSchema | null>(null);
  const [editBanner, setEditBanner] = useState<BannerSchema | null>(null);

  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) {
      return;
    }
    initialLoadRef.current = true;
    void loadBanners();
  }, [loadBanners]);

  const placementGroups = useMemo<PlacementGroup[]>(() => {
    const map = new Map<BannerPlacement, BannerSchema[]>();
    BANNER_PLACEMENT_OPTIONS.forEach((option) => {
      map.set(option.value, []);
    });

    banners.forEach((banner) => {
      if (map.has(banner.placement)) {
        map.get(banner.placement)?.push(banner);
      }
    });

    return BANNER_PLACEMENT_OPTIONS.map((option) => ({
      placement: option.value,
      title: option.sectionTitle,
      description: option.description,
      banners: (map.get(option.value) ?? []).slice().sort((a, b) => {
        if (typeof a.sortOrder === 'number' && typeof b.sortOrder === 'number') {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
        }
        const aCreated = a.createdAt?.getTime() ?? 0;
        const bCreated = b.createdAt?.getTime() ?? 0;
        return bCreated - aCreated;
      }),
    }));
  }, [banners]);

  const handleOpenDialog = (placement: BannerPlacement) => {
    setTargetPlacement(placement);
    setDialogOpen(true);
  };

  const handleCreateBanner = async (payload: Parameters<typeof createBanner>[0]) => {
    // If editing, route to updateBanner instead
    if (editBanner) {
      const success = await updateBanner(editBanner.id, {
        placement: payload.placement,
        fileName: payload.fileName,
        imageBase64: payload.imageBase64 ?? undefined,
        imageUrl: payload.imageUrl ?? undefined,
        title: payload.title ?? undefined,
        description: payload.description ?? undefined,
        ctaLabel: payload.ctaLabel ?? undefined,
        ctaHref: payload.ctaHref ?? undefined,
        sortOrder: payload.sortOrder ?? undefined,
        isActive: payload.isActive ?? undefined,
      });
      if (success) {
        setDialogOpen(false);
        setEditBanner(null);
      }
      return;
    }

    const id = await createBanner(payload);
    if (id) {
      setDialogOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) {
      return;
    }
    await deleteBanner(confirmDelete.id, confirmDelete.fileName);
    setConfirmDelete(null);
  };

  const previewSource = previewBanner?.imageBase64 || previewBanner?.imageUrl || null;
  const previewPlacement = previewBanner ? getBannerPlacementMeta(previewBanner.placement) : null;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-3 shadow-lg">
              <ImagePlus className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Public Page Banners</h1>
              <p className="text-sm text-slate-600">
                Upload and organize hero imagery for the public site including home, subscription, and party order pages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenDialog('home')}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <Plus className="h-4 w-4" /> Upload Banner
          </button>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading banners…
          </div>
        ) : (
          placementGroups.map((group) => (
            <section key={group.placement} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{group.title}</h2>
                  <p className="text-sm text-slate-500">{group.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDialog(group.placement)}
                  className="inline-flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 transition hover:bg-purple-100"
                >
                  <Plus className="h-4 w-4" /> Add Banner
                </button>
              </div>

              {group.banners.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No banners uploaded for this placement yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Image</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {group.placement === 'home-categories' ? 'Title' : 'File Name'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created At</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {group.banners.map((banner) => {
                        const isDeleting = deletingId === banner.id;
                        const preview = banner.imageBase64 || banner.imageUrl || '';
                        return (
                          <tr key={banner.id} className="hover:bg-purple-50/50">
                            <td className="px-6 py-3 text-sm text-slate-700">
                              {preview ? (
                                <img src={preview} alt={banner.fileName} className="h-16 w-28 rounded-md object-cover shadow-sm" />
                              ) : (
                                <span className="text-xs text-slate-400">No image</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-slate-900">
                              {(() => {
                                const isLandingCategory = group.placement === 'home-categories';
                                const primaryLabel = isLandingCategory
                                  ? (banner.title?.trim() || banner.fileName)
                                  : banner.fileName;

                                const metaLines: React.ReactNode[] = [];

                                if (isLandingCategory && banner.fileName) {
                                  metaLines.push(
                                    <span key="file" className="text-xs text-slate-500">
                                      File: {banner.fileName}
                                    </span>,
                                  );
                                } else if (!isLandingCategory && banner.title) {
                                  metaLines.push(
                                    <span key="title" className="text-xs text-slate-500">
                                      {banner.title}
                                    </span>,
                                  );
                                }

                                if (banner.description) {
                                  metaLines.push(
                                    <span key="description" className="text-xs text-slate-400">
                                      {banner.description}
                                    </span>,
                                  );
                                }

                                if (banner.ctaLabel) {
                                  metaLines.push(
                                    <span key="cta" className="text-xs text-slate-400">
                                      CTA: {banner.ctaLabel}
                                      {banner.ctaHref ? (
                                        <>
                                          {' '}
                                          <span className="text-[10px] text-slate-400">({banner.ctaHref})</span>
                                        </>
                                      ) : null}
                                    </span>,
                                  );
                                }

                                return (
                                  <div className="flex flex-col">
                                    <span>{primaryLabel}</span>
                                    {metaLines}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-600">{formatDateTime(banner.createdAt)}</td>
                            <td className="px-6 py-3 text-sm">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                  banner.isActive === false
                                    ? 'bg-slate-200 text-slate-600'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {banner.isActive === false ? 'Inactive' : 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewBanner(banner)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                                >
                                  <Eye className="h-4 w-4" /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditBanner(banner);
                                    setTargetPlacement(banner.placement);
                                    setDialogOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                                >
                                  Edit
                                </button>
                                {banner.imageUrl ? (
                                  <a
                                    href={banner.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                                  >
                                    <ExternalLink className="h-4 w-4" /> Open
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(banner)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))
        )}
      </div>

      <CreateBannerDialog
        open={dialogOpen}
        creating={creating}
        initialPlacement={targetPlacement}
        initialBanner={editBanner}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreateBanner}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete banner"
        description={(
          <span>
            Are you sure you want to permanently remove
            {' '}
            <strong>{confirmDelete?.fileName ?? 'this banner'}</strong>
            ?
          </span>
        )}
        confirmLabel="Delete"
        variant="danger"
        loading={Boolean(confirmDelete && deletingId === confirmDelete.id)}
        onCancel={() => {
          if (!deletingId) {
            setConfirmDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />

      <Dialog
        open={Boolean(previewBanner)}
        onClose={() => setPreviewBanner(null)}
        title={previewBanner ? previewBanner.fileName : 'Banner preview'}
        description={previewPlacement ? previewPlacement.sectionTitle : undefined}
        size="xl"
        footer={null}
      >
        {previewSource ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-md">
            <img src={previewSource} alt={previewBanner?.fileName} className="w-full object-contain" />
          </div>
        ) : (
          <p className="text-sm text-slate-500">This banner does not have an image associated with it.</p>
        )}
      </Dialog>
    </div>
  );
};

export default BannersPage;
