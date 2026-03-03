'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Shield, AlertTriangle, Copy, CheckCircle, User, BadgeCheck, Eye, Mail, TrendingUp, TrendingDown, Activity, Ban, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DuplicateGroup {
  groupKey: string;
  groupType: string;
  sharedValue: string;
  userCount: number;
  users: any[];
  riskLevel: 'high' | 'medium' | 'low';
  isResolved: boolean;
  hasVPN: boolean;
  hasProxy: boolean;
  hasSuspiciousActivity: boolean;
  avgRiskScore: number;
  matchingSignals?: string[];
  compositeScore?: number;
}

interface DuplicateStats {
  totalGroups: number;
  totalDuplicateUsers: number;
  highRiskGroups: number;
  mediumRiskGroups: number;
  lowRiskGroups: number;
  resolvedGroups: number;
}

export default function RiskControlPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<DuplicateGroup[]>([]);
  const [duplicateStats, setDuplicateStats] = useState<DuplicateStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; userId: string; userName: string } | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/duplicates');
      const data = await response.json();
      if (data.success) {
        setDuplicateGroups(data.duplicateGroups);
        setFilteredGroups(data.duplicateGroups);
        setDuplicateStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredGroups(duplicateGroups);
    } else if (activeFilter === 'high') {
      setFilteredGroups(duplicateGroups.filter(g => g.riskLevel === 'high' && !g.isResolved));
    } else if (activeFilter === 'medium') {
      setFilteredGroups(duplicateGroups.filter(g => g.riskLevel === 'medium' && !g.isResolved));
    } else if (activeFilter === 'low') {
      setFilteredGroups(duplicateGroups.filter(g => g.riskLevel === 'low' && !g.isResolved));
    } else if (activeFilter === 'resolved') {
      setFilteredGroups(duplicateGroups.filter(g => g.isResolved));
    } else if (activeFilter === 'contact') {
      setFilteredGroups(duplicateGroups.filter(g => g.groupType === 'Contact Details'));
    } else if (activeFilter === 'ip') {
      setFilteredGroups(duplicateGroups.filter(g => g.groupType.includes('IP')));
    } else if (activeFilter === 'fingerprint') {
      setFilteredGroups(duplicateGroups.filter(g => g.groupType.includes('Fingerprint')));
    }
  }, [activeFilter, duplicateGroups]);

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    setExpandedGroups(new Set(filteredGroups.map(g => g.groupKey)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleSuspendUser = async () => {
    if (!suspendModal || !suspensionReason.trim()) {
      alert('Please provide a suspension reason');
      return;
    }

    setSuspending(true);
    try {
      const response = await fetch('/api/users/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: suspendModal.userId,
          suspensionReason: suspensionReason.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuspendModal(null);
        setSuspensionReason('');
        // Refresh the duplicate groups to show updated suspension status
        fetchDuplicates();
      } else {
        alert(`Failed to suspend user: ${data.error}`);
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    } finally {
      setSuspending(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Risk Control Center
          </h1>
          <p className="text-gray-600 mt-2">Monitor and manage duplicate accounts, fraud detection, and security risks</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            Collapse All
          </button>
          <button
            onClick={fetchDuplicates}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Analysis
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-600 font-medium">Analyzing user accounts for risks and duplicates...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          {duplicateStats && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
              <button
                onClick={() => setActiveFilter('all')}
                className={`bg-white rounded-lg shadow-sm p-4 border-2 transition text-left hover:shadow-md ${
                  activeFilter === 'all' ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200'
                }`}
              >
                <div className="text-sm text-gray-600 mb-1">Total Groups</div>
                <div className="text-3xl font-bold text-gray-900">{duplicateStats.totalGroups}</div>
                <div className="text-xs text-gray-500 mt-1">{duplicateStats.totalDuplicateUsers} users affected</div>
              </button>

              <button
                onClick={() => setActiveFilter('high')}
                className={`bg-white rounded-lg shadow-sm p-4 border-2 transition text-left hover:shadow-md ${
                  activeFilter === 'high' ? 'border-red-600 ring-2 ring-red-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <div className="text-sm text-red-600 font-semibold">High Risk</div>
                </div>
                <div className="text-3xl font-bold text-red-600">{duplicateStats.highRiskGroups}</div>
                <div className="text-xs text-red-700 mt-1">Requires immediate attention</div>
              </button>

              <button
                onClick={() => setActiveFilter('medium')}
                className={`bg-white rounded-lg shadow-sm p-4 border-2 transition text-left hover:shadow-md ${
                  activeFilter === 'medium' ? 'border-orange-600 ring-2 ring-orange-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <div className="text-sm text-orange-600 font-semibold">Medium Risk</div>
                </div>
                <div className="text-3xl font-bold text-orange-600">{duplicateStats.mediumRiskGroups}</div>
                <div className="text-xs text-orange-700 mt-1">Monitor closely</div>
              </button>

              <button
                onClick={() => setActiveFilter('low')}
                className={`bg-white rounded-lg shadow-sm p-4 border-2 transition text-left hover:shadow-md ${
                  activeFilter === 'low' ? 'border-green-600 ring-2 ring-green-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div className="text-sm text-green-600 font-semibold">Low Risk</div>
                </div>
                <div className="text-3xl font-bold text-green-600">{duplicateStats.lowRiskGroups}</div>
                <div className="text-xs text-green-700 mt-1">Review when needed</div>
              </button>

              <button
                onClick={() => setActiveFilter('resolved')}
                className={`bg-white rounded-lg shadow-sm p-4 border-2 transition text-left hover:shadow-md ${
                  activeFilter === 'resolved' ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <div className="text-sm text-blue-600 font-semibold">Resolved</div>
                </div>
                <div className="text-3xl font-bold text-blue-600">{duplicateStats.resolvedGroups}</div>
                <div className="text-xs text-blue-700 mt-1">Action taken</div>
              </button>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm p-4 border-2 border-purple-200">
                <div className="text-sm text-purple-700 font-semibold mb-1">Active Risks</div>
                <div className="text-3xl font-bold text-purple-700">
                  {duplicateStats.highRiskGroups + duplicateStats.mediumRiskGroups + duplicateStats.lowRiskGroups}
                </div>
                <div className="text-xs text-purple-600 mt-1">Needs review</div>
              </div>
            </div>
          )}

          {/* Filter Tags */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Filter by type:</span>
            <button
              onClick={() => setActiveFilter('contact')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeFilter === 'contact'
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Contact Details
            </button>
            <button
              onClick={() => setActiveFilter('ip')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeFilter === 'ip'
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              IP Address
            </button>
            <button
              onClick={() => setActiveFilter('fingerprint')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeFilter === 'fingerprint'
                  ? 'bg-pink-100 text-pink-700 border-2 border-pink-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Device Fingerprint
            </button>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 transition"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Duplicate Groups */}
          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {activeFilter === 'all' ? 'No Duplicate Accounts Found' : 'No Matches for This Filter'}
              </h3>
              <p className="text-gray-600">
                {activeFilter === 'all'
                  ? 'All user accounts appear to be unique. Continue monitoring for suspicious activity.'
                  : 'Try adjusting your filter or view all groups.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.groupKey);

                return (
                  <div
                    key={group.groupKey}
                    className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all ${
                      group.isResolved
                        ? 'border-blue-300 opacity-75'
                        : group.riskLevel === 'high'
                        ? 'border-red-300'
                        : group.riskLevel === 'medium'
                        ? 'border-orange-300'
                        : 'border-green-300'
                    }`}
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.groupKey)}
                      className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                        group.isResolved
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : group.riskLevel === 'high'
                          ? 'bg-red-50 hover:bg-red-100'
                          : group.riskLevel === 'medium'
                          ? 'bg-orange-50 hover:bg-orange-100'
                          : 'bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Copy className={`w-6 h-6 ${
                          group.isResolved
                            ? 'text-blue-600'
                            : group.riskLevel === 'high'
                            ? 'text-red-600'
                            : group.riskLevel === 'medium'
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }`} />
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{group.groupType}</h3>
                            {group.isResolved ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-blue-200 text-blue-800">
                                RESOLVED
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                group.riskLevel === 'high'
                                  ? 'bg-red-200 text-red-800'
                                  : group.riskLevel === 'medium'
                                  ? 'bg-orange-200 text-orange-800'
                                  : 'bg-green-200 text-green-800'
                              }`}>
                                {group.riskLevel} Risk
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 font-mono">{group.sharedValue}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700">
                              {group.users.length} accounts detected
                            </span>
                            {group.compositeScore && (
                              <>
                                <span className="text-sm text-gray-600">•</span>
                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                  group.compositeScore >= 400 ? 'bg-red-200 text-red-800' :
                                  group.compositeScore >= 250 ? 'bg-orange-200 text-orange-800' :
                                  'bg-yellow-200 text-yellow-800'
                                }`}>
                                  Composite Score: {group.compositeScore}
                                </span>
                              </>
                            )}
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm text-gray-600">
                              Avg Risk: <span className="font-semibold">{group.avgRiskScore}/100</span>
                            </span>
                            {group.matchingSignals && group.matchingSignals.length > 0 && (
                              <>
                                <span className="text-sm text-gray-600">•</span>
                                <span className="text-sm text-blue-700 font-semibold">
                                  {group.matchingSignals.length} signals matched
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {group.hasVPN && (
                          <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-bold rounded">
                            VPN
                          </span>
                        )}
                        {group.hasProxy && (
                          <span className="px-3 py-1 bg-purple-200 text-purple-800 text-xs font-bold rounded">
                            PROXY
                          </span>
                        )}
                        {group.hasSuspiciousActivity && (
                          <span className="px-3 py-1 bg-red-200 text-red-800 text-xs font-bold rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            SUSPICIOUS
                          </span>
                        )}
                        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          {isExpanded ? <TrendingDown className="w-5 h-5 text-gray-600" /> : <TrendingUp className="w-5 h-5 text-gray-600" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded User Details */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t-2 border-gray-100">
                        <div className="space-y-2">
                          {group.users.map((user: any) => (
                            <div
                              key={user._id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  {/* User Basic Info */}
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-gray-900 text-base">{user.fullName}</span>
                                      {user.isEmailVerified && (
                                        <BadgeCheck className="w-4 h-4 text-blue-600" />
                                      )}
                                      {user.isSuspended && (
                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                          SUSPENDED
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                                    <Mail className="w-3 h-3" />
                                    <span>{user.email}</span>
                                  </div>

                                  <div className="text-xs text-gray-500 mb-2">
                                    Created: {new Date(user.createdAt).toLocaleString()}
                                  </div>

                                  {/* Detection Details */}
                                  <div className="border-t border-gray-200 pt-2">
                                    {/* Matching Signals */}
                                    {group.matchingSignals && group.matchingSignals.length > 0 && (
                                      <div className="mb-2">
                                        <div className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">
                                          Matched Signals ({group.matchingSignals.length}):
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {group.matchingSignals.map((signal) => (
                                            <span
                                              key={signal}
                                              className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold border border-blue-300"
                                            >
                                              ✓ {signal}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <div className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">All Detection Indicators:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                      {user.contactDetails?.value && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                                            Contact: {user.contactDetails.value}
                                          </span>
                                        </div>
                                      )}
                                      {user.deviceDetails?.signupIP && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                                            Signup IP: {user.deviceDetails.signupIP}
                                          </span>
                                          {user.deviceDetails.signupCountry && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                              {user.deviceDetails.signupCountry}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {user.deviceDetails?.lastActiveIP && user.deviceDetails.lastActiveIP !== user.deviceDetails?.signupIP && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-semibold">
                                            Last IP: {user.deviceDetails.lastActiveIP}
                                          </span>
                                          {user.deviceDetails.lastActiveCountry && (
                                            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
                                              {user.deviceDetails.lastActiveCountry}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {user.deviceDetails?.signupDeviceFingerprint && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-mono">
                                            Device: {user.deviceDetails.signupDeviceFingerprint.substring(0, 12)}...
                                          </span>
                                        </div>
                                      )}
                                      {user.deviceDetails?.signupCanvasFingerprint && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-mono">
                                            Canvas: {user.deviceDetails.signupCanvasFingerprint.substring(0, 12)}...
                                          </span>
                                        </div>
                                      )}
                                      {user.deviceDetails?.signupWebGLFingerprint && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs bg-lime-100 text-lime-700 px-1.5 py-0.5 rounded font-mono">
                                            WebGL: {user.deviceDetails.signupWebGLFingerprint.substring(0, 12)}...
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Risk & Activity Stats */}
                                    {user.deviceDetails && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {user.deviceDetails.signupRiskScore > 0 && (
                                          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                                            user.deviceDetails.signupRiskScore > 70
                                              ? 'bg-red-200 text-red-800'
                                              : user.deviceDetails.signupRiskScore > 40
                                              ? 'bg-orange-200 text-orange-800'
                                              : 'bg-green-200 text-green-800'
                                          }`}>
                                            Risk: {user.deviceDetails.signupRiskScore}/100
                                          </span>
                                        )}
                                        {user.deviceDetails.loginCount > 0 && (
                                          <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                                            {user.deviceDetails.loginCount} logins
                                          </span>
                                        )}
                                        {user.deviceDetails.signupIsVPN && (
                                          <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-bold">
                                            VPN Detected
                                          </span>
                                        )}
                                        {user.deviceDetails.signupIsProxy && (
                                          <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                                            Proxy Detected
                                          </span>
                                        )}
                                        {user.deviceDetails.lastLoginAt && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                            Last login: {new Date(user.deviceDetails.lastLoginAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => router.push(`/users/${user._id}`)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold whitespace-nowrap"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </button>
                                  {!user.isSuspended && (
                                    <button
                                      onClick={() => setSuspendModal({ open: true, userId: user._id, userName: user.fullName })}
                                      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold whitespace-nowrap"
                                    >
                                      <Ban className="w-4 h-4" />
                                      Suspend User
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Suspend User Modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Ban className="w-6 h-6 text-red-600" />
                Suspend User
              </h3>
              <button
                onClick={() => {
                  setSuspendModal(null);
                  setSuspensionReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                You are about to suspend <span className="font-bold">{suspendModal.userName}</span>
              </p>
              <p className="text-sm text-red-600 mb-4">
                This will prevent the user from accessing their account.
              </p>

              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Suspension Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter the reason for suspension..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
                disabled={suspending}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSuspendModal(null);
                  setSuspensionReason('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                disabled={suspending}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendUser}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={suspending || !suspensionReason.trim()}
              >
                {suspending ? 'Suspending...' : 'Suspend User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
