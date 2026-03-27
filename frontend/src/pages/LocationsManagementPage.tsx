import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { locationsService } from "../api/services/locations.service";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Navigation,
  Building2,
  Factory,
  Warehouse,
  Store,
  XCircle,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import type { Location, CreateLocationRequest } from "../types/api.types";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet marker fix for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const LOCATION_TYPES = [
  { value: "RAW_WAREHOUSE", label: "Raw Warehouse", icon: Warehouse },
  { value: "PRODUCTION_FACILITY", label: "Production Facility", icon: Factory },
  { value: "FINISHED_WAREHOUSE", label: "Finished Warehouse", icon: Building2 },
  { value: "DISTRIBUTION_CENTER", label: "Distribution Center", icon: Store },
];

const DEFAULT_CENTER: LatLngTuple = [33.5731, -7.5898];

const toNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<string | null> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat,
  )}&lon=${encodeURIComponent(lng)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.display_name || null;
};

const RecenterMap = ({ center }: { center: LatLngTuple }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
};

const PickOnMap = ({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

const AllLocationsMap = ({ locations }: { locations: Location[] }) => {
  const valid = locations.filter(
    (l) =>
      Number.isFinite(toNumber(l.latitude, NaN)) &&
      Number.isFinite(toNumber(l.longitude, NaN)),
  );

  const center: LatLngTuple = valid.length
    ? [toNumber(valid[0].latitude), toNumber(valid[0].longitude)]
    : DEFAULT_CENTER;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <h3 className="text-white font-semibold mb-3">Locations Map</h3>
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom
        style={{ height: 320, width: "100%", borderRadius: "0.75rem" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {valid.map((location) => (
          <Marker
            key={location.id}
            position={[
              toNumber(location.latitude),
              toNumber(location.longitude),
            ]}
          >
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold">{location.name}</p>
                <p className="text-xs">{location.address}</p>
                <p className="text-xs mt-1">{location.locationType}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export const LocationsManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | "ALL">("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsService.getLocations,
  });

  const createLocationMutation = useMutation({
    mutationFn: locationsService.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsAddModalOpen(false);
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateLocationRequest>;
    }) => locationsService.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setSelectedLocation(null);
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: locationsService.deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsDeleteModalOpen(false);
      setSelectedLocation(null);
    },
  });

  const filteredLocations =
    locations?.filter((location) => {
      const matchesSearch =
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === "ALL" || location.locationType === typeFilter;

      return matchesSearch && matchesType;
    }) || [];

  const stats = LOCATION_TYPES.map((type) => ({
    label: type.label,
    value: locations?.filter((l) => l.locationType === type.value).length || 0,
    icon: type.icon,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Location Management</h1>
          <p className="text-gray-400 mt-1">
            Manage warehouses, facilities, and distribution centers
          </p>
        </div>
        {user?.role === "MANAGER" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-500 hover:to-cyan-500 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Location
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
          >
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 inline-block mb-4">
              <stat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <AllLocationsMap locations={filteredLocations} />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="ALL">All Types</option>
            {LOCATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredLocations.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No locations found
          </h3>
          <p className="text-gray-400">
            {searchQuery || typeFilter !== "ALL"
              ? "Try adjusting your search or filters"
              : "Add locations to start managing your facilities"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map((location) => {
            const locationType = LOCATION_TYPES.find(
              (t) => t.value === location.locationType,
            );
            const Icon = locationType?.icon || MapPin;

            return (
              <div
                key={location.id}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {user?.role === "MANAGER" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedLocation(location)}
                        className="text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLocation(location);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">
                  {location.name}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{location.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Navigation className="w-4 h-4" />
                    <span>
                      {toNumber(location.latitude).toFixed(4)},{" "}
                      {toNumber(location.longitude).toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {locationType?.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAddModalOpen && (
        <LocationFormModal
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={(data) => createLocationMutation.mutate(data)}
          isLoading={createLocationMutation.isPending}
        />
      )}

      {selectedLocation && !isDeleteModalOpen && (
        <LocationFormModal
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onSubmit={(data) =>
            updateLocationMutation.mutate({ id: selectedLocation.id, data })
          }
          isLoading={updateLocationMutation.isPending}
        />
      )}

      {isDeleteModalOpen && selectedLocation && (
        <DeleteConfirmModal
          location={selectedLocation}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedLocation(null);
          }}
          onConfirm={() => deleteLocationMutation.mutate(selectedLocation.id)}
          isLoading={deleteLocationMutation.isPending}
        />
      )}
    </div>
  );
};

interface LocationFormModalProps {
  location?: Location;
  onClose: () => void;
  onSubmit: (data: CreateLocationRequest) => void;
  isLoading: boolean;
}

const LocationFormModal = ({
  location,
  onClose,
  onSubmit,
  isLoading,
}: LocationFormModalProps) => {
  const [formData, setFormData] = useState<CreateLocationRequest>({
    name: location?.name || "",
    address: location?.address || "",
    latitude: toNumber(location?.latitude, DEFAULT_CENTER[0]),
    longitude: toNumber(location?.longitude, DEFAULT_CENTER[1]),
    locationType: location?.locationType || "",
  });

  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const markerPosition = useMemo<LatLngTuple>(
    () => [toNumber(formData.latitude), toNumber(formData.longitude)],
    [formData.latitude, formData.longitude],
  );

  const resolveAndFillAddress = async (lat: number, lng: number) => {
    const reqId = ++requestIdRef.current;
    setIsResolvingAddress(true);
    setGeoError(null);

    try {
      const addr = await reverseGeocode(lat, lng);
      if (reqId !== requestIdRef.current) return;
      if (addr) {
        setFormData((prev) => ({ ...prev, address: addr }));
      } else {
        setGeoError("Address not found for this point.");
      }
    } catch {
      if (reqId !== requestIdRef.current) return;
      setGeoError(
        "Reverse geocoding failed. You can still type address manually.",
      );
    } finally {
      if (reqId === requestIdRef.current) setIsResolvingAddress(false);
    }
  };

  const handleMapPick = async (lat: number, lng: number) => {
    const fixedLat = Number(lat.toFixed(6));
    const fixedLng = Number(lng.toFixed(6));
    setFormData((prev) => ({
      ...prev,
      latitude: fixedLat,
      longitude: fixedLng,
    }));
    await resolveAndFillAddress(fixedLat, fixedLng);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-gray-900 z-10">
          <h3 className="text-xl font-semibold text-white">
            {location ? "Edit Location" : "Add Location"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="e.g., Main Warehouse"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location Type
            </label>
            <select
              value={formData.locationType}
              onChange={(e) =>
                setFormData({ ...formData, locationType: e.target.value })
              }
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Select Type</option>
              {LOCATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pick on map (click map or drag marker)
            </label>
            <MapContainer
              center={markerPosition}
              zoom={12}
              scrollWheelZoom
              style={{ height: 280, width: "100%", borderRadius: "0.75rem" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap center={markerPosition} />
              <PickOnMap onPick={handleMapPick} />
              <Marker
                position={markerPosition}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target as L.Marker;
                    const pos = marker.getLatLng();
                    void handleMapPick(pos.lat, pos.lng);
                  },
                }}
              />
            </MapContainer>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {isResolvingAddress ? (
                <span className="text-blue-300 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Resolving address...
                </span>
              ) : geoError ? (
                <span className="text-yellow-300">{geoError}</span>
              ) : (
                <span className="text-gray-400">
                  Address auto-fills from selected point.
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
              rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              placeholder="Will auto-fill from map click, or type manually"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Latitude
              </label>
              <input
                type="number"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    latitude: parseFloat(e.target.value),
                  })
                }
                required
                step="any"
                min="-90"
                max="90"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="40.7128"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Longitude
              </label>
              <input
                type="number"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    longitude: parseFloat(e.target.value),
                  })
                }
                required
                step="any"
                min="-180"
                max="180"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="-74.0060"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isResolvingAddress}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "Saving..." : location ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteConfirmModalProps {
  location: Location;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const DeleteConfirmModal = ({
  location,
  onClose,
  onConfirm,
  isLoading,
}: DeleteConfirmModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">Delete Location</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-300 mb-4">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">{location.name}</span>?
          </p>
          <p className="text-sm text-gray-400">
            This action cannot be undone. This location will be permanently
            removed from the system.
          </p>
        </div>

        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium hover:from-red-500 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
