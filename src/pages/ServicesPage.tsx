import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { ServiceCenter, Service } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  GraduationCap,
  Landmark,
  HeartPulse,
  MapPin,
  Clock,
  Users,
  Ticket,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface ServicesPageProps {
  navigate: (path: string) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ navigate }) => {
  const { user, isAuthenticated } = useAuth();
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // 3-Step Selection
  const [selectedGenre, setSelectedGenre] = useState<string>('Schooling / College');
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);

  // Instant Token Issuance State
  const [issuingTokenForServiceId, setIssuingTokenForServiceId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingTokenId, setExistingTokenId] = useState<number | null>(null);

  const fetchCenters = async () => {
    try {
      const res = await api.get<{ centers: ServiceCenter[] }>('/centers');
      const allCenters = res.centers || [];
      setCenters(allCenters);

      // Default select the first center in the current genre
      const initialMatches = allCenters.filter(
        (c) => c.category.toLowerCase().includes('school') || c.category.toLowerCase().includes('college')
      );
      if (initialMatches.length > 0 && !selectedCenterId) {
        setSelectedCenterId(initialMatches[0].id);
      }
    } catch (e) {
      console.error('Failed to load centers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  const genres = [
    {
      id: 'Schooling / College',
      title: 'Schooling / College',
      subtitle: 'GVP, GITAM, AU, Raghu Engineering College',
      icon: GraduationCap,
      color: 'bg-blue-600 text-white',
      badge: 'Colleges',
    },
    {
      id: 'Banking',
      title: 'Banking & Financial',
      subtitle: 'SBI, HDFC Bank, Union Bank of India',
      icon: Landmark,
      color: 'bg-emerald-600 text-white',
      badge: 'Banks',
    },
    {
      id: 'Medical Clinic / Hospital',
      title: 'Medical Clinic / Hospital',
      subtitle: 'Apollo Clinic, Care Hospital, KIMS Medical',
      icon: HeartPulse,
      color: 'bg-rose-600 text-white',
      badge: 'Clinics',
    },
  ];

  // Filter centers matching active genre
  const genreCenters = centers.filter((c) => {
    const cat = c.category.toLowerCase();
    if (selectedGenre === 'Schooling / College') {
      return cat.includes('school') || cat.includes('college');
    }
    if (selectedGenre === 'Banking') {
      return cat.includes('bank');
    }
    if (selectedGenre === 'Medical Clinic / Hospital') {
      return cat.includes('medical') || cat.includes('hospital') || cat.includes('clinic');
    }
    return true;
  });

  const currentCenter = centers.find((c) => c.id === selectedCenterId) || (genreCenters.length > 0 ? genreCenters[0] : null);

  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId);
    setErrorMessage(null);
    const firstMatch = centers.find((c) => {
      const cat = c.category.toLowerCase();
      if (genreId === 'Schooling / College') return cat.includes('school') || cat.includes('college');
      if (genreId === 'Banking') return cat.includes('bank');
      if (genreId === 'Medical Clinic / Hospital') return cat.includes('medical') || cat.includes('hospital') || cat.includes('clinic');
      return true;
    });
    if (firstMatch) {
      setSelectedCenterId(firstMatch.id);
    }
  };

  // Instant Token Generator for selected purpose
  const handleGenerateTokenForService = async (service: Service) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIssuingTokenForServiceId(service.id);
    setErrorMessage(null);
    setExistingTokenId(null);

    try {
      const res = await api.post<{ token: { id: number; token_number: string } }>('/queue/join', {
        service_id: service.id,
        customer_name: user?.name,
        customer_email: user?.email,
        notes: `Requested for ${service.name}`,
        verification_method: 'Verified Customer',
      });

      // Navigate directly to live token status screen!
      navigate(`/queue/${res.token.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to issue token.');
      if (err.data?.activeTokenId) {
        setExistingTokenId(err.data.activeTokenId);
      }
    } finally {
      setIssuingTokenForServiceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-fit">
              <Ticket className="w-3.5 h-3.5" />
              CUSTOMER PORTAL
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Select Genre, Location & Purpose to Generate Token
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome, <strong className="text-slate-800">{user?.name || 'Customer'}</strong> · Follow the 3 steps below
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              My Active Passes →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Error message banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            {existingTokenId && (
              <button
                onClick={() => navigate(`/queue/${existingTokenId}`)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 text-xs shrink-0"
              >
                Track Active Token →
              </button>
            )}
          </div>
        )}

        {/* STEP 1: CHOOSE GENRE */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs font-bold">
              1
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Genre (Schooling / Banking / Medical Clinic)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {genres.map((g) => {
              const Icon = g.icon;
              const isSelected = selectedGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGenreChange(g.id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-2xs ${
                        isSelected ? g.color : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{g.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{g.subtitle}</div>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: CHOOSE LOCATION */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs font-bold">
              2
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Available Location (Colleges / Banks / Hospitals in city)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {genreCenters.map((center) => {
              const isSelected = currentCenter?.id === center.id;
              return (
                <button
                  key={center.id}
                  type="button"
                  onClick={() => {
                    setSelectedCenterId(center.id);
                    setErrorMessage(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-600 ring-1 ring-blue-500 text-slate-900 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                        {center.code}
                      </span>
                      <span className="text-[11px] font-mono text-blue-700 font-semibold">
                        {center.total_waiting} waiting
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1 leading-snug">{center.name}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{center.address}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                    <span>{center.services?.length || 0} Available Purposes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 3: CHOOSE PURPOSE & GENERATE TOKEN */}
        {currentCenter && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs font-bold">
                  3
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Choose Your Purpose at {currentCenter.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click <strong>"Generate Token"</strong> below on your required use (Fee Payment, Certificates, Doctor Consultation, Cashier, etc.)
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
                LOCATION: {currentCenter.code}
              </span>
            </div>

            {/* Purpose Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCenter.services?.map((service) => (
                <div
                  key={service.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {service.prefix}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        ~{service.avg_service_time_mins} min / token
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-1 leading-snug">
                      {service.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {service.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Currently Serving:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {service.currently_serving || 'None'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Waiting in Line:</span>
                      <span className="font-mono font-bold text-blue-700">
                        {service.waiting_count} people
                      </span>
                    </div>

                    <button
                      onClick={() => handleGenerateTokenForService(service)}
                      disabled={issuingTokenForServiceId === service.id}
                      className="w-full py-2.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>{issuingTokenForServiceId === service.id ? 'Issuing Token...' : 'Generate Token'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
