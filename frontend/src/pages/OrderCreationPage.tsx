import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { RouteMap } from "../components/map";
import { locationsService } from "../api/services/locations.service";
import { usersService } from "../api/services/users.service";
import { stockService } from "../api/services/stock.service";
import { ordersService } from "../api/services/orders.service";
import { transportService } from "../api/services/transport.service";
import { useAuth } from "../hooks/useAuth";
import { OrderType, ProductType, UserRole } from "../types/api.types";

type RequestMode = "ORDER" | "DELIVERY";

interface OrderItem {
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  availableQuantity: number;
  unitWeight: number;
}

interface Location {
  id: string;
  name: string;
  locationType: string;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
}

interface UserLike {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  locationId?: string | null;
}

interface ProviderLike {
  id: string;
  name: string;
  vehicles?: Array<{ id: string; status?: string }>;
}

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const v = value as any;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.locations)) return v.locations;
  if (Array.isArray(v.providers)) return v.providers;
  if (v.data && Array.isArray(v.data.items)) return v.data.items;
  if (v.data && Array.isArray(v.data.locations)) return v.data.locations;
  if (v.data && Array.isArray(v.data.providers)) return v.data.providers;
  return [];
};

const getErrorMessage = (error: any): string =>
  error?.response?.data?.message || error?.message || "Something went wrong";

const parseNumeric = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const unwrapApiPayload = (input: any): any => {
  let cur = input;

  // AxiosResponse -> data
  if (cur && typeof cur === "object" && "data" in cur) {
    cur = cur.data;
  }

  // unwrap wrappers like { success, data } or nested { data: { ... } }
  let guard = 0;
  while (cur && typeof cur === "object" && guard < 6) {
    guard++;

    if ("success" in cur && "data" in cur) {
      cur = cur.data;
      continue;
    }

    // If object is mainly a wrapper with nested data, unwrap once more
    if ("data" in cur && Object.keys(cur).length <= 2) {
      cur = cur.data;
      continue;
    }

    break;
  }

  return cur;
};

const extractDistanceKm = (raw: any): number => {
  const value = unwrapApiPayload(raw);
  return parseNumeric(
    value?.distanceKm ??
      value?.distance ??
      value?.distance?.distanceKm ??
      value?.result?.distanceKm ??
      value?.result?.distance ??
      value?.meta?.distanceKm,
  );
};

const deepFindNumberByKeys = (
  input: any,
  keyMatchers: Array<string | RegExp>,
): number | null => {
  const seen = new Set<any>();

  const keyMatch = (k: string) =>
    keyMatchers.some((m) => (typeof m === "string" ? m === k : m.test(k)));

  const walk = (obj: any): number | null => {
    if (obj == null || typeof obj !== "object") return null;
    if (seen.has(obj)) return null;
    seen.add(obj);

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = walk(item);
        if (found !== null) return found;
      }
      return null;
    }

    for (const [k, v] of Object.entries(obj)) {
      if (keyMatch(k)) {
        const n = parseNumeric(v);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }

    for (const v of Object.values(obj)) {
      const found = walk(v);
      if (found !== null) return found;
    }

    return null;
  };

  return walk(input);
};

