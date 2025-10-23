'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowLeft, CheckCircle, Clock, AlertCircle, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface SpeedyIndexTask {
  id: string;
  size: number;
  processed_count: number;
  indexed_count: number;
  title: string;
  type: string;
  is_completed: boolean;
  created_at: string;
}

interface TaskReport {
  id: string;
  size: number;
  processed_count: number;
  indexed_links: Array<{ url: string; title?: string }>;
  unindexed_links: Array<{ url: string; error_code?: number }>;
  title: string;
  type: string;
  created_at: string;
}

export default function SpeedyIndexTasksPage() {
  const [tasks, setTasks] = useState<SpeedyIndexTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<TaskReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/indexer/speedyindex-tasks?page=${page}&type=indexer`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
        setLastPage(data.lastPage);
      }
    } catch (error) {
      console.error('Error fetching SpeedyIndex tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskReport = async (taskId: string) => {
    setLoadingReport(true);
    try {
      const response = await fetch(`/api/indexer/speedyindex-tasks/${taskId}`);
      const data = await response.json();
      if (data.success && data.task) {
        setSelectedTask(data.task);
      }
    } catch (error) {
      console.error('Error fetching task report:', error);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = (processed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((processed / total) * 100);
  };

  const getStatusBadge = (task: SpeedyIndexTask) => {
    const progress = getProgressPercentage(task.processed_count, task.size);

    if (task.is_completed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" /> Completed
        </span>
      );
    } else if (progress > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3" /> Processing ({progress}%)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
          <AlertCircle className="w-3 h-3" /> Pending
        </span>
      );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/indexer"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Indexer</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SpeedyIndex Tasks</h1>
            <p className="text-sm text-gray-600 mt-1">View all indexing tasks submitted to SpeedyIndex API</p>
          </div>
          <button
            onClick={fetchTasks}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No tasks found
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <span className="text-xs font-semibold text-gray-900 uppercase">Task Title</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-xs font-semibold text-gray-900 uppercase">Status</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs font-semibold text-gray-900 uppercase">Total</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs font-semibold text-gray-900 uppercase">Processed</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs font-semibold text-gray-900 uppercase">Indexed</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-xs font-semibold text-gray-900 uppercase">Created</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs font-semibold text-gray-900 uppercase">Actions</span>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <div key={task.id} className="px-4 py-4 hover:bg-gray-50 transition">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Task Title */}
                    <div className="col-span-4">
                      <div className="font-medium text-gray-900 truncate">{task.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{task.type}</div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex justify-center">
                      {getStatusBadge(task)}
                    </div>

                    {/* Total Links */}
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-semibold text-gray-900">{task.size}</span>
                    </div>

                    {/* Processed */}
                    <div className="col-span-1 text-center">
                      <span className="text-sm text-gray-900">{task.processed_count}</span>
                    </div>

                    {/* Indexed */}
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-semibold text-green-600">{task.indexed_count}</span>
                    </div>

                    {/* Created */}
                    <div className="col-span-2 text-center">
                      <span className="text-xs text-gray-600">{formatDate(task.created_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => fetchTaskReport(task.id)}
                        disabled={!task.is_completed}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        View Report
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page + 1} of {lastPage + 1}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              disabled={page === lastPage}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Task Report Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Task Report</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingReport ? (
                <div className="text-center py-8 text-gray-500">Loading report...</div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Total Links</div>
                      <div className="text-2xl font-bold text-blue-600">{selectedTask.size}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Indexed</div>
                      <div className="text-2xl font-bold text-green-600">{selectedTask.indexed_links.length}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Unindexed</div>
                      <div className="text-2xl font-bold text-red-600">{selectedTask.unindexed_links.length}</div>
                    </div>
                  </div>

                  {/* Indexed Links */}
                  {selectedTask.indexed_links.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Indexed Links ({selectedTask.indexed_links.length})</h3>
                      <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                          {selectedTask.indexed_links.map((link, index) => (
                            <div key={index} className="px-4 py-3 border-b border-green-100 last:border-b-0">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{link.url}</span>
                              </a>
                              {link.title && (
                                <div className="text-xs text-gray-600 mt-1 ml-5">{link.title}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Unindexed Links */}
                  {selectedTask.unindexed_links.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Unindexed Links ({selectedTask.unindexed_links.length})</h3>
                      <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                          {selectedTask.unindexed_links.map((link, index) => (
                            <div key={index} className="px-4 py-3 border-b border-red-100 last:border-b-0">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{link.url}</span>
                              </a>
                              {link.error_code !== undefined && (
                                <div className="text-xs text-red-600 mt-1 ml-5">
                                  Error code: {link.error_code === -1 ? 'noindex tag found' : link.error_code === 0 ? 'no errors' : `HTTP ${link.error_code}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
