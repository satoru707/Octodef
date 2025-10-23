"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Shield, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { usePastSessions, useDeleteSessions } from "../lib/defenseQueries";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { getSession } from "next-auth/react";
import { toast } from "sonner";
import { SessionProps } from "@/types/types";

export const ProfilePage = () => {
  const [session, setSession] = useState<SessionProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set()
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const { data: sessions, isLoading, error, refetch } = usePastSessions();
  const { mutate: deleteSessionsMutation, isPending: isDeleting } =
    useDeleteSessions();

  useEffect(() => {
    async function fetchSession() {
      try {
        const currentSession = (await getSession()) as SessionProps;
        if (!currentSession) {
          router.push("/auth/signin");
          return;
        }
        setSession({
          expires: currentSession.expires,
          provider: currentSession.provider || "",
          user: {
            email: currentSession.user?.email || "",
            image: currentSession.user?.image || "",
            name: currentSession.user?.name || "",
          },
        });
      } catch (err) {
        console.error("Session fetch failed:", err);
        toast.error("Failed to fetch session");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [router]);

  const handleSessionSelect = useCallback(
    (sessionId: string, checked: boolean) => {
      setSelectedSessions((prev) => {
        const newSet = new Set(prev);
        if (checked) newSet.add(sessionId);
        else newSet.delete(sessionId);
        return newSet;
      });
    },
    []
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedSessions(
        checked ? new Set(sessions?.map((s) => s._id) || []) : new Set()
      );
    },
    [sessions]
  );

  const handleDeleteClick = () => {
    if (selectedSessions.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    const sessionIdsArray = Array.from(selectedSessions);

    deleteSessionsMutation(sessionIdsArray, {
      onSuccess: () => {
        toast.success(
          `${selectedSessions.size} session(s) deleted successfully`
        );
        exitSelectionMode();
      },
      onError: () => {
        toast.error("Failed to delete sessions");
      },
    });

    setShowDeleteConfirm(false);
  };

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedSessions(new Set());
  }, []);

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        exitSelectionMode();
      } else {
        setSelectedSessions(new Set());
        return true;
      }
      return false;
    });
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner message="Loading profile..." />
      </div>
    );

  if (!session) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const allSelected = sessions && selectedSessions.size === sessions.length;
  const selectionInfo = `${selectedSessions.size}/${sessions?.length || 0}`;

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="mb-8">
          <h1 className="text-4xl text-white mb-2">Profile</h1>
          <p className="text-gray-400">
            Manage your account and view defense history
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-[#111] border-[#1e3a8a]/30 md:col-span-1">
            <CardHeader className="text-center">
              <Image
                src={session.user.image || "/default.png"}
                alt={session.user.name}
                width={96}
                height={96}
                className="rounded-full mx-auto mb-4"
              />
              <CardTitle className="text-white">{session.user.name}</CardTitle>
              <CardDescription className="text-gray-400">
                {session.provider === "twitter"
                  ? `@user_${
                      session.user.name?.replace(/\s+/g, "").slice(0, 8) ||
                      "anon"
                    }`
                  : session.user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Provider</span>
                <Badge className="bg-[#1e3a8a]/20 text-[#1e3a8a] border-[#1e3a8a]/50 capitalize">
                  {session.provider || "unknown"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Member since</span>
                <span className="text-sm text-white">Oct 2025</span>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-[#111] border-[#1e3a8a]/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Shield className="w-8 h-8 text-[#1e3a8a] mx-auto mb-2" />
                    <p className="text-3xl text-white mb-1">
                      {sessions?.length || 0}
                    </p>
                    <p className="text-sm text-gray-400">Total Defenses</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#111] border-[#1e3a8a]/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Calendar className="w-8 h-8 text-[#065f46] mx-auto mb-2" />
                    <p className="text-3xl text-white mb-1">
                      {sessions?.filter((s) => s.severity === "critical")
                        .length || 0}
                    </p>
                    <p className="text-sm text-gray-400">Critical Threats</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Defense History */}
        <Card className="bg-[#111] border-[#1e3a8a]/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Defense History</CardTitle>
              <CardDescription className="text-gray-400">
                Your recent threat analysis sessions
              </CardDescription>
            </div>

            {sessions && sessions.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSelectionMode}
                className={`
                  h-9 w-9 p-0 transition-all duration-200
                  ${
                    selectionMode
                      ? "text-red-400 bg-red-500/10 hover:bg-red-500/20"
                      : "text-gray-400 hover:bg-gray-800"
                  }
                `}
                title={
                  selectionMode
                    ? "Exit Selection Mode"
                    : "Select Sessions to Delete"
                }
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>

          <CardContent>
            {isLoading && <LoadingSpinner message="Loading sessions..." />}
            {error && (
              <ErrorMessage
                message="Failed to load sessions"
                onRetry={refetch}
              />
            )}

            {sessions && sessions.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No defense sessions yet</p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="mt-4 bg-[#1e3a8a] hover:bg-[#2563eb] text-white"
                >
                  Start Your First Defense
                </Button>
              </div>
            )}

            {sessions && sessions.length > 0 && (
              <>
                {/* 🚀 SELECTION TOOLBAR - Slides down */}
                {selectionMode && (
                  <div
                    className={`
                    mb-6 p-4 rounded-lg border transition-all duration-300 ease-in-out
                    ${
                      isDeleting
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-red-500/5 border-red-500/20"
                    }
                  `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4 w-4 text-red-500 rounded focus:ring-2 focus:ring-red-500"
                          />
                          <span className="text-sm font-medium text-white">
                            Select All
                          </span>
                        </label>
                        <span className="text-sm text-red-300 font-medium">
                          {selectionInfo} selected
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteClick}
                        disabled={isDeleting || selectedSessions.size === 0}
                        className={`
                          h-8 gap-2 transition-all duration-200
                          ${
                            isDeleting
                              ? "bg-red-600/80 cursor-not-allowed"
                              : "bg-red-600 hover:bg-red-700"
                          }
                        `}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sessions List */}
                <div className="space-y-3">
                  {sessions.map((sessionItem) => {
                    const isSelected = selectedSessions.has(sessionItem._id);
                    return (
                      <div
                        key={sessionItem._id}
                        className={`
                          w-full rounded-lg p-4 transition-all duration-200 border cursor-pointer
                          group hover:shadow-md
                          ${
                            selectionMode
                              ? isSelected
                                ? "bg-red-500/10 border-red-500/30 shadow-red-500/20"
                                : "bg-black/20 border-red-500/20 hover:border-red-500/30"
                              : "bg-black border-[#333] hover:border-[#1e3a8a] hover:bg-[#1e3a8a]/5"
                          }
                        `}
                      >
                        <label className="flex items-start justify-between gap-4 w-full">
                          {/* Checkbox */}
                          {selectionMode && (
                            <div className="flex-shrink-0 mt-0.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  handleSessionSelect(
                                    sessionItem._id,
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4 text-red-500 rounded focus:ring-2 focus:ring-red-500"
                              />
                            </div>
                          )}

                          {/* Session Content */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              if (!selectionMode) {
                                router.push(`/session/${sessionItem._id}`);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-[#1e3a8a]/20 text-[#1e3a8a] border-[#1e3a8a]/50">
                                {sessionItem.input.type.toUpperCase()}
                              </Badge>
                              {sessionItem.severity && (
                                <Badge
                                  className={getSeverityColor(
                                    sessionItem.severity
                                  )}
                                >
                                  {sessionItem.severity.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <p
                              className={`text-sm mb-1 truncate transition-colors duration-200 ${
                                isSelected ? "text-red-300" : "text-white"
                              }`}
                            >
                              {sessionItem.input.data}
                            </p>
                            <p
                              className={`text-xs transition-colors duration-200 ${
                                isSelected ? "text-red-400" : "text-gray-500"
                              }`}
                            >
                              {new Date(sessionItem.timestamp).toLocaleString()}
                            </p>
                          </div>

                          {/* Risk Score */}
                          {sessionItem.overallRisk !== undefined && (
                            <div
                              className={`text-right flex-shrink-0 transition-colors duration-200 ${
                                isSelected ? "text-red-300" : "text-white"
                              }`}
                            >
                              <p className="text-2xl font-bold">
                                {sessionItem.overallRisk}
                              </p>
                              <p
                                className={`text-xs ${
                                  isSelected ? "text-red-400" : "text-gray-400"
                                }`}
                              >
                                Risk Score
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 🚀 CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div
            className={`
            bg-[#111] border border-red-500/30 rounded-xl p-6 w-full max-w-md mx-4
            transform scale-100 transition-all duration-200
          `}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  Delete {selectedSessions.size} Sessions
                </h3>
                <p className="text-gray-400 text-sm">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 mb-6 text-sm">
              Are you sure you want to permanently delete these{" "}
              {selectedSessions.size}
              defense sessions from your history?
            </p>

            {/* Footer */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-gray-600 text-gray-400 hover:bg-gray-800 h-9 px-4"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 h-9 px-4 gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedSessions.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;