const extractTransportCost = (raw: any): number => {
  const value = unwrapApiPayload(raw);

  const candidates = [
    // direct
    value?.totalCost,
    value?.transportTotal,
    value?.transportCost,
    value?.estimatedCost,
    value?.finalCost,
    value?.cost,
    value?.price,
    value?.amount,
    value?.total,

    // nested known response shapes
    value?.order?.transportTotal,
    value?.order?.transportJob?.totalCost,
    value?.transportJob?.totalCost,

    // common wrappers
    value?.data?.totalCost,
    value?.data?.transportTotal,
    value?.data?.transportCost,
    value?.data?.cost,
    value?.data?.total,
    value?.data?.price,
    value?.data?.amount,

    value?.result?.totalCost,
    value?.result?.transportTotal,
    value?.result?.transportCost,
    value?.result?.cost,
    value?.result?.total,

    value?.quote?.totalCost,
    value?.quote?.cost,
    value?.pricing?.totalCost,
    value?.pricing?.total,
  ];

  for (const c of candidates) {
    const n = parseNumeric(c);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const allocations =
    value?.allocations ??
    value?.order?.transportJob?.allocations ??
    value?.transportJob?.allocations ??
    value?.data?.allocations ??
    value?.result?.allocations ??
    [];

  if (Array.isArray(allocations) && allocations.length > 0) {
    const sum = allocations.reduce(
      (acc: number, a: any) =>
        acc + parseNumeric(a?.cost ?? a?.price ?? a?.amount),
      0,
    );
    if (Number.isFinite(sum) && sum > 0) return sum;
  }

  const deep = deepFindNumberByKeys(value, [
    "transportTotal",
    "totalCost",
    "transportCost",
    "estimatedCost",
    "finalCost",
    "cost",
    "price",
    "amount",
    /^total.*(cost|price|amount)$/i,
    /(transport).*(cost|price|amount)/i,
  ]);

  return deep && deep > 0 ? deep : 0;
};

const normalizeRole = (role?: string | null) => (role || "").toUpperCase();

const rolesByLocationType = (locationType?: string): string[] => {
  switch ((locationType || "").toUpperCase()) {
    case "RAW_WAREHOUSE":
      return ["RAW_STOCK_MANAGER", "MANAGER"];
    case "PRODUCTION_FACILITY":
      return ["PRODUCTION_CLIENT", "MANAGER"];
    case "FINISHED_WAREHOUSE":
      return ["FINISHED_STOCK_MANAGER", "MANAGER"];
    case "DISTRIBUTION_CENTER":
      return ["DISTRIBUTOR", "MANAGER"];
    default:
      return ["MANAGER"];
  }
};

export const OrderCreationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [mode, setMode] = useState<RequestMode>("ORDER");

  const [selectedFromLocation, setSelectedFromLocation] = useState<string>(
    user?.locationId || "",
  );
  const [selectedToLocation, setSelectedToLocation] = useState<string>("");

  const [confirmingUserId, setConfirmingUserId] = useState<string>("");
  const [destinationUserId, setDestinationUserId] = useState<string>("");

  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [transportProviderId, setTransportProviderId] = useState<string>("");

  const effectiveToLocationId =
    mode === "ORDER" ? user?.locationId || "" : selectedToLocation;

  useEffect(() => {
    if (mode === "ORDER" && user?.locationId) {
      setSelectedToLocation(user.locationId);
    }
  }, [mode, user?.locationId]);

  const { data: locationsRaw } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationsService.getLocations(),
  });
  const locations = asArray<Location>(locationsRaw);

  const { data: productsRaw, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["available-products", selectedFromLocation],
    queryFn: () =>
      stockService.getAvailableProductsAtLocation(selectedFromLocation),
    enabled: !!selectedFromLocation,
  });
  const availableProducts = asArray<any>(productsRaw);

  const { data: usersFromRaw, isLoading: isLoadingUsersFrom } = useQuery({
    queryKey: ["users-at-from", selectedFromLocation],
    queryFn: () => usersService.getUsersByLocation(selectedFromLocation),
    enabled: !!selectedFromLocation && step >= 3,
  });
  const usersAtFromLocation = asArray<UserLike>(usersFromRaw);

  const { data: usersToRaw, isLoading: isLoadingUsersTo } = useQuery({
    queryKey: ["users-at-to", effectiveToLocationId],
    queryFn: () => usersService.getUsersByLocation(effectiveToLocationId),
    enabled: mode === "DELIVERY" && !!effectiveToLocationId && step >= 3,
  });
  const usersAtToLocation = asArray<UserLike>(usersToRaw);

  const { data: providersRaw } = useQuery({
    queryKey: ["transport-providers"],
    queryFn: () => transportService.getTransportProviders(),
  });
  const transportProviders = asArray<ProviderLike>(providersRaw);

  const { data: distanceRaw } = useQuery({
    queryKey: ["distance", selectedFromLocation, effectiveToLocationId],
    queryFn: () =>
      locationsService.calculateDistance(
        selectedFromLocation,
        effectiveToLocationId,
      ),
    enabled: !!selectedFromLocation && !!effectiveToLocationId,
  });
  const distanceKm = extractDistanceKm(distanceRaw);

  const totalWeight = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, item) =>
          sum + parseNumeric(item.unitWeight) * parseNumeric(item.quantity),
        0,
      ),
    [selectedProducts],
  );

  const { data: costRaw, isFetching: isQuotingCost } = useQuery({
    queryKey: ["transport-cost", transportProviderId, totalWeight, distanceKm],
    queryFn: () =>
      transportService.calculateTransportCost(
        transportProviderId,
        totalWeight,
        distanceKm,
      ),
    enabled:
      !!transportProviderId && totalWeight > 0 && distanceKm > 0 && step >= 4,
  });
  const transportCost = extractTransportCost(costRaw);

  const selectedFromLocationObj = locations.find(
    (l) => l.id === selectedFromLocation,
  );
  const selectedToLocationObj = locations.find(
    (l) => l.id === effectiveToLocationId,
  );

  const filteredToLocations = useMemo(() => {
    if (mode === "ORDER") {
      return user?.locationId
        ? locations.filter((l) => l.id === user.locationId)
        : locations;
    }
    if (user?.role === UserRole.PRODUCTION_CLIENT) {
      return locations.filter((l) => l.locationType === "FINISHED_WAREHOUSE");
    }
    if (user?.role === UserRole.FINISHED_STOCK_MANAGER) {
      return locations.filter((l) => l.locationType === "DISTRIBUTION_CENTER");
    }
    return locations;
  }, [locations, mode, user?.role, user?.locationId]);

  const providersWithAvailableVehicles = useMemo(
    () =>
      transportProviders.filter((p) =>
        (p.vehicles || []).some(
          (v) => (v.status || "").toUpperCase() === "AVAILABLE",
        ),
      ),
    [transportProviders],
  );

  const { data: providerQuotesRaw, isFetching: isLoadingProviderQuotes } =
    useQuery({
      queryKey: [
        "provider-quotes-simple",
        providersWithAvailableVehicles.map((p) => p.id).join(","),
        totalWeight,
        distanceKm,
      ],
      enabled:
        step >= 4 &&
        providersWithAvailableVehicles.length > 0 &&
        totalWeight > 0 &&
        distanceKm > 0,
      queryFn: async () => {
        const rows = await Promise.all(
          providersWithAvailableVehicles.map(async (p) => {
            try {
              const res = await transportService.calculateTransportCost(
                p.id,
                totalWeight,
                distanceKm,
              );
              return { providerId: p.id, cost: extractTransportCost(res) };
            } catch {
              return { providerId: p.id, cost: Number.NaN };
            }
          }),
        );
        return rows;
      },
    });

  const providerQuoteMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of providerQuotesRaw || []) {
      if (Number.isFinite(row.cost) && row.cost > 0) {
        map.set(row.providerId, row.cost);
      }
    }
    return map;
  }, [providerQuotesRaw]);

  const selectedProviderQuotedCost = useMemo(
    () => providerQuoteMap.get(transportProviderId),
    [providerQuoteMap, transportProviderId],
  );

  const effectiveTransportCost = useMemo(() => {
    if (transportCost > 0) return transportCost;
    if (
      typeof selectedProviderQuotedCost === "number" &&
      selectedProviderQuotedCost > 0
    ) {
      return selectedProviderQuotedCost;
    }
    return 0;
  }, [transportCost, selectedProviderQuotedCost]);

  const getReliability = (p: ProviderLike): number => {
    const total = (p.vehicles || []).length;
    if (!total) return 0;
    const available = (p.vehicles || []).filter(
      (v) => (v.status || "").toUpperCase() === "AVAILABLE",
    ).length;
    return (available / total) * 100;
  };

  const cheapestProviderId = useMemo(() => {
    let bestId: string | null = null;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const p of providersWithAvailableVehicles) {
      const cost = providerQuoteMap.get(p.id);
      if (typeof cost === "number" && cost > 0 && cost < bestCost) {
        bestCost = cost;
        bestId = p.id;
      }
    }
    return bestId;
  }, [providersWithAvailableVehicles, providerQuoteMap]);

  const mostReliableProviderId = useMemo(() => {
    if (!providersWithAvailableVehicles.length) return null;
    let best = providersWithAvailableVehicles[0];
    let bestScore = getReliability(best);
    for (const p of providersWithAvailableVehicles.slice(1)) {
      const score = getReliability(p);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    return best.id;
  }, [providersWithAvailableVehicles]);

  const suggestedProviders = useMemo(() => {
    const out: ProviderLike[] = [];
    const seen = new Set<string>();

    if (cheapestProviderId) {
      const p = providersWithAvailableVehicles.find(
        (x) => x.id === cheapestProviderId,
      );
      if (p && !seen.has(p.id)) {
        out.push(p);
        seen.add(p.id);
      }
    }

    if (mostReliableProviderId) {
      const p = providersWithAvailableVehicles.find(
        (x) => x.id === mostReliableProviderId,
      );
      if (p && !seen.has(p.id)) {
        out.push(p);
        seen.add(p.id);
      }
    }

    return out;
  }, [
    providersWithAvailableVehicles,
    cheapestProviderId,
    mostReliableProviderId,
  ]);

  const requiredConfirmingRoles = useMemo(() => {
    // For DELIVERY, confirming user can be MANAGER or role appropriate for toLocation
    // For ORDER, confirming user role depends on fromLocation
    if (mode === "DELIVERY") {
      const toLocationRoles = rolesByLocationType(selectedToLocationObj?.locationType);
      return Array.from(new Set([...toLocationRoles, "MANAGER"])); // Add MANAGER option
    }
    
    if (selectedProducts.length > 0) {
      const firstType = selectedProducts[0].productType;
      if (firstType === ProductType.RAW_MATERIAL) {
        return ["RAW_STOCK_MANAGER", "MANAGER"];
      }
      return ["FINISHED_STOCK_MANAGER", "MANAGER"];
    }
    return rolesByLocationType(selectedFromLocationObj?.locationType);
  }, [mode, selectedProducts, selectedFromLocationObj?.locationType, selectedToLocationObj?.locationType]);

  const requiredDestinationRoles = useMemo(() => {
    if (mode !== "DELIVERY") return [];
    return rolesByLocationType(selectedToLocationObj?.locationType);
  }, [mode, selectedToLocationObj?.locationType]);

  const confirmingUsersFiltered = useMemo(
    () => {
      // For DELIVERY, get confirming users from TO location
      // For ORDER, get confirming users from FROM location
      const usersToFilter = mode === "DELIVERY" ? usersAtToLocation : usersAtFromLocation;
      return usersToFilter.filter((u) =>
        requiredConfirmingRoles.includes(normalizeRole(u.role)),
      );
    },
    [mode, usersAtFromLocation, usersAtToLocation, requiredConfirmingRoles],
  );

  const destinationUsersFiltered = useMemo(() => {
    if (mode !== "DELIVERY") return [];
    return usersAtToLocation.filter((u) =>
      requiredDestinationRoles.includes(normalizeRole(u.role)),
    );
  }, [mode, usersAtToLocation, requiredDestinationRoles]);

  useEffect(() => {
    if (
      confirmingUserId &&
      !confirmingUsersFiltered.some((u) => u.id === confirmingUserId)
    ) {
      setConfirmingUserId("");
    }
  }, [confirmingUserId, confirmingUsersFiltered]);

  useEffect(() => {
    if (
      destinationUserId &&
      !destinationUsersFiltered.some((u) => u.id === destinationUserId)
    ) {
      setDestinationUserId("");
    }
  }, [destinationUserId, destinationUsersFiltered]);

  const resetDownstream = () => {
    setSelectedProducts([]);
    setConfirmingUserId("");
    setDestinationUserId("");
    setTransportProviderId("");
    setSelectedToLocation("");
  };

  const isStepValid = () => {
    if (step === 1) {
      if (!selectedFromLocation || !effectiveToLocationId) return false;
      if (selectedFromLocation === effectiveToLocationId) return false;
      return true;
    }
    if (step === 2) return selectedProducts.length > 0;
    if (step === 3) {
      if (
        !confirmingUserId ||
        !confirmingUsersFiltered.some((u) => u.id === confirmingUserId)
      ) {
        return false;
      }
      if (
        mode === "DELIVERY" &&
        (!destinationUserId ||
          !destinationUsersFiltered.some((u) => u.id === destinationUserId))
      ) {
        return false;
      }
      return true;
    }
    if (step === 4) return !!transportProviderId;
    return true;
  };

  const addProduct = (product: any) => {
    const productId = product.productId || product.id;
    if (!productId || selectedProducts.some((p) => p.productId === productId))
      return;

    setSelectedProducts((prev) => [
      ...prev,
      {
        productId,
        productName: product.productName || product.name || "Unnamed Product",
        productType: product.productType || product.type,
        quantity: 1,
        availableQuantity: parseNumeric(
          product.availableQty ?? product.quantity ?? 0,
        ),
        unitWeight: parseNumeric(product.unitWeight ?? 1),
      },
    ]);
  };

  const setQty = (productId: string, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? {
              ...p,
              quantity: Math.max(
                1,
                Math.min(parseNumeric(quantity), p.availableQuantity),
              ),
            }
          : p,
      ),
    );
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.filter((p) => p.productId !== productId),
    );
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFromLocation || !effectiveToLocationId) {
        throw new Error("Route is required");
      }
      if (selectedFromLocation === effectiveToLocationId) {
        throw new Error("From and To location cannot be the same");
      }
      if (distanceKm <= 0) {
        throw new Error("Distance must be greater than 0");
      }
      if (!selectedProducts.length) {
        throw new Error("Select at least one product");
      }
      if (!transportProviderId) {
        throw new Error("Select transport provider");
      }
      if (
        !confirmingUserId ||
        !confirmingUsersFiltered.some((u) => u.id === confirmingUserId)
      ) {
        throw new Error("Valid confirming user is required");
      }
      if (
        mode === "DELIVERY" &&
        (!destinationUserId ||
          !destinationUsersFiltered.some((u) => u.id === destinationUserId))
      ) {
        throw new Error("Valid destination user is required for delivery");
      }

      const items = selectedProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
      }));

      if (mode === "DELIVERY") {
        return ordersService.createOrder({
          type: OrderType.DELIVERY,
          fromLocationId: selectedFromLocation,
          toLocationId: effectiveToLocationId,
          confirmingUserId,
          destinationUserId,
          transportProviderId,
          distanceKm,
          items,
        } as any);
      }

      const firstType = selectedProducts[0].productType;
      const type =
        firstType === ProductType.RAW_MATERIAL
          ? OrderType.RAW_MATERIAL_ORDER
          : OrderType.FINISHED_PRODUCT_ORDER;

      return ordersService.createOrder({
        type,
        fromLocationId: selectedFromLocation,
        toLocationId: effectiveToLocationId,
        confirmingUserId,
        transportProviderId,
        distanceKm,
        items,
      } as any);
    },
    onSuccess: (res: any) => {
      const id =
        res?.id || res?.order?.id || res?.data?.id || res?.data?.order?.id;
      navigate(id ? `/orders/${id}` : "/orders");
    },
  });

  const next = () => {
    if (!isStepValid()) return;
    setStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : s));
  };

  const prev = () => {
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : s));
  };

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <section className="bg-gradient-to-b from-gray-900 to-black py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-3">Create Request</h1>
          <p className="text-gray-400">
            Create an Order or Delivery in one flow
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4">
          {step === 1 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-bold text-white">
                Step 1: Request Type & Route
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  className={`p-4 rounded-lg border ${
                    mode === "ORDER"
                      ? "border-blue-500 bg-blue-500/10 text-white"
                      : "border-gray-700 text-gray-300"
                  }`}
                  onClick={() => {
                    setMode("ORDER");
                    resetDownstream();
                  }}
                >
                  Order
                </button>
                <button
                  className={`p-4 rounded-lg border ${
                    mode === "DELIVERY"
                      ? "border-blue-500 bg-blue-500/10 text-white"
                      : "border-gray-700 text-gray-300"
                  }`}
                  onClick={() => {
                    setMode("DELIVERY");
                    resetDownstream();
                  }}
                >
                  Delivery
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label>
                  <span className="text-gray-400 block mb-2">
                    From Location
                  </span>
                  <select
                    value={selectedFromLocation}
                    onChange={(e) => {
                      setSelectedFromLocation(e.target.value);
                      resetDownstream();
                    }}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Choose from location...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.locationType})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-gray-400 block mb-2">To Location</span>
                  <select
                    value={effectiveToLocationId}
                    disabled={mode === "ORDER"}
                    onChange={(e) => setSelectedToLocation(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-70"
                  >
                    <option value="">Choose destination...</option>
                    {filteredToLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.locationType})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">Route Preview</p>
                <RouteMap
                  from={selectedFromLocationObj as any}
                  to={selectedToLocationObj as any}
                  height={280}
                />
              </div>

              <button
                onClick={next}
                disabled={!isStepValid()}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-semibold"
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-5">
                Step 2: Select Products
              </h2>

              {isLoadingProducts ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading
                  products...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 mb-6">
                    {availableProducts.map((p: any) => {
                      const pid = p.productId || p.id;
                      const already = selectedProducts.some(
                        (s) => s.productId === pid,
                      );

                      return (
                        <div
                          key={pid}
                          className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white font-medium">
                              {p.productName || p.name}
                            </p>
                            <p className="text-sm text-gray-400">
                              Available: {p.availableQty ?? p.quantity ?? 0}
                            </p>
                          </div>
                          <button
                            onClick={() => addProduct(p)}
                            disabled={already}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {selectedProducts.map((p) => (
                    <div
                      key={p.productId}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between mb-3"
                    >
                      <div>
                        <p className="text-white">{p.productName}</p>
                        <p className="text-sm text-gray-400">
                          Max: {p.availableQuantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          max={p.availableQuantity}
                          value={p.quantity}
                          onChange={(e) =>
                            setQty(p.productId, Number(e.target.value))
                          }
                          className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-center"
                        />
                        <button
                          onClick={() => removeProduct(p.productId)}
                          className="p-2 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prev}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={next}
                  disabled={!isStepValid()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-5">
                Step 3: User Validation
              </h2>

              <div className="space-y-4">
                <label>
                  <span className="text-gray-400 block mb-2">
                    Confirming user (required)
                  </span>
                  <select
                    value={confirmingUserId}
                    onChange={(e) => setConfirmingUserId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">
                      {isLoadingUsersFrom
                        ? "Loading..."
                        : "Choose confirming user..."}
                    </option>
                    {confirmingUsersFiltered.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role})
                      </option>
                    ))}
                  </select>
                </label>

                {!isLoadingUsersFrom &&
                  confirmingUsersFiltered.length === 0 && (
                    <p className="text-yellow-300 text-sm">
                      No eligible confirming users. Allowed role(s):{" "}
                      {requiredConfirmingRoles.join(", ")}.
                    </p>
                  )}

                {mode === "DELIVERY" && (
                  <>
                    <label>
                      <span className="text-gray-400 block mb-2">
                        Destination user (required)
                      </span>
                      <select
                        value={destinationUserId}
                        onChange={(e) => setDestinationUserId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="">
                          {isLoadingUsersTo
                            ? "Loading..."
                            : "Choose destination user..."}
                        </option>
                        {destinationUsersFiltered.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.role})
                          </option>
                        ))}
                      </select>
                    </label>

                    {!isLoadingUsersTo &&
                      destinationUsersFiltered.length === 0 && (
                        <p className="text-yellow-300 text-sm">
                          No eligible destination users. Allowed role(s):{" "}
                          {requiredDestinationRoles.join(", ")}.
                        </p>
                      )}
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prev}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={next}
                  disabled={!isStepValid()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-5">
                Step 4: Select Transport Provider
              </h2>

              {providersWithAvailableVehicles.length === 0 ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-300">
                  No providers with AVAILABLE vehicles.
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-cyan-300">
                        Suggested
                      </h3>
                      {isLoadingProviderQuotes && (
                        <p className="text-xs text-blue-300 flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Loading quotes...
                        </p>
                      )}
                    </div>

                    {suggestedProviders.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No suggestions yet.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {suggestedProviders.map((p) => {
                          const isCheapest = p.id === cheapestProviderId;
                          const isReliable = p.id === mostReliableProviderId;
                          const reliability = getReliability(p);
                          return (
                            <button
                              key={`suggested-${p.id}`}
                              onClick={() => setTransportProviderId(p.id)}
                              className={`text-left p-4 rounded-lg border ${
                                transportProviderId === p.id
                                  ? "border-blue-500 bg-blue-500/10"
                                  : "border-cyan-700/40 bg-cyan-500/5"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-white font-medium">
                                  {p.name}
                                </p>
                                <div className="flex gap-2">
                                  {isCheapest && (
                                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                                      Cheapest
                                    </span>
                                  )}
                                  {isReliable && (
                                    <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                      Most reliable
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-400 mt-1">
                                Reliability: {reliability.toFixed(0)}% • Quote:{" "}
                                {providerQuoteMap.has(p.id)
                                  ? `$${(providerQuoteMap.get(p.id) || 0).toFixed(2)}`
                                  : "N/A"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">
                      All providers
                    </h3>
                    <div className="grid gap-3">
                      {providersWithAvailableVehicles.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setTransportProviderId(p.id)}
                          className={`text-left p-4 rounded-lg border ${
                            transportProviderId === p.id
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-gray-700 bg-gray-800"
                          }`}
                        >
                          <p className="text-white font-medium">{p.name}</p>
                          <p className="text-sm text-gray-400">
                            AVAILABLE vehicles:{" "}
                            {
                              (p.vehicles || []).filter(
                                (v) =>
                                  (v.status || "").toUpperCase() ===
                                  "AVAILABLE",
                              ).length
                            }
                            {" • "}
                            Reliability: {getReliability(p).toFixed(0)}%{" • "}
                            Quote:{" "}
                            {providerQuoteMap.has(p.id)
                              ? `$${(providerQuoteMap.get(p.id) || 0).toFixed(2)}`
                              : "N/A"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prev}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={next}
                  disabled={!isStepValid()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-5">
                Step 5: Review & Submit
              </h2>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2 mb-6">
                <p className="text-gray-400">
                  Distance:{" "}
                  <span className="text-white">{distanceKm.toFixed(2)} km</span>
                </p>
                <p className="text-gray-400">
                  Weight:{" "}
                  <span className="text-white">
                    {totalWeight.toFixed(2)} kg
                  </span>
                </p>
                <p className="text-gray-400">
                  Transport:{" "}
                  <span className="text-green-400">
                    {effectiveTransportCost > 0
                      ? `$${effectiveTransportCost.toFixed(2)}`
                      : "N/A"}
                  </span>
                </p>

                {distanceKm > 0 &&
                  transportProviderId &&
                  !isQuotingCost &&
                  effectiveTransportCost <= 0 && (
                    <p className="text-yellow-300 text-sm">
                      Preview quote unavailable. Final cost will be computed on
                      submit.
                    </p>
                  )}

                {isQuotingCost && (
                  <p className="text-blue-300 text-sm flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Calculating cost...
                  </p>
                )}
              </div>

              <div className="mb-6">
                <RouteMap
                  from={selectedFromLocationObj as any}
                  to={selectedToLocationObj as any}
                  height={300}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={prev}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={() => createOrderMutation.mutate()}
                  disabled={createOrderMutation.isPending || isQuotingCost}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Create{" "}
                      {mode === "DELIVERY" ? "Delivery" : "Order"}
                    </>
                  )}
                </button>
              </div>

              {createOrderMutation.isError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{getErrorMessage(createOrderMutation.error)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
