import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface DuplicateGroup {
  groupKey: string;
  groupType: string;
  sharedValue: string;
  userCount: number;
  users: any[];
  riskLevel: 'high' | 'medium' | 'low';
  hasVPN: boolean;
  hasProxy: boolean;
  hasSuspiciousActivity: boolean;
  avgRiskScore: number;
  matchingSignals: string[];
  compositeScore: number;
}

interface UserMatchProfile {
  userId: string;
  user: any;
  deviceDetails: any;
  signals: {
    contactValue?: string;
    signupIP?: string;
    lastActiveIP?: string;
    signupDeviceFP?: string;
    lastActiveDeviceFP?: string;
    signupCanvasFP?: string;
    lastActiveCanvasFP?: string;
    signupWebGLFP?: string;
    lastActiveWebGLFP?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Fetch users and device details in parallel for performance
    const [usersResult, deviceDetailsResult] = await Promise.all([
      supabase
        .from('users')
        .select('_id, "fullName", email, "isEmailVerified", "isSuspended", "createdAt", "contactDetails"')
        .order('createdAt', { ascending: false }),
      supabase
        .from('user_device_details')
        .select('*')
    ]);

    if (usersResult.error) throw usersResult.error;
    if (deviceDetailsResult.error) throw deviceDetailsResult.error;

    // Create a map for faster lookups
    const deviceDetailsMap = new Map<string, any[]>();
    deviceDetailsResult.data?.forEach((detail: any) => {
      if (!deviceDetailsMap.has(detail.userId)) {
        deviceDetailsMap.set(detail.userId, []);
      }
      deviceDetailsMap.get(detail.userId)!.push(detail);
    });

    // Join users with their device details
    const usersWithDevices = usersResult.data?.map((user: any) => ({
      ...user,
      user_device_details: deviceDetailsMap.get(user._id) || [],
    }));

    // ==========================================
    // PRODUCTION-GRADE DUPLICATE DETECTION ENGINE
    // ==========================================

    // Weight system for different signals (higher = more important for duplicate detection)
    const SIGNAL_WEIGHTS = {
      contactValue: 100,        // Same contact = almost certain duplicate
      lastActiveDeviceFP: 90,   // Same current device fingerprint = very strong
      lastActiveCanvasFP: 85,   // Same current canvas = very strong
      lastActiveWebGLFP: 85,    // Same current WebGL = very strong
      lastActiveIP: 70,         // Same current IP = strong indicator
      signupDeviceFP: 60,       // Same signup device = moderate
      signupCanvasFP: 55,       // Same signup canvas = moderate
      signupWebGLFP: 55,        // Same signup WebGL = moderate
      signupIP: 40,             // Same signup IP = weak (could be shared network)
    };

    // Risk multipliers
    const RISK_MULTIPLIERS = {
      suspiciousActivity: 1.5,
      hasVPN: 1.3,
      hasProxy: 1.4,
      hasMultipleDevices: 1.2,
      deviceSwitch: 1.25,
      ipSwitch: 1.15,
    };

    // Build user match profiles
    const userProfiles: UserMatchProfile[] = usersWithDevices?.map((user: any) => {
      const deviceDetails = user.user_device_details?.[0];
      return {
        userId: user._id,
        user,
        deviceDetails,
        signals: {
          contactValue: user.contactDetails?.value,
          signupIP: deviceDetails?.signupIP,
          lastActiveIP: deviceDetails?.lastActiveIP,
          signupDeviceFP: deviceDetails?.signupDeviceFingerprint,
          lastActiveDeviceFP: deviceDetails?.lastActiveDeviceFingerprint,
          signupCanvasFP: deviceDetails?.signupCanvasFingerprint,
          lastActiveCanvasFP: deviceDetails?.lastActiveCanvasFingerprint,
          signupWebGLFP: deviceDetails?.signupWebGLFingerprint,
          lastActiveWebGLFP: deviceDetails?.lastActiveWebGLFingerprint,
        },
      };
    }) || [];

    // Compare every user with every other user to find matches
    const duplicateGroups: Map<string, any> = new Map();
    const processedPairs = new Set<string>();

    for (let i = 0; i < userProfiles.length; i++) {
      for (let j = i + 1; j < userProfiles.length; j++) {
        const profile1 = userProfiles[i];
        const profile2 = userProfiles[j];

        const pairKey = [profile1.userId, profile2.userId].sort().join('_');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Calculate matching signals and composite score
        const matchingSignals: string[] = [];
        let compositeScore = 0;

        // Check each signal
        if (profile1.signals.contactValue && profile1.signals.contactValue === profile2.signals.contactValue) {
          matchingSignals.push('Contact Details');
          compositeScore += SIGNAL_WEIGHTS.contactValue;
        }

        if (profile1.signals.lastActiveIP && profile1.signals.lastActiveIP === profile2.signals.lastActiveIP) {
          matchingSignals.push('Last Active IP');
          compositeScore += SIGNAL_WEIGHTS.lastActiveIP;
        }

        if (profile1.signals.lastActiveDeviceFP && profile1.signals.lastActiveDeviceFP === profile2.signals.lastActiveDeviceFP) {
          matchingSignals.push('Last Active Device Fingerprint');
          compositeScore += SIGNAL_WEIGHTS.lastActiveDeviceFP;
        }

        if (profile1.signals.lastActiveCanvasFP && profile1.signals.lastActiveCanvasFP === profile2.signals.lastActiveCanvasFP) {
          matchingSignals.push('Last Active Canvas Fingerprint');
          compositeScore += SIGNAL_WEIGHTS.lastActiveCanvasFP;
        }

        if (profile1.signals.lastActiveWebGLFP && profile1.signals.lastActiveWebGLFP === profile2.signals.lastActiveWebGLFP) {
          matchingSignals.push('Last Active WebGL Fingerprint');
          compositeScore += SIGNAL_WEIGHTS.lastActiveWebGLFP;
        }

        if (profile1.signals.signupIP && profile1.signals.signupIP === profile2.signals.signupIP) {
          matchingSignals.push('Signup IP');
          compositeScore += SIGNAL_WEIGHTS.signupIP;
        }

        if (profile1.signals.signupDeviceFP && profile1.signals.signupDeviceFP === profile2.signals.signupDeviceFP) {
          matchingSignals.push('Signup Device Fingerprint');
          compositeScore += SIGNAL_WEIGHTS.signupDeviceFP;
        }

        if (profile1.signals.signupCanvasFP && profile1.signals.signupCanvasFP === profile2.signals.signupCanvasFP) {
          matchingSignals.push('Signup Canvas Fingerprint');
          compositeScore += SIGNAL_WEIGHTS.signupCanvasFP;
        }

        if (profile1.signals.signupWebGLFP && profile1.signals.signupWebGLFP === profile2.signals.signupWebGLFP) {
          matchingSignals.push('Signup WebGL Fingerprint');
          compositeScore += SIGNAL_WEIGHTS.signupWebGLFP;
        }

        // Apply risk multipliers
        if (profile1.deviceDetails?.suspiciousActivity || profile2.deviceDetails?.suspiciousActivity) {
          compositeScore *= RISK_MULTIPLIERS.suspiciousActivity;
        }
        if (profile1.deviceDetails?.signupIsVPN || profile2.deviceDetails?.signupIsVPN ||
            profile1.deviceDetails?.lastActiveIsVPN || profile2.deviceDetails?.lastActiveIsVPN) {
          compositeScore *= RISK_MULTIPLIERS.hasVPN;
        }
        if (profile1.deviceDetails?.signupIsProxy || profile2.deviceDetails?.signupIsProxy ||
            profile1.deviceDetails?.lastActiveIsProxy || profile2.deviceDetails?.lastActiveIsProxy) {
          compositeScore *= RISK_MULTIPLIERS.hasProxy;
        }
        if (profile1.deviceDetails?.hasMultipleDevices || profile2.deviceDetails?.hasMultipleDevices) {
          compositeScore *= RISK_MULTIPLIERS.hasMultipleDevices;
        }
        if (profile1.deviceDetails?.deviceSwitchCount > 0 || profile2.deviceDetails?.deviceSwitchCount > 0) {
          compositeScore *= RISK_MULTIPLIERS.deviceSwitch;
        }
        if (profile1.deviceDetails?.ipSwitchCount > 0 || profile2.deviceDetails?.ipSwitchCount > 0) {
          compositeScore *= RISK_MULTIPLIERS.ipSwitch;
        }

        // Threshold: require at least 1 matching signal and composite score > 40
        if (matchingSignals.length > 0 && compositeScore >= 40) {
          // Build group key from ACTUAL shared values, not just signal names
          const sharedValueParts: string[] = [];

          if (profile1.signals.contactValue && profile1.signals.contactValue === profile2.signals.contactValue) {
            sharedValueParts.push(`contact_${profile1.signals.contactValue}`);
          }
          if (profile1.signals.lastActiveIP && profile1.signals.lastActiveIP === profile2.signals.lastActiveIP) {
            sharedValueParts.push(`lastIP_${profile1.signals.lastActiveIP}`);
          }
          if (profile1.signals.lastActiveDeviceFP && profile1.signals.lastActiveDeviceFP === profile2.signals.lastActiveDeviceFP) {
            sharedValueParts.push(`lastDeviceFP_${profile1.signals.lastActiveDeviceFP}`);
          }
          if (profile1.signals.lastActiveCanvasFP && profile1.signals.lastActiveCanvasFP === profile2.signals.lastActiveCanvasFP) {
            sharedValueParts.push(`lastCanvasFP_${profile1.signals.lastActiveCanvasFP}`);
          }
          if (profile1.signals.lastActiveWebGLFP && profile1.signals.lastActiveWebGLFP === profile2.signals.lastActiveWebGLFP) {
            sharedValueParts.push(`lastWebGLFP_${profile1.signals.lastActiveWebGLFP}`);
          }
          if (profile1.signals.signupIP && profile1.signals.signupIP === profile2.signals.signupIP) {
            sharedValueParts.push(`signupIP_${profile1.signals.signupIP}`);
          }
          if (profile1.signals.signupDeviceFP && profile1.signals.signupDeviceFP === profile2.signals.signupDeviceFP) {
            sharedValueParts.push(`signupDeviceFP_${profile1.signals.signupDeviceFP}`);
          }
          if (profile1.signals.signupCanvasFP && profile1.signals.signupCanvasFP === profile2.signals.signupCanvasFP) {
            sharedValueParts.push(`signupCanvasFP_${profile1.signals.signupCanvasFP}`);
          }
          if (profile1.signals.signupWebGLFP && profile1.signals.signupWebGLFP === profile2.signals.signupWebGLFP) {
            sharedValueParts.push(`signupWebGLFP_${profile1.signals.signupWebGLFP}`);
          }

          // Create unique group key based on actual shared values
          const groupKey = sharedValueParts.sort().join('__');

          if (!duplicateGroups.has(groupKey)) {
            // Determine group type and display value based on highest priority signal
            let groupType = 'Multi-Signal Match';
            let displayValue = matchingSignals.join(' + ');

            // Priority: Contact > Last Active IP > Last Active Fingerprints > Signup IP > Signup Fingerprints
            if (matchingSignals.includes('Contact Details')) {
              groupType = 'Contact Details';
              displayValue = profile1.signals.contactValue || '';
            } else if (matchingSignals.includes('Last Active IP')) {
              groupType = 'Last Active IP';
              displayValue = profile1.signals.lastActiveIP || '';
            } else if (matchingSignals.includes('Last Active Device Fingerprint') ||
                       matchingSignals.includes('Last Active Canvas Fingerprint') ||
                       matchingSignals.includes('Last Active WebGL Fingerprint')) {
              groupType = 'Last Active Device Fingerprint';
              if (profile1.signals.lastActiveDeviceFP) {
                displayValue = `Device: ${profile1.signals.lastActiveDeviceFP.substring(0, 12)}...`;
              } else if (profile1.signals.lastActiveCanvasFP) {
                displayValue = `Canvas: ${profile1.signals.lastActiveCanvasFP.substring(0, 12)}...`;
              } else if (profile1.signals.lastActiveWebGLFP) {
                displayValue = `WebGL: ${profile1.signals.lastActiveWebGLFP.substring(0, 12)}...`;
              }
            } else if (matchingSignals.includes('Signup IP')) {
              groupType = 'Signup IP';
              displayValue = profile1.signals.signupIP || '';
            } else if (matchingSignals.includes('Signup Device Fingerprint') ||
                       matchingSignals.includes('Signup Canvas Fingerprint') ||
                       matchingSignals.includes('Signup WebGL Fingerprint')) {
              groupType = 'Signup Device Fingerprint';
              if (profile1.signals.signupDeviceFP) {
                displayValue = `Device: ${profile1.signals.signupDeviceFP.substring(0, 12)}...`;
              } else if (profile1.signals.signupCanvasFP) {
                displayValue = `Canvas: ${profile1.signals.signupCanvasFP.substring(0, 12)}...`;
              } else if (profile1.signals.signupWebGLFP) {
                displayValue = `WebGL: ${profile1.signals.signupWebGLFP.substring(0, 12)}...`;
              }
            }

            duplicateGroups.set(groupKey, {
              groupKey,
              groupType,
              sharedValue: displayValue,
              users: [],
              matchingSignals,
              compositeScore: Math.round(compositeScore),
              riskLevel: 'low',
              hasVPN: false,
              hasProxy: false,
              hasSuspiciousActivity: false,
              avgRiskScore: 0,
            });
          }

          const group = duplicateGroups.get(groupKey);

          // Add users if not already in group
          if (!group.users.find((u: any) => u._id === profile1.user._id)) {
            group.users.push({
              ...profile1.user,
              deviceDetails: profile1.deviceDetails || null,
            });
          }
          if (!group.users.find((u: any) => u._id === profile2.user._id)) {
            group.users.push({
              ...profile2.user,
              deviceDetails: profile2.deviceDetails || null,
            });
          }

          // Update risk indicators
          group.hasVPN = group.hasVPN ||
            profile1.deviceDetails?.signupIsVPN || profile1.deviceDetails?.lastActiveIsVPN ||
            profile2.deviceDetails?.signupIsVPN || profile2.deviceDetails?.lastActiveIsVPN;

          group.hasProxy = group.hasProxy ||
            profile1.deviceDetails?.signupIsProxy || profile1.deviceDetails?.lastActiveIsProxy ||
            profile2.deviceDetails?.signupIsProxy || profile2.deviceDetails?.lastActiveIsProxy;

          group.hasSuspiciousActivity = group.hasSuspiciousActivity ||
            profile1.deviceDetails?.suspiciousActivity || profile2.deviceDetails?.suspiciousActivity;
        }
      }
    }

    // Filter groups with 2 or more users (actual duplicates)
    const duplicates = Array.from(duplicateGroups.values())
      .filter((group) => group.users.length >= 2)
      .map((group) => {
        // Calculate average risk score from device details
        const totalRiskScore = group.users.reduce((sum: number, u: any) => {
          const maxRisk = Math.max(
            u.deviceDetails?.signupRiskScore || 0,
            u.deviceDetails?.lastActiveRiskScore || 0
          );
          return sum + maxRisk;
        }, 0);
        group.avgRiskScore = Math.round(totalRiskScore / group.users.length);

        // Determine risk level using composite score and other factors
        const scoreThresholds = {
          critical: 400,  // Multiple strong signals + risk multipliers
          high: 250,      // Strong signals or multiple moderate signals
          medium: 100,    // Moderate signals
        };

        if (
          group.compositeScore >= scoreThresholds.critical ||
          (group.compositeScore >= scoreThresholds.high && group.hasSuspiciousActivity) ||
          (group.matchingSignals.includes('Contact Details') && group.matchingSignals.length >= 2) ||
          (group.matchingSignals.includes('Last Active Device Fingerprint') &&
           group.matchingSignals.includes('Last Active Canvas Fingerprint') &&
           group.matchingSignals.includes('Last Active WebGL Fingerprint'))
        ) {
          group.riskLevel = 'high';
        } else if (
          group.compositeScore >= scoreThresholds.medium ||
          group.matchingSignals.length >= 3 ||
          group.hasVPN ||
          group.hasProxy ||
          group.avgRiskScore > 40
        ) {
          group.riskLevel = 'medium';
        } else {
          group.riskLevel = 'low';
        }

        return group;
      })
      .sort((a, b) => {
        // Sort by risk level first, then by composite score, then by user count
        const riskOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
        const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        if (riskDiff !== 0) return riskDiff;

        const scoreDiff = b.compositeScore - a.compositeScore;
        if (scoreDiff !== 0) return scoreDiff;

        return b.users.length - a.users.length;
      });

    // Calculate stats
    const uniqueUserIds = new Set<string>();
    duplicates.forEach((group) => {
      group.users.forEach((user: any) => {
        uniqueUserIds.add(user._id);
      });
    });

    const stats = {
      totalGroups: duplicates.length,
      totalDuplicateUsers: uniqueUserIds.size,
      highRiskGroups: duplicates.filter((g) => g.riskLevel === 'high').length,
      mediumRiskGroups: duplicates.filter((g) => g.riskLevel === 'medium').length,
      lowRiskGroups: duplicates.filter((g) => g.riskLevel === 'low').length,
    };

    return NextResponse.json({
      success: true,
      duplicateGroups: duplicates,
      stats,
    });
  } catch (error) {
    console.error('Error detecting duplicates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect duplicate accounts' },
      { status: 500 }
    );
  }
}
