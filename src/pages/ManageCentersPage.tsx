import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api.ts';
import { ServiceCenter, Service } from '../types/index.ts';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  ArrowLeft,
  RefreshCw,
  Power,
  Layers
} from 'lucide-react';

interface ManageCentersPageProps {
  navigate: (path: string) => void;
}

export const ManageCentersPage: React.FC<ManageCentersPageProps> = ({ navigate }) => {
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [centerModalOpen, setCenterModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<ServiceCenter | null>(null);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedCenterForService, setSelectedCenterForService] = useState<ServiceCenter | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form states for Center
  const [centerForm, setCenterForm] = useState({
    name: '',
    code: '',
    category: 'Government',
    address: '',
    phone: '',
    operating_hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
    is_active: true,
  });

  // Form states for Service
  const [serviceForm, setServiceForm] = useState({
    name: '',
    prefix: '',
    description: '',
    avg_service_time_mins: 10,
    is_active: true,
  });

  const fetchCenters = async () => {
    try {
      const res = await api.get<{ centers: ServiceCenter[] }>('/centers?includeInactive=true');
      setCenters(res.centers || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load centers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  // Open Create Center Modal
  const openCreateCenter = () => {
    setEditingCenter(null);
    setCenterForm({
      name: '',
      code: '',
      category: 'Government',
      address: '',
      phone: '',
      operating_hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
      is_active: true,
    });
    setCenterModalOpen(true);
  };

  // Open Edit Center Modal
  const openEditCenter = (center: ServiceCenter) => {
    setEditingCenter(center);
    setCenterForm({
      name: center.name,
      code: center.code,
      category: center.category,
      address: center.address,
      phone: center.phone || '',
      operating_hours: center.operating_hours || '',
      is_active: center.is_active,
    });
    setCenterModalOpen(true);
  };

  // Save Center
  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCenter) {
        await api.put(`/centers/${editingCenter.id}`, centerForm);
      } else {
        await api.post('/centers', centerForm);
      }
      setCenterModalOpen(false);
      fetchCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to save service center.');
    }
  };

  // Toggle Center Active status
  const toggleCenterActive = async (center: ServiceCenter) => {
    try {
      await api.put(`/centers/${center.id}`, { is_active: !center.is_active });
      fetchCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to update center status.');
    }
  };

  // Delete Center
  const handleDeleteCenter = async (centerId: number) => {
    if (!confirm('Are you sure you want to delete this center and all its services?')) return;
    try {
      await api.delete(`/centers/${centerId}`);
      fetchCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to delete service center.');
    }
  };

  // Open Add Service Modal
  const openAddService = (center: ServiceCenter) => {
    setSelectedCenterForService(center);
    setEditingService(null);
    setServiceForm({
      name: '',
      prefix: '',
      description: '',
      avg_service_time_mins: 10,
      is_active: true,
    });
    setServiceModalOpen(true);
  };

  // Open Edit Service Modal
  const openEditService = (center: ServiceCenter, service: Service) => {
    setSelectedCenterForService(center);
    setEditingService(service);
    setServiceForm({
      name: service.name,
      prefix: service.prefix,
      description: service.description || '',
      avg_service_time_mins: service.avg_service_time_mins,
      is_active: service.is_active,
    });
    setServiceModalOpen(true);
  };

  // Save Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCenterForService) return;

    try {
      if (editingService) {
        await api.put(`/services/${editingService.id}`, {
          ...serviceForm,
          center_id: selectedCenterForService.id,
        });
      } else {
        await api.post('/services', {
          ...serviceForm,
          center_id: selectedCenterForService.id,
        });
      }
      setServiceModalOpen(false);
      fetchCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to save service.');
    }
  };

  // Toggle Service Active status
  const toggleServiceActive = async (service: Service) => {
    try {
      await api.put(`/services/${service.id}`, { is_active: !service.is_active });
      fetchCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to update service.');
    }
  };

  // Delete Service
  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.delete(`/services/${serviceId}`);
      fetchCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to delete service.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 pb-16">
      {/* Header */}
      <div className="bg-slate-900 text-white py-6 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              title="Back to operator console"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-blue-400">
                Administration & Setup
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                Service Centers & Services Manager
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openCreateCenter}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service Center</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 animate-pulse">
            Loading service centers configuration...
          </div>
        ) : (
          <div className="space-y-6">
            {centers.map((center) => (
              <div
                key={center.id}
                className={`bg-white border rounded-2xl shadow-2xs overflow-hidden transition-all ${
                  center.is_active ? 'border-slate-200' : 'border-slate-300 opacity-75 bg-slate-50'
                }`}
              >
                {/* Center Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                        {center.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                        CODE: {center.code}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          center.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {center.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{center.name}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {center.address}
                      </span>
                      {center.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {center.phone}
                        </span>
                      )}
                      {center.operating_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {center.operating_hours}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCenterActive(center)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
                        center.is_active
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {center.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEditCenter(center)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCenter(center.id)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Services Section */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Counter Queues Under This Center ({center.services?.length || 0})
                    </h3>
                    <button
                      onClick={() => openAddService(center)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Service to Center
                    </button>
                  </div>

                  {center.services && center.services.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {center.services.map((service) => (
                        <div
                          key={service.id}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                            service.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-xs bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-100">
                                Prefix: {service.prefix}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  service.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {service.is_active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 mt-1">{service.name}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                              {service.description || 'Standard queue counter.'}
                            </p>
                            <div className="text-[11px] text-slate-400 mt-2 font-mono">
                              Avg Duration: ~{service.avg_service_time_mins} min / ticket
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => toggleServiceActive(service)}
                              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                            >
                              {service.is_active ? 'Turn Off' : 'Turn On'}
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditService(center, service)}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteService(service.id)}
                                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No services configured for this center. Click "Add Service to Center" above.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Center Modal (Create / Edit) */}
      {centerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCenter ? 'Edit Service Center' : 'Create New Service Center'}
              </h3>
              <button onClick={() => setCenterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCenter} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Center Name</label>
                <input
                  type="text"
                  required
                  value={centerForm.name}
                  onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                  placeholder="e.g. Metro Citizen Service Hub"
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Center Code</label>
                  <input
                    type="text"
                    required
                    value={centerForm.code}
                    onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MCSH"
                    className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={centerForm.category}
                    onChange={(e) => setCenterForm({ ...centerForm, category: e.target.value })}
                    className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white"
                  >
                    <option value="Government">Government</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Banking">Banking</option>
                    <option value="Customer Care">Customer Care</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  required
                  value={centerForm.address}
                  onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
                  placeholder="Street, Suite, City"
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={centerForm.phone}
                    onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={centerForm.operating_hours}
                    onChange={(e) => setCenterForm({ ...centerForm, operating_hours: e.target.value })}
                    placeholder="Mon - Fri: 8:00 AM - 5:00 PM"
                    className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="centerActive"
                  type="checkbox"
                  checked={centerForm.is_active}
                  onChange={(e) => setCenterForm({ ...centerForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="centerActive" className="text-xs font-semibold text-slate-700">
                  Service Center is Active and accepting tokens
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCenterModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {editingCenter ? 'Update Center' : 'Create Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Modal (Create / Edit) */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingService ? 'Edit Service Queue' : 'Add Service Queue'}
                </h3>
                <span className="text-xs text-slate-500">{selectedCenterForService?.name}</span>
              </div>
              <button onClick={() => setServiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g. Driver's License Renewal"
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Token Prefix</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={serviceForm.prefix}
                    onChange={(e) => setServiceForm({ ...serviceForm, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                    placeholder="e.g. DL"
                    className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. DL-101, DOC-101</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Avg Service Time (mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    required
                    value={serviceForm.avg_service_time_mins}
                    onChange={(e) => setServiceForm({ ...serviceForm, avg_service_time_mins: Number(e.target.value) })}
                    className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Description of documents required or scope..."
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="srvActive"
                  type="checkbox"
                  checked={serviceForm.is_active}
                  onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="srvActive" className="text-xs font-semibold text-slate-700">
                  Service is Active and open for queueing
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {editingService ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
