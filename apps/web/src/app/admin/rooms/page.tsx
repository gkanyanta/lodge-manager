'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName: string;
  floor: number;
  status: string;
}

interface RoomType {
  id: string;
  name: string;
  description: string;
  baseRate: number;
  maxOccupancy: number;
  roomCount: number;
}

interface RatePlan {
  id: string;
  name: string;
  roomTypeId: string;
  roomTypeName: string;
  rate: number;
  isActive: boolean;
}

const tabs = [
  { key: 'rooms', label: 'Rooms' },
  { key: 'types', label: 'Room Types' },
  { key: 'rates', label: 'Rate Plans' },
];

const roomStatuses = ['available', 'occupied', 'reserved', 'dirty', 'out_of_service'];

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="mb-2 h-5 w-12 rounded bg-stone-200" />
          <div className="h-3 w-20 rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}

export default function RoomsPage() {
  const [activeTab, setActiveTab] = useState('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Room status change
  const [changingRoom, setChangingRoom] = useState<Room | null>(null);

  // Add room type modal
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState({ name: '', description: '', baseRate: '', maxOccupancy: '' });
  const [addTypeLoading, setAddTypeLoading] = useState(false);

  // Add room modal
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', roomTypeId: '', floor: '' });
  const [addRoomLoading, setAddRoomLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      if (activeTab === 'rooms') {
        const data = await api.get<Room[]>('/admin/rooms', { tenantSlug });
        setRooms(data);
      } else if (activeTab === 'types') {
        const data = await api.get<RoomType[]>('/admin/room-types', { tenantSlug });
        setRoomTypes(data);
      } else {
        const data = await api.get<RatePlan[]>('/admin/rate-plans', { tenantSlug });
        setRatePlans(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChangeRoomStatus = async (roomId: string, newStatus: string) => {
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.patch(`/admin/rooms/${roomId}/status`, { status: newStatus }, { tenantSlug });
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: newStatus } : r)),
      );
      setChangingRoom(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room status');
    }
  };

  const handleAddRoomType = async () => {
    setAddTypeLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        '/admin/room-types',
        {
          name: newType.name,
          description: newType.description,
          baseRate: Number(newType.baseRate),
          maxOccupancy: Number(newType.maxOccupancy),
        },
        { tenantSlug },
      );
      setShowAddType(false);
      setNewType({ name: '', description: '', baseRate: '', maxOccupancy: '' });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add room type');
    } finally {
      setAddTypeLoading(false);
    }
  };

  const handleAddRoom = async () => {
    setAddRoomLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        '/admin/rooms',
        {
          roomNumber: newRoom.roomNumber,
          roomTypeId: newRoom.roomTypeId,
          floor: Number(newRoom.floor),
        },
        { tenantSlug },
      );
      setShowAddRoom(false);
      setNewRoom({ roomNumber: '', roomTypeId: '', floor: '' });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add room');
    } finally {
      setAddRoomLoading(false);
    }
  };

  // Group rooms by floor for status board view
  const roomsByFloor = rooms.reduce(
    (acc, room) => {
      const floor = room.floor;
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(room);
      return acc;
    },
    {} as Record<number, Room[]>,
  );

  const statusColorMap: Record<string, string> = {
    available: 'bg-green-100 border-green-300 text-green-800',
    occupied: 'bg-blue-100 border-blue-300 text-blue-800',
    reserved: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    dirty: 'bg-red-100 border-red-300 text-red-800',
    out_of_service: 'bg-stone-200 border-stone-400 text-stone-600',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Rooms & Rates</h1>
        {activeTab === 'rooms' && (
          <Button size="sm" onClick={() => setShowAddRoom(true)}>
            + Add Room
          </Button>
        )}
        {activeTab === 'types' && (
          <Button size="sm" onClick={() => setShowAddType(true)}>
            + Add Type
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-stone-500 hover:text-stone-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Rooms tab */}
      {activeTab === 'rooms' && (
        loading ? (
          <GridSkeleton />
        ) : rooms.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-medium text-stone-900">No rooms configured</p>
            <p className="mt-1 text-sm text-stone-500">Add room types first, then add rooms.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              {roomStatuses.map((status) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={cn('inline-block h-3 w-3 rounded-sm border', statusColorMap[status])} />
                  <span className="capitalize text-stone-600">{status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>

            {/* Room grid by floor */}
            {Object.entries(roomsByFloor)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([floor, floorRooms]) => (
                <div key={floor}>
                  <h3 className="mb-2 text-sm font-semibold text-stone-500">Floor {floor}</h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {floorRooms
                      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
                      .map((room) => (
                        <button
                          key={room.id}
                          onClick={() => setChangingRoom(room)}
                          className={cn(
                            'flex min-h-[64px] flex-col items-center justify-center rounded-lg border-2 p-2 text-center transition-shadow hover:shadow-md',
                            statusColorMap[room.status] || statusColorMap.available,
                          )}
                        >
                          <span className="text-sm font-bold">{room.roomNumber}</span>
                          <span className="text-[10px] leading-tight opacity-75">{room.roomTypeName}</span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )
      )}

      {/* Room Types tab */}
      {activeTab === 'types' && (
        loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 w-32 rounded bg-stone-200" />
                <div className="mt-2 h-3 w-48 rounded bg-stone-200" />
              </div>
            ))}
          </div>
        ) : roomTypes.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-medium text-stone-900">No room types defined</p>
            <p className="mt-1 text-sm text-stone-500">Create your first room type to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roomTypes.map((type) => (
              <div key={type.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-stone-900">{type.name}</h3>
                    <p className="mt-0.5 text-sm text-stone-500">{type.description}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold text-primary-700">
                    {formatCurrency(type.baseRate)}/night
                  </p>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-stone-400">
                  <span>Max occupancy: {type.maxOccupancy}</span>
                  <span>{type.roomCount} room(s)</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Rate Plans tab */}
      {activeTab === 'rates' && (
        loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 w-32 rounded bg-stone-200" />
                <div className="mt-2 h-3 w-48 rounded bg-stone-200" />
              </div>
            ))}
          </div>
        ) : ratePlans.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-medium text-stone-900">No rate plans configured</p>
            <p className="mt-1 text-sm text-stone-500">Rate plans will appear here once configured.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ratePlans.map((plan) => (
              <div key={plan.id} className="card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-stone-900">{plan.name}</h3>
                      <span className={cn('badge', plan.isActive ? 'badge-green' : 'badge-gray')}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500">{plan.roomTypeName}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold text-stone-900">
                    {formatCurrency(plan.rate)}/night
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Change room status modal */}
      {changingRoom && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setChangingRoom(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="text-lg font-semibold text-stone-900">
              Room {changingRoom.roomNumber}
            </h3>
            <p className="mb-4 text-sm text-stone-500">
              Current status: <span className="font-medium capitalize">{changingRoom.status.replace('_', ' ')}</span>
            </p>
            <div className="space-y-2">
              {roomStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => handleChangeRoomStatus(changingRoom.id, status)}
                  disabled={status === changingRoom.status}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors min-h-[48px]',
                    status === changingRoom.status
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-stone-200 text-stone-700 hover:bg-stone-50',
                  )}
                >
                  <span className={cn('h-3 w-3 rounded-sm border', statusColorMap[status])} />
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                  {status === changingRoom.status && (
                    <span className="ml-auto text-xs text-primary-500">Current</span>
                  )}
                </button>
              ))}
            </div>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => setChangingRoom(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Add room type modal */}
      {showAddType && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddType(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Add Room Type</h3>
            <div className="space-y-3">
              <Input
                label="Name"
                required
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder="e.g. Standard Double"
              />
              <Input
                label="Description"
                value={newType.description}
                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                placeholder="Room description"
              />
              <Input
                label="Base Rate (per night)"
                type="number"
                required
                value={newType.baseRate}
                onChange={(e) => setNewType({ ...newType, baseRate: e.target.value })}
                placeholder="0.00"
              />
              <Input
                label="Max Occupancy"
                type="number"
                required
                value={newType.maxOccupancy}
                onChange={(e) => setNewType({ ...newType, maxOccupancy: e.target.value })}
                placeholder="2"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowAddType(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={addTypeLoading}
                onClick={handleAddRoomType}
                disabled={!newType.name || !newType.baseRate}
                className="flex-1"
              >
                Add Type
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add room modal */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddRoom(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Add Room</h3>
            <div className="space-y-3">
              <Input
                label="Room Number"
                required
                value={newRoom.roomNumber}
                onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                placeholder="e.g. 101"
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Room Type <span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  value={newRoom.roomTypeId}
                  onChange={(e) => setNewRoom({ ...newRoom, roomTypeId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select room type</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Floor"
                type="number"
                required
                value={newRoom.floor}
                onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                placeholder="1"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowAddRoom(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={addRoomLoading}
                onClick={handleAddRoom}
                disabled={!newRoom.roomNumber || !newRoom.roomTypeId || !newRoom.floor}
                className="flex-1"
              >
                Add Room
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
