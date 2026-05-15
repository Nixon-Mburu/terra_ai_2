/**
 * useTerraStore.js
 * ──────────────────────────────────────────────────────────────
 * Terra AI — Global Zustand State Store (Persisted via sessionStorage)
 *
 * ARCHITECTURE RULE: This is the single source of truth for the entire app.
 * No prop-drilling. All engine data lives here.
 * The `persist` middleware uses sessionStorage so state survives route
 * navigation within a single browser session but resets on tab close.
 * ──────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Scan Status Type ────────────────────────────────────────
// 'idle' | 'scanning' | 'complete'
//
// ─── Engine Status Type ──────────────────────────────────────
// 'idle' | 'loading' | 'done' | 'error'
// ─────────────────────────────────────────────────────────────

const useTerraStore = create(
  persist(
    (set, get) => ({

      // ─────────────────────────────────────────────────────────
      // § 1. USER SESSION
      //   Tracks the active project and history of recent analyses.
      // ─────────────────────────────────────────────────────────
      userSession: {
        currentProjectId: null,
        recentProjects: [],
      },

      setCurrentProjectId: (id) =>
        set((state) => ({
          userSession: { ...state.userSession, currentProjectId: id },
        })),

      addRecentProject: (project) =>
        set((state) => ({
          userSession: {
            ...state.userSession,
            recentProjects: [
              project,
              ...state.userSession.recentProjects.filter(
                (p) => p.id !== project.id
              ),
            ].slice(0, 10), // cap at 10 recent projects
          },
        })),

      // ─────────────────────────────────────────────────────────
      // § 2. VISION STATE
      //   Manages image upload, scanner animation, and YOLO results.
      // ─────────────────────────────────────────────────────────
      visionState: {
        uploadedImageBlob: null,   // base64 dataURL string (for preview)
        uploadedFile: null,        // raw File object (for FormData upload)
        uploadedFileName: null,    // original file name for display
        scanStatus: 'idle',        // 'idle' | 'scanning' | 'complete'
        annotations: [],           // ordered array from engine
        rawVisionPayload: null,    // the full JSON response from /api/vision/analyze
      },

      setUploadedImage: (imageBlob, fileName, file) =>
        set((state) => ({
          visionState: {
            ...state.visionState,
            uploadedImageBlob: imageBlob,
            uploadedFile: file ?? null,
            uploadedFileName: fileName,
            scanStatus: 'idle',
            annotations: [],
            rawVisionPayload: null,
          },
        })),

      setScanStatus: (status) =>
        set((state) => ({
          visionState: { ...state.visionState, scanStatus: status },
        })),

      setAnnotations: (annotations, rawPayload) =>
        set((state) => ({
          visionState: {
            ...state.visionState,
            annotations,
            rawVisionPayload: rawPayload,
            scanStatus: 'complete',
          },
        })),

      clearVisionState: () =>
        set((state) => ({
          visionState: {
            ...state.visionState,
            uploadedImageBlob: null,
            uploadedFile: null,
            uploadedFileName: null,
            scanStatus: 'idle',
            annotations: [],
            rawVisionPayload: null,
          },
        })),

      // ─────────────────────────────────────────────────────────
      // § 3. MAP STATE
      //   Stores the geo-coordinates the user pins on the map
      //   and any pre-validated location metadata.
      // ─────────────────────────────────────────────────────────
      mapState: {
        pinnedCoordinates: { lat: null, lng: null },
        approvedLocationData: null, // { address, placeName, bounds }
      },

      setPinnedCoordinates: (lat, lng) =>
        set((state) => ({
          mapState: {
            ...state.mapState,
            pinnedCoordinates: { lat, lng },
          },
        })),

      setApprovedLocationData: (locationData) =>
        set((state) => ({
          mapState: { ...state.mapState, approvedLocationData: locationData },
        })),

      clearMapState: () =>
        set((state) => ({
          mapState: {
            pinnedCoordinates: { lat: null, lng: null },
            approvedLocationData: null,
          },
        })),

      // ─────────────────────────────────────────────────────────
      // § 4. ENGINE STATE
      //   Tracks the full lifecycle of a spatial analysis job.
      //   This is the most critical slice — the PDF depends on it.
      //
      //   API contract:
      //     POST /api/spatial/analyze → { payload, report }
      //     POST /api/vision/analyze  → { annotations, payload }
      // ─────────────────────────────────────────────────────────
      engineState: {
        status: 'idle',           // 'idle' | 'loading' | 'done' | 'error'
        progressMessage: '',      // cycling loading text for ProgressiveLoader
        payload: null,            // full spatial JSON from Flask engine
        report: null,             // Gemini-generated narrative report
        errorMessage: null,       // displayed on error toast
      },

      setEngineStatus: (status, progressMessage = '') =>
        set((state) => ({
          engineState: { ...state.engineState, status, progressMessage },
        })),

      setEngineResult: (payload, report, reportSource = 'gemini', modelUsed = null) =>
        set((state) => ({
          engineState: {
            ...state.engineState,
            status: 'done',
            progressMessage: '',
            payload,
            report,
            reportSource,
            modelUsed,
            errorMessage: null,
          },
        })),

      setEngineError: (errorMessage) =>
        set((state) => ({
          engineState: {
            ...state.engineState,
            status: 'error',
            progressMessage: '',
            errorMessage,
          },
        })),

      resetEngineState: () =>
        set(() => ({
          engineState: {
            status: 'idle',
            progressMessage: '',
            payload: null,
            report: null,
            errorMessage: null,
          },
        })),

      // ─────────────────────────────────────────────────────────
      // § 5. PDF STATE
      //   Prevents duplicate generation and provides UI feedback.
      // ─────────────────────────────────────────────────────────
      pdfState: {
        isGenerating: false,
      },

      setPdfGenerating: (isGenerating) =>
        set(() => ({ pdfState: { isGenerating } })),

      // ─────────────────────────────────────────────────────────
      // § GLOBAL RESET
      //   Hard-resets everything except recentProjects.
      // ─────────────────────────────────────────────────────────
      resetAll: () =>
        set((state) => ({
          visionState: {
            uploadedImageBlob: null,
            uploadedFile: null,
            uploadedFileName: null,
            scanStatus: 'idle',
            annotations: [],
            rawVisionPayload: null,
          },
          mapState: {
            pinnedCoordinates: { lat: null, lng: null },
            approvedLocationData: null,
          },
          engineState: {
            status: 'idle',
            progressMessage: '',
            payload: null,
            report: null,
            errorMessage: null,
          },
          pdfState: { isGenerating: false },
          userSession: {
            ...state.userSession,
            currentProjectId: null,
          },
        })),
    }),

    // ─── Persist Config ──────────────────────────────────────
    {
      name: 'terra-ai-session',
      storage: createJSONStorage(() => sessionStorage),

      // Only persist non-blob data to avoid sessionStorage bloat.
      // The image blob is stored but cleared on hard reset.
      partialize: (state) => ({
        userSession: state.userSession,
        mapState: state.mapState,
        engineState: {
          ...state.engineState,
          // Don't bloat sessionStorage with the full payload on reload
          // If the user refreshes mid-result, we gracefully reset to idle
          status: state.engineState.status === 'loading'
            ? 'idle'
            : state.engineState.status,
          progressMessage: '',
        },
        pdfState: state.pdfState,
        // uploadedImageBlob and uploadedFile excluded from persistence (binary/not serializable)
        visionState: {
          ...state.visionState,
          uploadedImageBlob: null,
          uploadedFile: null,
        },
      }),
    }
  )
);

export default useTerraStore;
