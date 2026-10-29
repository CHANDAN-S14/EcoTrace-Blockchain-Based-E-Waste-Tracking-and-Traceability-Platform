import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNavigation } from './MobileNavigation'
import { ToastContainer } from '../common/Toast'
import { BatchDetailModal } from '../batches/BatchDetailModal'
import { QrCodeModal } from '../batches/QrCodeModal'
import { useBatchStore } from '../../hooks/useBatchStore'

export function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const {
    toasts,
    removeToast,
    selectedBatchForModal,
    setSelectedBatchForModal,
    qrModalBatch,
    setQrModalBatch,
  } = useBatchStore()

  return (
    <div className="min-h-screen bg-[#FAFCFA] text-[#26352E] flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer */}
      <MobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <Topbar onMenuClick={() => setIsMobileNavOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Modals and Notifications */}
      {selectedBatchForModal && (
        <BatchDetailModal
          batch={selectedBatchForModal}
          onClose={() => setSelectedBatchForModal(null)}
        />
      )}

      {qrModalBatch && (
        <QrCodeModal
          batch={qrModalBatch}
          onClose={() => setQrModalBatch(null)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  )
}
