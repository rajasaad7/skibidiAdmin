'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Mail, User, Building2, Calendar, MessageSquare, Star, Phone, CheckCircle2, Ban } from 'lucide-react';

interface Contact {
  _id: string;
  fullName: string;
  email: string;
  company: string | null;
  teamSize: string | null;
  message: string;
  status: string;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    resolved: 0,
    spam: 0,
    this_week: 0
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      let url = '/api/contacts';
      const params = new URLSearchParams();

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setContacts(data.contacts);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContacts();
  };

  const updateContactStatus = async (contactId: string, status: string) => {
    try {
      const response = await fetch('/api/contacts/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId, status }),
      });

      const data = await response.json();
      if (data.success) {
        fetchContacts();
        if (selectedContact?._id === contactId) {
          setSelectedContact(data.contact);
        }
      }
    } catch (error) {
      console.error('Error updating contact status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { color: 'bg-red-100 text-red-800', icon: Star },
      contacted: { color: 'bg-yellow-100 text-yellow-800', icon: Phone },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      spam: { color: 'bg-gray-100 text-gray-800', icon: Ban },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Contact Submissions</h1>
        <button
          onClick={fetchContacts}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'all' ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Total Contacts</div>
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
        </button>
        <button
          onClick={() => setStatusFilter('new')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'new' ? 'border-red-600 ring-2 ring-red-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">New Contacts</div>
          <div className="text-2xl font-bold text-red-600">{stats.new}</div>
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md border-gray-200`}
        >
          <div className="text-sm text-gray-600 mb-1">This Week</div>
          <div className="text-2xl font-bold text-green-600">{stats.this_week}</div>
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'resolved' ? 'border-green-600 ring-2 ring-green-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Resolved</div>
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Contacts
        </button>
        <button
          onClick={() => setStatusFilter('new')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'new'
              ? 'bg-red-100 text-red-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Star className="w-4 h-4" />
          New
        </button>
        <button
          onClick={() => setStatusFilter('contacted')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'contacted'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Phone className="w-4 h-4" />
          Contacted
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'resolved'
              ? 'bg-green-100 text-green-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Resolved
        </button>
        <button
          onClick={() => setStatusFilter('spam')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'spam'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Ban className="w-4 h-4" />
          Spam
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTimeout(fetchContacts, 0);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Company</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Team Size</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Message Preview</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Submitted</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="font-medium text-gray-900">{contact.fullName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {contact.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4" />
                        {contact.company || 'Not specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.teamSize || 'Not specified'}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={contact.status}
                        onChange={(e) => updateContactStatus(contact._id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="resolved">Resolved</option>
                        <option value="spam">Spam</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-sm text-gray-600">
                        {contact.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedContact(contact)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Contact Details</h2>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Full Name</h3>
                  <p className="text-sm text-gray-900">{selectedContact.fullName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
                  {getStatusBadge(selectedContact.status)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Email</h3>
                <a href={`mailto:${selectedContact.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                  {selectedContact.email}
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Company</h3>
                  <p className="text-sm text-gray-900">{selectedContact.company || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Team Size</h3>
                  <p className="text-sm text-gray-900">{selectedContact.teamSize || 'Not specified'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Message</h3>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {selectedContact.message}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Submitted</h3>
                <p className="text-sm text-gray-900">
                  {new Date(selectedContact.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateContactStatus(selectedContact._id, 'contacted')}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  Mark as Contacted
                </button>
                <button
                  onClick={() => updateContactStatus(selectedContact._id, 'resolved')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
