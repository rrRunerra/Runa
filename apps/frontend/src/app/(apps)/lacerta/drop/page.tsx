"use client";

import React from "react";
import { Loader2, Upload } from "lucide-react";
import { useLacertaSharing } from "./use-lacerta-sharing";
import { LacertaDropStarMap } from "./components/LacertaDropStarMap";
import { IncomingRequestModal } from "./components/IncomingRequestModal";
import { LacertaShareDialog } from "./components/LacertaShareDialog";

export default function LacertaDropPage(): React.JSX.Element {
  const {
    status,
    session,
    peers,
    isHidden,
    isDraggingOver,
    transfers,
    incomingRequests,
    fileInputRef,
    folderInputRef,
    myConstellation,
    handleToggleHidden,
    handlePeerClick,
    handleFileInputChange,
    handleFolderInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    acceptIncomingTransfer,
    declineIncomingTransfer,
    cancelActiveTransfer,
    dismissTransfer,
    activeSharePeer,
    setActiveSharePeer,
    preselectedFiles,
    pendingPinRequests,
    pinError,
    submitPin,
    queueFileForSend,
    queueTextForSend,
    myGuestAlias,
  } = useLacertaSharing();

  if (status === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-semibold">
            Checking authorization...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full w-full bg-background text-foreground p-0 relative select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-screen StarMap */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <LacertaDropStarMap
          peers={peers}
          myConstellation={myConstellation}
          currentUser={session?.user}
          myGuestAlias={myGuestAlias}
          isHidden={isHidden}
          onSelectPeer={handlePeerClick}
          onToggleVisibility={handleToggleHidden}
          transfers={transfers}
          onCancelTransfer={cancelActiveTransfer}
          onDismissTransfer={dismissTransfer}
        />
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
      />

      {/* Hidden folder input */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderInputChange}
        className="hidden"
        multiple
        {...({
          webkitdirectory: "",
          directory: "",
        } as any)}
      />

      {/* Drag & drop overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs border-4 border-dashed border-primary flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
          <Upload className="h-16 w-16 text-primary animate-bounce mb-4" />
          <h2 className="text-xl font-bold text-foreground">
            Drop Files or Folders to Transfer
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm font-semibold leading-normal">
            Drag items directly over the StarMap to initiate direct local transfer.
          </p>
        </div>
      )}

      {/* Share Dialog */}
      {activeSharePeer && (
        <LacertaShareDialog
          peer={activeSharePeer}
          onClose={() => setActiveSharePeer(null)}
          preselectedFiles={preselectedFiles}
          onSendFiles={(files, requirePin) => {
            queueFileForSend(activeSharePeer.socketId, activeSharePeer.username, files, requirePin);
          }}
          onSendText={(text, title, requirePin) => {
            queueTextForSend(activeSharePeer.socketId, activeSharePeer.username, text, title, requirePin);
          }}
        />
      )}

      {/* Incoming Request Dialog Modal */}
      <IncomingRequestModal
        request={incomingRequests[0] || null}
        onDecline={() => {
          if (incomingRequests[0]) {
            declineIncomingTransfer(incomingRequests[0].batchId);
          }
        }}
        onAccept={(acceptedIndices) => {
          if (incomingRequests[0]) {
            acceptIncomingTransfer(incomingRequests[0].batchId, acceptedIndices);
          }
        }}
        pendingPinRequests={pendingPinRequests}
        pinError={pinError}
        onSubmitPin={submitPin}
        onDeclinePin={(batchId) => {
          // Decline the pending PIN request
          declineIncomingTransfer(batchId);
        }}
      />
    </div>
  );
}
