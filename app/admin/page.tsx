'use client';

import { useEffect, useState, startTransition } from 'react';
import { getAdminStats } from '@/actions/getAdminStats';
import { createClient } from '@/utils/supabase/client';
import { 
  Users, Vote, Video, Globe, MessageSquare, ArrowLeft, 
  TrendingUp, RefreshCw, AlertCircle, ShieldCheck, Activity, Award
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalUniqueVisitors: number;
  votingUniqueVisitors: number;
  adUniqueVisitors: number;
  totalVotes: number;
  totalAdRewards: number;
  totalComments: number;
  activeMemberAccounts: number;
  countryVotes: { code: string; count: number }[];
  topArtists: { name: string; total_votes: number }[];
  recentActivities: {
    type: 'VOTE' | 'AD_REWARD';
    time: string;
    country: string;
    target: string;
    userType: string;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. Check Auth State
  useEffect(() => {
    const supabase = createClient();
    
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setAuthLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  // 2. Fetch Stats
  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminStats();
      if (response.success && response.stats) {
        setStats(response.stats as any);
      } else {
        setError(response.error || '접근 권한이 없거나 불러오기에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadStats();
    }
  }, [authLoading]);

  // Loading Screen
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 font-sans">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-[#37C561]/20 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#37C561] animate-spin"></div>
        </div>
        <p className="text-[#37C561] font-mono tracking-widest text-sm animate-pulse">
          CONNECTING TO STAN.DOM CORE...
        </p>
      </div>
    );
  }

  // Error / Unauthorized Screen
  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-950/80 border border-red-500/30 rounded-2xl p-8 text-center backdrop-blur-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-mono tracking-wider mb-2">ACCESS RESTRICTED</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            {error === 'UNAUTHORIZED' 
              ? '이 페이지는 관리자 전용 공간입니다. 관리자 권한이 있는 이메일로 로그인해 주세요.'
              : error}
          </p>
          <div className="flex flex-col gap-3">
            <Link 
              href="/login" 
              className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl font-semibold transition-all duration-300 text-sm"
            >
              관리자 계정으로 로그인
            </Link>
            <Link 
              href="/" 
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl font-semibold transition-all duration-300 text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> 홈으로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans selection:bg-[#37C561]/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#37C561]/10 text-[#37C561] text-xs font-mono rounded-full border border-[#37C561]/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> SECURE CONTROL NODE
              </span>
            </div>
            <h1 className="text-3xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              STAN.DOM ADMIN PANEL
            </h1>
            <p className="text-zinc-500 text-xs font-mono">
              Signed in as: <span className="text-zinc-300">{user?.email}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => startTransition(() => { loadStats(); })}
              className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-mono transition-all duration-300 flex items-center gap-2 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" /> REFRESH METRICS
            </button>
            <Link 
              href="/" 
              className="px-4 py-2.5 bg-[#37C561] hover:bg-[#2fb053] text-black font-semibold rounded-xl text-xs transition-all duration-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> BACK TO GRID
            </Link>
          </div>
        </div>

        {/* Top KPIs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Unique Visitors */}
          <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#37C561]/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#37C561]/2 rounded-full blur-2xl group-hover:bg-[#37C561]/5 transition-all duration-300"></div>
            <div className="flex items-center justify-between text-zinc-500 mb-3">
              <span className="text-xs font-mono tracking-wider">TOTAL ACTIVE UV</span>
              <Users className="w-5 h-5 text-[#37C561]" />
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-wider">
              {stats?.totalUniqueVisitors} <span className="text-xs font-normal text-zinc-500">IPs</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-2">
              Combined visitors from all devices
            </div>
          </div>

          {/* Card 2: Total Votes */}
          <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#37C561]/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/2 rounded-full blur-2xl group-hover:bg-blue-500/5 transition-all duration-300"></div>
            <div className="flex items-center justify-between text-zinc-500 mb-3">
              <span className="text-xs font-mono tracking-wider">TOTAL VOTES CAST</span>
              <Vote className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-wider">
              {stats?.totalVotes} <span className="text-xs font-normal text-zinc-500">Votes</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-2">
              Voter Conversion Rate: <span className="text-blue-400">
                {stats?.totalUniqueVisitors ? Math.round((stats.votingUniqueVisitors / stats.totalUniqueVisitors) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Card 3: Ad Rewards */}
          <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#37C561]/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/2 rounded-full blur-2xl group-hover:bg-purple-500/5 transition-all duration-300"></div>
            <div className="flex items-center justify-between text-zinc-500 mb-3">
              <span className="text-xs font-mono tracking-wider">AD REWARD CLAIMS</span>
              <Video className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-wider">
              {stats?.totalAdRewards} <span className="text-xs font-normal text-zinc-500">Ads</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-2">
              Earned: <span className="text-purple-400">+{(stats?.totalAdRewards || 0) * 3}V</span> voltage points
            </div>
          </div>

          {/* Card 4: Comments */}
          <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#37C561]/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/2 rounded-full blur-2xl group-hover:bg-yellow-500/5 transition-all duration-300"></div>
            <div className="flex items-center justify-between text-zinc-500 mb-3">
              <span className="text-xs font-mono tracking-wider">TOTAL COMMENTS</span>
              <MessageSquare className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-wider">
              {stats?.totalComments} <span className="text-xs font-normal text-zinc-500">Posts</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-2">
              Registered Accounts: <span className="text-yellow-400">{stats?.activeMemberAccounts} accounts</span>
            </div>
          </div>

        </div>

        {/* Detailed Stats Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Col 1 & 2: Country Distribution & Recent Activities */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Country Distribution Table */}
            <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-[#37C561]" />
                <h3 className="text-lg font-bold font-mono tracking-wider">GLOBAL AUDIENCE DENSITY</h3>
              </div>
              
              <div className="space-y-4">
                {stats?.countryVotes.slice(0, 6).map((country, idx) => {
                  const maxVotes = stats?.countryVotes[0]?.count || 1;
                  const percentage = Math.round((country.count / maxVotes) * 100);
                  
                  return (
                    <div key={country.code} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 w-4">{idx + 1}</span>
                          <span className="text-zinc-300 font-bold">{country.code}</span>
                        </div>
                        <span className="text-[#37C561] font-bold">{country.count} votes</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#37C561] to-[#2fb053] rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}

                {(!stats?.countryVotes || stats.countryVotes.length === 0) && (
                  <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                    No country data found.
                  </div>
                )}
              </div>
            </div>

            {/* Live Activities Stream */}
            <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#37C561]" />
                  <h3 className="text-lg font-bold font-mono tracking-wider">LIVE NODE ACTIVITY</h3>
                </div>
                <span className="text-[10px] font-mono text-[#37C561] bg-[#37C561]/10 px-2 py-0.5 rounded border border-[#37C561]/20 animate-pulse">
                  REAL-TIME
                </span>
              </div>
              
              <div className="space-y-4">
                {stats?.recentActivities.map((activity, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-zinc-950/80 rounded-xl border border-zinc-900 hover:border-zinc-800 transition-all duration-300 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'VOTE' 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : 'bg-purple-500/10 text-purple-500'
                      }`}>
                        {activity.type === 'VOTE' ? <Vote className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      </div>
                      
                      <div>
                        <p className="text-zinc-200">
                          {activity.type === 'VOTE' ? (
                            <>
                              <span className="text-blue-400 font-bold">{activity.userType}</span>가{' '}
                              <span className="text-white font-bold">{activity.target}</span>에게 투표했습니다.
                            </>
                          ) : (
                            <>
                              <span className="text-purple-400 font-bold">{activity.userType}</span>가 광고를 시청하여{' '}
                              <span className="text-white font-bold">{activity.target}</span>을 완료했습니다.
                            </>
                          )}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Country: {activity.country} • {new Date(activity.time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
                  <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                    No recent activities recorded.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Col 3: Leaderboard & Quick Actions */}
          <div className="space-y-6">
            
            {/* Top Leaders inside DB */}
            <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold font-mono tracking-wider">DATABASE LEADERBOARD</h3>
              </div>

              <div className="space-y-4">
                {stats?.topArtists.map((artist, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-zinc-950/80 border border-zinc-900 rounded-xl hover:border-yellow-500/20 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-mono font-bold ${
                        idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        idx === 1 ? 'bg-zinc-400/20 text-zinc-300 border border-zinc-400/30' :
                        idx === 2 ? 'bg-amber-600/20 text-amber-500 border border-amber-600/30' :
                        'bg-zinc-900 text-zinc-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-bold text-zinc-200 text-sm font-mono">{artist.name}</span>
                    </div>
                    <span className="text-zinc-400 font-mono text-xs">
                      <strong className="text-white font-bold">{artist.total_votes}</strong> votes
                    </span>
                  </div>
                ))}

                {(!stats?.topArtists || stats.topArtists.length === 0) && (
                  <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                    No artists found in database.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Portal */}
            <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[#37C561]" />
                <h3 className="text-lg font-bold font-mono tracking-wider">SYSTEM INFORMATION</h3>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-zinc-900">
                  <span className="text-zinc-500">NEXT.JS VERSION</span>
                  <span className="text-zinc-300">16.2.2</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-900">
                  <span className="text-zinc-500">SUPABASE ORM</span>
                  <span className="text-zinc-300">Active</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-900">
                  <span className="text-zinc-500">ENVIRONMENT</span>
                  <span className="text-[#37C561] font-bold">Production ready</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-zinc-500">AD PROVIDER API</span>
                  <span className="text-purple-400 font-bold">Google AdSense H5</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
