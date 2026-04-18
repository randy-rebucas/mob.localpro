# Mobile Provider Discovery Implementation Guide

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Mobile Implementation](#mobile-implementation)
5. [API Reference](#api-reference)
6. [Search & Filtering](#search--filtering)
7. [Provider Cards & Display](#provider-cards--display)
8. [Geolocation & Distance](#geolocation--distance)
9. [Ratings & Reviews](#ratings--reviews)
10. [Real-Time Provider Status](#real-time-provider-status)
11. [Caching & Performance](#caching--performance)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## System Overview

LocalPro's **Mobile Provider Discovery** system enables customers to efficiently find, filter, and connect with qualified service providers. The system integrates:

- **Multi-criteria Search** — By category, location, rating, availability
- **Smart Filtering** — Price range, skills, certifications, service areas
- **Geolocation** — Distance-based provider ranking and sorting
- **Real-Time Status** — Live availability and recent activity indicators
- **Ratings & Reviews** — Trust signals and social proof
- **Personalized Recommendations** — Based on job history and preferences
- **Saved Providers** — Bookmarking and quick access to favorites

**Architecture Overview:**

```
┌──────────────────────────────┐
│   Mobile App (React Native)  │
│   - Search UI                │
│   - Filter Components        │
│   - Provider Cards           │
└──────────┬───────────────────┘
           │
    ┌──────▼──────────┐
    │  Location Svc   │
    │  (Geolocation)  │
    └──────┬──────────┘
           │
    ┌──────▼──────────────────────┐
    │  Provider Discovery API     │
    │  - /providers/search        │
    │  - /providers/nearby        │
    │  - /providers/{id}          │
    │  - /providers/{id}/reviews  │
    └──────┬──────────────────────┘
           │
    ┌──────▼─────────────────────┐
    │  Cache Layer (Redis)       │
    │  - Provider listings       │
    │  - Search indices          │
    │  - Geospatial queries      │
    └──────┬─────────────────────┘
           │
    ┌──────▼──────────────────┐
    │  Database (PostgreSQL)  │
    │  - Providers            │
    │  - Provider Profiles    │
    │  - Ratings & Reviews    │
    │  - Availability         │
    └─────────────────────────┘
```

---

## Architecture

### Database Models

#### `Provider`

Core provider entity with searchable attributes.

```typescript
interface Provider {
  id: string;
  userId: string;
  businessName: string; // Provider's business name (required, searchable)
  category: string; // e.g., "plumbing", "cleaning", "tutoring"
  subcategories: string[];

  // Location data
  address: {
    street: string;
    city: string;
    province: string;
    zipCode: string;
    lat: number;
    lng: number;
  };

  // Service area
  serviceAreaRadius: number; // km from address
  serviceAreas: string[]; // specific barangays/municipalities

  // Contact & visibility
  displayPhone: string; // Phone number displayed on provider profile
  email: string; // Provider's contact email
  website?: string; // Optional business website
  isPublished: boolean; // Whether provider profile is visible in search results

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

#### `ProviderProfile`

Extended profile information and qualifications.

```typescript
interface ProviderProfile {
  id: string;
  providerId: string; // Reference to Provider entity (via businessName)

  // Profile content
  bio: string; // max 1000 chars, provider's professional bio
  avatar: string; // URL to provider's profile photo
  yearsExperience: number; // Years of experience in their service category
  certifications: Certification[];
  skills: Skill[];
  portfolioItems: PortfolioItem[];

  // Ratings & engagement
  avgRating: number; // 1-5, weighted
  totalReviews: number;
  responseRatePercent: number;
  avgResponseTimeMinutes: number;

  // Business info
  hourlyRate?: number;
  completedJobs: number;
  acceptanceRatePercent: number;

  // Status
  availabilityStatus: "available" | "busy" | "unavailable";
  lastActiveAt: Date;

  updatedAt: Date;
}
```

#### `ProviderRating`

Individual ratings and reviews.

```typescript
interface ProviderRating {
  id: string;
  providerId: string;
  customerId: string;
  jobId: string;

  // Rating data
  rating: number; // 1-5
  title: string;
  comment: string;
  tags: string[]; // e.g., "professional", "punctual", "quality_work"

  // Response
  providerResponse?: {
    comment: string;
    respondedAt: Date;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

#### `SavedProvider`

Bookmarked/favorite providers per customer.

```typescript
interface SavedProvider {
  id: string;
  customerId: string;
  providerId: string;
  notes?: string; // Customer notes about this provider
  savedAt: Date;
}
```

### Key Services

#### `provider-discovery.service.ts`

**Main discovery and search service.**

**Key Methods:**

```typescript
// Full-text search with optional filters
async search(query: string, {
  category?: string;
  city?: string;
  minRating?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}): Promise<ProviderSearchResult[]>

// Find nearby providers by geolocation
async findNearby(lat: number, lng: number, {
  radiusKm?: number;
  category?: string;
  limit?: number;
}): Promise<ProviderWithDistance[]>

// Get provider details with full profile
async getProvider(providerId: string): Promise<ProviderDetail>

// Get ratings and reviews
async getProviderReviews(providerId: string, {
  limit?: number;
  offset?: number;
  sortBy?: "recent" | "highest" | "lowest";
}): Promise<ProviderRating[]>

// Save/unsave provider
async saveProvider(customerId: string, providerId: string): Promise<void>
async unsaveProvider(customerId: string, providerId: string): Promise<void>

// Get saved providers list
async getSavedProviders(customerId: string, {
  limit?: number;
  offset?: number;
}): Promise<SavedProvider[]>
```

**Search Algorithm:**

1. Parse query against provider `businessName`, category, and subcategories
2. Apply category filter if user specified service type
3. Filter by user location + provider's service area radius
4. Score results by: availability, rating, distance, response rate, business name relevance
5. Rank by combined score (higher ratings and closer distance = higher rank)
6. Return paginated results with provider name, rating, and distance visible

#### `geolocation.service.ts`

**Distance and location-based queries.**

```typescript
// Calculate distance between two coordinates
calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number

// Check if provider serves a given location
isWithinServiceArea(
  providerLocation: { lat: number; lng: number },
  serviceRadius: number,
  targetLocation: { lat: number; lng: number }
): boolean

// Find providers within radius
async findProvidersInRadius(
  lat: number,
  lng: number,
  radiusKm: number,
  category?: string
): Promise<ProviderWithDistance[]>
```

---

## Setup & Configuration

### Backend Configuration

#### 1. Environment Variables

Add to `.env.local`:

```bash
# Geolocation API (optional; for reverse geocoding)
GOOGLE_MAPS_API_KEY=<your-key>

# Redis for caching search results
UPSTASH_REDIS_REST_URL=https://<your-redis-endpoint>
UPSTASH_REDIS_REST_TOKEN=<your-token>

# Database
DATABASE_URL=<your-database-url>

# Mobile API settings
PROVIDER_SEARCH_CACHE_TTL=3600 # 1 hour
PROVIDER_NEARBY_LIMIT=50 # max results
SEARCH_RESULT_LIMIT=100
```

#### 2. Database Migrations

Ensure provider discovery tables exist:

```sql
-- Providers table
CREATE TABLE IF NOT EXISTS Provider (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  businessName TEXT NOT NULL UNIQUE, -- Provider's business name (searchable, required)
  category TEXT NOT NULL, -- Service category
  subcategories TEXT[],
  address JSONB NOT NULL, -- {street, city, province, zipCode, lat, lng}
  serviceAreaRadius NUMERIC DEFAULT 25,
  serviceAreas TEXT[],
  displayPhone TEXT,
  email TEXT,
  website TEXT,
  isPublished BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category_published (category, isPublished),
  INDEX idx_location (address->>'lat', address->>'lng'),
  INDEX idx_businessName_search (businessName) -- For provider name search
);

-- Provider Profiles table
CREATE TABLE IF NOT EXISTS ProviderProfile (
  id TEXT PRIMARY KEY,
  providerId TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar TEXT,
  yearsExperience NUMERIC,
  certifications JSONB,
  skills JSONB,
  portfolioItems JSONB,
  avgRating NUMERIC DEFAULT 0,
  totalReviews INT DEFAULT 0,
  responseRatePercent NUMERIC DEFAULT 100,
  avgResponseTimeMinutes INT DEFAULT 120,
  hourlyRate NUMERIC,
  completedJobs INT DEFAULT 0,
  acceptanceRatePercent NUMERIC DEFAULT 100,
  availabilityStatus TEXT DEFAULT 'available',
  lastActiveAt TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (providerId) REFERENCES Provider(id) ON DELETE CASCADE,
  INDEX idx_avgRating_completedJobs (avgRating DESC, completedJobs DESC)
);

-- Ratings & Reviews table
CREATE TABLE IF NOT EXISTS ProviderRating (
  id TEXT PRIMARY KEY,
  providerId TEXT NOT NULL,
  customerId TEXT NOT NULL,
  jobId TEXT NOT NULL,
  rating NUMERIC NOT NULL,
  title TEXT,
  comment TEXT,
  tags TEXT[],
  providerResponse JSONB, -- {comment, respondedAt}
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (providerId) REFERENCES Provider(id) ON DELETE CASCADE,
  FOREIGN KEY (customerId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (jobId) REFERENCES Job(id) ON DELETE CASCADE,
  INDEX idx_providerId_createdAt (providerId, createdAt DESC),
  INDEX idx_rating (rating DESC)
);

-- Saved Providers table
CREATE TABLE IF NOT EXISTS SavedProvider (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  notes TEXT,
  savedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (providerId) REFERENCES Provider(id) ON DELETE CASCADE,
  UNIQUE KEY unique_customer_provider (customerId, providerId),
  INDEX idx_customerId (customerId)
);

-- Full-text search index for provider name, category, and skills
CREATE INDEX idx_provider_search ON Provider
USING GIN(to_tsvector('english', businessName || ' ' || category || ' ' || array_to_string(subcategories, ' ')));

-- Additional search index for exact business name matching
CREATE INDEX idx_businessName_lower ON Provider (LOWER(businessName));
```

#### 3. Create API Endpoints

Create these route files:

- `src/app/api/providers/search/route.ts`
- `src/app/api/providers/nearby/route.ts`
- `src/app/api/providers/[id]/route.ts`
- `src/app/api/providers/[id]/reviews/route.ts`
- `src/app/api/providers/saved/route.ts`

---

## Mobile Implementation

### For Expo-Based React Native Apps

#### 1. Install Dependencies

```bash
npm install expo-location axios zustand
# or
yarn add expo-location axios zustand
```

#### 2. Set Up Location Permissions

```typescript
import * as Location from "expo-location";

async function requestLocationPermission() {
  const { status: foregroundStatus } =
    await Location.requestForegroundPermissionsAsync();

  if (foregroundStatus !== "granted") {
    console.warn("Permission to access location was denied");
    return false;
  }

  // Optional: request background location for background updates
  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();

  return true;
}

async function getCurrentLocation() {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch (error) {
    console.error("Error getting location:", error);
    return null;
  }
}
```

#### 3. Create Provider Discovery Hook

```typescript
import { useEffect, useState, useCallback } from "react";
import * as Location from "expo-location";
import axios from "axios";

interface Provider {
  id: string;
  businessName: string;
  category: string;
  avgRating: number;
  totalReviews: number;
  hourlyRate?: number;
  distance?: number; // km
  availabilityStatus: "available" | "busy" | "unavailable";
  avatar?: string;
  address: {
    city: string;
    province: string;
  };
}

interface UseProviderDiscoveryOptions {
  category?: string;
  city?: string;
  radiusKm?: number;
}

export function useProviderDiscovery(
  options: UseProviderDiscoveryOptions = {},
) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  // Request and get current location
  const initializeLocation = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setError("Location permission denied");
      return;
    }

    const currentLocation = await getCurrentLocation();
    if (currentLocation) {
      setLocation(currentLocation);
    }
  }, []);

  // Search providers
  const searchProviders = useCallback(
    async (query: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          q: query,
          ...options,
        };

        const response = await axios.get("/api/providers/search", {
          params,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        setProviders(response.data.providers);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to search providers");
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  // Find nearby providers (geo-based)
  const findNearby = useCallback(async () => {
    if (!location) {
      setError("Location not available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/providers/nearby", {
        params: {
          lat: location.lat,
          lng: location.lng,
          radiusKm: options.radiusKm || 25,
          category: options.category,
          limit: 50,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      setProviders(response.data.providers);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load nearby providers",
      );
    } finally {
      setLoading(false);
    }
  }, [location, options]);

  // Initialize on mount
  useEffect(() => {
    initializeLocation();
  }, [initializeLocation]);

  return {
    providers,
    loading,
    error,
    location,
    searchProviders,
    findNearby,
    initializeLocation,
  };
}
```

#### 4. Provider Search Screen Component

```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProviderDiscovery } from '@/hooks/useProviderDiscovery';
import ProviderCard from '@/components/ProviderCard';

interface ProviderSearchScreenProps {
  category?: string;
  onSelectProvider?: (providerId: string) => void;
}

export default function ProviderSearchScreen({
  category,
  onSelectProvider,
}: ProviderSearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    minRating: 0,
    maxDistance: undefined as number | undefined,
  });

  const { providers, loading, error, searchProviders, findNearby } =
    useProviderDiscovery({ category });

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      // Search by provider name, category, or service type
      searchProviders(searchQuery);
    }
  }, [searchQuery, searchProviders]);

  const handleNearbySearch = useCallback(() => {
    findNearby();
  }, [findNearby]);

  const handleSelectProvider = (providerId: string) => {
    onSelectProvider?.(providerId);
  };

  // Apply filters to providers
  const filteredProviders = providers.filter(
    (provider) =>
      provider.avgRating >= filters.minRating &&
      (!filters.maxDistance ||
        provider.distance === undefined ||
        provider.distance <= filters.maxDistance)
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Search & Filter Header */}
      <View
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        }}
      >
        {/* Hero Section */}
        <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12, color: '#000' }}>
          Find Providers
        </Text>

        {/* Search Input Row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {/* Search input with icon */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 8,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <Ionicons name="search" size={16} color="#999" />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 8,
                paddingVertical: 10,
                fontSize: 14,
              }}
              placeholder="Search by provider name…"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
          </View>

          {/* Search Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: 14,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={handleSearch}
            disabled={loading}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
              {loading ? '...' : 'Search'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nearby Providers Button (full width) */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: '#34C759',
            paddingVertical: 10,
            borderRadius: 8,
          }}
          onPress={handleNearbySearch}
          disabled={loading}
        >
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
            {loading ? 'Finding nearby...' : 'Find Nearby Providers'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error && (
        <View style={{ padding: 16, backgroundColor: '#FFE5E5' }}>
          <Text style={{ color: '#D32F2F', fontWeight: '500' }}>{error}</Text>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 12, color: '#999' }}>Searching providers...</Text>
        </View>
      )}

      {/* Empty States */}
      {!loading && filteredProviders.length === 0 && searchQuery === '' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          <Ionicons name="search" size={48} color="#d1d5db" />
          <Text style={{ color: '#999', fontSize: 16, marginTop: 12, fontWeight: '500' }}>
            Search or tap "Find Nearby" to get started
          </Text>
        </View>
      )}

      {!loading && filteredProviders.length === 0 && searchQuery !== '' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          <Ionicons name="close-circle" size={48} color="#d1d5db" />
          <Text style={{ color: '#999', fontSize: 16, marginTop: 12, fontWeight: '500' }}>
            No providers found for "{searchQuery}"
          </Text>
          <Text style={{ color: '#bbb', fontSize: 13, marginTop: 4 }}>
            Try a different name or service type
          </Text>
        </View>
      )}

      {/* Providers Grid */}
      {!loading && filteredProviders.length > 0 && (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() => handleSelectProvider(item.id)}
            />
          )}
          contentContainerStyle={{ padding: 12 }}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          numColumns={1}
        />
      )}
    </View>
  );
}
```

````

#### 5. Provider Card Component (React Native Implementation)

```typescript
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProviderCardProps {
  provider: {
    id: string;
    businessName: string; // Display as card title
    avatar?: string; // Provider's profile photo
    bio?: string; // Professional bio (max 2 lines)
    skills?: Array<{ skill: string; yearsExperience?: number }>;
    yearsExperience: number; // Total years in industry
    hourlyRate?: number; // Rate in PHP
    availabilityStatus: 'available' | 'busy' | 'unavailable';
    city: string; // Location for card header
  };
  onPress?: () => void; // Navigate to provider detail
}

export default function ProviderCard({ provider, onPress }: ProviderCardProps) {
  const getStatusIcon = () => {
    if (provider.availabilityStatus === 'available') {
      return <Ionicons name="checkmark-circle" size={16} color="#34C759" />;
    }
    return null;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header: Avatar, Business Name, City, Availability Status */}
      <View style={styles.header}>
        {provider.avatar ? (
          <Image
            source={{ uri: provider.avatar }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Text style={styles.avatarInitial}>
              {provider.businessName[0]?.toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.headerContent}>
          {/* Provider Business Name - Main Title */}
          <Text style={styles.businessName} numberOfLines={1}>
            {provider.businessName}
          </Text>
          {/* City with map pin icon */}
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={12} color="#999" />
            <Text style={styles.city} numberOfLines={1}>
              {provider.city}
            </Text>
          </View>
        </View>

        {/* Status Indicator (green checkmark if available) */}
        {getStatusIcon()}
      </View>

      {/* Bio Section (2-line max, italic) */}
      {provider.bio && (
        <Text style={styles.bio} numberOfLines={2}>
          {provider.bio}
        </Text>
      )}

      {/* Skills Section (max 3 skills + "+N more" badge) */}
      {provider.skills && provider.skills.length > 0 && (
        <View style={styles.skillsContainer}>
          {provider.skills.slice(0, 3).map((skill) => (
            <View key={skill.skill} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill.skill}</Text>
            </View>
          ))}
          {provider.skills.length > 3 && (
            <View style={styles.skillBadge}>
              <Text style={styles.skillText}>+{provider.skills.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Footer: Years Experience, Hourly Rate, View Profile CTA */}
      <View style={styles.footer}>
        {provider.yearsExperience > 0 && (
          <Text style={styles.experience}>
            {provider.yearsExperience}yr{provider.yearsExperience !== 1 ? 's' : ''} exp
          </Text>
        )}

        {provider.hourlyRate && (
          <Text style={styles.price}>
            ₱{provider.hourlyRate.toLocaleString()}/hr
          </Text>
        )}

        <View style={styles.viewProfileLink}>
          <Text style={styles.viewProfileText}>View Profile</Text>
          <Ionicons name="arrow-forward" size={12} color="#007AFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Header: Avatar + Name/City + Status Icon
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  headerContent: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700', // Bold for prominence
    color: '#000',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  city: {
    fontSize: 12,
    color: '#666',
  },
  // Bio Section (2-line max, italic)
  bio: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  // Skills Section (gray badges)
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  skillText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  // Footer: Experience + Rate + View Profile CTA
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  experience: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  viewProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
});
````

---

## API Reference

### Search Providers

**Endpoint:** `GET /api/providers/search`

**Implementation:** [src/app/api/providers/search/route.ts](src/app/api/providers/search/route.ts)

**Query Parameters:**

| Parameter | Type   | Required | Default | Max | Description                                                     |
| --------- | ------ | -------- | ------- | --- | --------------------------------------------------------------- |
| `q`       | string | No       | ""      | —   | Search by provider business name (case-insensitive regex match) |
| `skill`   | string | No       | ""      | —   | Filter by specific skill (exact match on skill array)           |
| `page`    | number | No       | 1       | —   | Page number for pagination                                      |
| `limit`   | number | No       | 24      | 100 | Results per page (max 100)                                      |

**Search Behavior:**

- Searches provider **business names** from User model (case-insensitive)
- Filters by provider profile skill if skill parameter provided
- Only returns approved, non-suspended providers
- Sorts by most recently updated first (`updatedAt DESC`)
- Includes top 20 most common skills for sidebar filtering

**Implementation Details:**

```typescript
// Filter logic in endpoint
const profileFilter = { "skills.skill": skill }; // If skill provided
const populateMatch = {
  role: "provider",
  approvalStatus: "approved",
  isSuspended: { $ne: true },
  isDeleted: { $ne: true },
  name: { $regex: search, $options: "i" }, // Search in User.name
};
```

**Example Request:**

```
GET /api/providers/search?q=plumbing&skill=Pipe+Repair&page=1&limit=24
```

**Response:**

```json
{
  "success": true,
  "providers": [
    {
      "_id": "provider_123",
      "name": "John's Plumbing Services",
      "avatar": "https://...",
      "bio": "Professional plumbing with 15+ years experience",
      "skills": [
        { "skill": "Pipe Repair", "yearsExperience": 15 },
        { "skill": "Water Heater", "yearsExperience": 12 }
      ],
      "city": "Manila",
      "yearsExperience": 15,
      "hourlyRate": 500,
      "availabilityStatus": "available"
    }
  ],
  "total": 345,
  "page": 1,
  "pageSize": 24,
  "topSkills": [
    "Plumbing",
    "Electrical Work",
    "Carpentry",
    "House Cleaning",
    "Plumbing Maintenance"
  ]
}
```

**Provider Fields in Response:**

| Field                | Type           | Description                                                                        |
| -------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `_id`                | string         | Provider's unique ID (from ProviderProfile.\_id)                                   |
| `name`               | string         | **Provider's business name** (from User.name) — primary display identifier on card |
| `avatar`             | string \| null | Provider's profile photo URL (from User.avatar)                                    |
| `bio`                | string         | Provider's professional biography (max 2 lines on card)                            |
| `skills`             | array          | Array of skill objects: `{ skill: string, yearsExperience: number }`               |
| `city`               | string         | Primary service area/city (from first serviceArea address)                         |
| `yearsExperience`    | number         | Total years of experience in their field                                           |
| `hourlyRate`         | number \| null | Hourly rate in PHP                                                                 |
| `availabilityStatus` | string         | Current status: "available", "busy", or "unavailable"                              |

**Top-Level Response Fields:**

- `success` — Boolean indicating successful request
- `providers` — Array of provider objects (see Provider Fields table above)
- `total` — Total count of providers matching filters (for pagination calculation)
- `page` — Current page number requested
- `pageSize` — Number of results returned (respects limit parameter)
- `topSkills` — Top 20 most common skills across all providers (for sidebar/filter UI)

**Error Responses:**

| Status | Response                                                                       | Description                        |
| ------ | ------------------------------------------------------------------------------ | ---------------------------------- |
| 500    | `{ "success": false, "message": "Failed to fetch providers", "error": "..." }` | Database connection or query error |

**Used By:**

- Web: [/src/app/providers/page.tsx](../../src/app/providers/page.tsx) — Public providers directory page
- Mobile: Provider discovery search screen components

### Find Nearby Providers

**Endpoint:** `GET /api/providers/nearby`

**Query Parameters:**

| Parameter  | Type   | Required | Description                               |
| ---------- | ------ | -------- | ----------------------------------------- |
| `lat`      | number | Yes      | User latitude                             |
| `lng`      | number | Yes      | User longitude                            |
| `radiusKm` | number | No       | Search radius in kilometers (default: 25) |
| `category` | string | No       | Filter by service category                |
| `limit`    | number | No       | Maximum results (default: 50, max: 100)   |

**Response:**

```json
{
  "success": true,
  "providers": [
    {
      "id": "provider_456",
      "businessName": "Clean Home Services", // Provider business name shown to customers
      "category": "cleaning",
      "avatar": "https://...",
      "avgRating": 4.5,
      "totalReviews": 87,
      "hourlyRate": 300,
      "distance": 2.3,
      "availabilityStatus": "available",
      "address": {
        "city": "Quezon City",
        "province": "Metro Manila"
      }
    }
  ],
  "total": 23,
  "userLocation": {
    "lat": 14.5995,
    "lng": 121.0437
  }
}
```

### Get Provider Details

**Endpoint:** `GET /api/providers/{id}`

**Response:**

```json
{
  "success": true,
  "provider": {
    "id": "provider_789",
    "businessName": "Premium Repair Services", // Provider's business name (primary identifier)
    "category": "appliances",
    "subcategories": ["refrigerator", "washing_machine", "oven"],
    "bio": "Trusted appliance repair specialist with 12 years of experience...",
    "avatar": "https://...",
    "website": "https://premiumrepair.ph",
    "displayPhone": "+63-2-1234-5678",
    "email": "info@premiumrepair.ph",

    "address": {
      "street": "123 Main St",
      "city": "Manila",
      "province": "Metro Manila",
      "zipCode": "1000",
      "lat": 14.5735,
      "lng": 121.0194
    },

    "serviceAreaRadius": 30,
    "serviceAreas": ["Manila", "Makati", "Pasay"],

    "profile": {
      "yearsExperience": 12,
      "avgRating": 4.7,
      "totalReviews": 256,
      "responseRatePercent": 98,
      "avgResponseTimeMinutes": 15,
      "completedJobs": 512,
      "acceptanceRatePercent": 96,
      "availabilityStatus": "available",
      "lastActiveAt": "2026-04-18T10:30:00Z"
    },

    "hourlyRate": 450,
    "certifications": [
      {
        "name": "Certified Appliance Technician",
        "issuer": "TESDA",
        "issuedDate": "2020-06-15",
        "expiryDate": "2026-06-15"
      }
    ],
    "skills": [
      { "name": "Refrigerator Repair", "yearsExperience": 10 },
      { "name": "Washing Machine Repair", "yearsExperience": 12 },
      { "name": "Oven Repair", "yearsExperience": 8 }
    ],
    "portfolioItems": [
      {
        "id": "portfolio_1",
        "title": "Complex Refrigerator Repair",
        "description": "Successfully diagnosed and repaired compressor issue",
        "images": ["https://..."],
        "completedDate": "2026-03-20"
      }
    ]
  }
}
```

### Get Provider Reviews

**Endpoint:** `GET /api/providers/{id}/reviews`

**Query Parameters:**

| Parameter | Type   | Required | Description                                                   |
| --------- | ------ | -------- | ------------------------------------------------------------- |
| `limit`   | number | No       | Results per page (default: 10, max: 50)                       |
| `offset`  | number | No       | Pagination offset (default: 0)                                |
| `sortBy`  | string | No       | Sort order: `recent`, `highest`, `lowest` (default: `recent`) |

**Response:**

```json
{
  "success": true,
  "reviews": [
    {
      "id": "review_1",
      "customerId": "cust_123",
      "jobId": "job_456",
      "rating": 5,
      "title": "Excellent service!",
      "comment": "Very professional and fixed my refrigerator quickly.",
      "tags": ["professional", "punctual", "quality_work"],
      "createdAt": "2026-04-15T14:20:00Z",
      "providerResponse": {
        "comment": "Thank you for choosing us! We look forward to serving you again.",
        "respondedAt": "2026-04-15T18:45:00Z"
      }
    }
  ],
  "total": 256,
  "limit": 10,
  "offset": 0,
  "averageRating": 4.7
}
```

### Save Provider

**Endpoint:** `POST /api/providers/{id}/save`

**Request Body:**

```json
{
  "notes": "Great service, would like to use again"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Provider saved successfully",
  "savedProvider": {
    "id": "saved_789",
    "customerId": "cust_123",
    "providerId": "provider_789",
    "notes": "Great service, would like to use again",
    "savedAt": "2026-04-18T10:30:00Z"
  }
}
```

### Unsave Provider

**Endpoint:** `DELETE /api/providers/{id}/save`

**Response:**

```json
{
  "success": true,
  "message": "Provider removed from saved list"
}
```

### Get Saved Providers

**Endpoint:** `GET /api/providers/saved`

**Query Parameters:**

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `limit`   | number | No       | Results per page (default: 20) |
| `offset`  | number | No       | Pagination offset (default: 0) |

**Response:**

```json
{
  "success": true,
  "savedProviders": [
    {
      "id": "saved_789",
      "provider": {
        "id": "provider_789",
        "businessName": "Premium Repair Services", // Provider business name for saved providers list
        "category": "appliances",
        "avgRating": 4.7,
        "totalReviews": 256,
        "hourlyRate": 450,
        "distance": 5.2,
        "availabilityStatus": "available"
      },
      "notes": "Great service, would like to use again",
      "savedAt": "2026-04-18T10:30:00Z"
    }
  ],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

---

## Search & Filtering

### Advanced Filtering

Implement comprehensive filtering in the UI:

```typescript
interface ProviderFilters {
  category?: string; // Service category
  minRating?: number; // 1-5 stars
  maxPrice?: number; // Max hourly rate in PHP
  maxDistance?: number; // km from user location
  availabilityOnly?: boolean; // Show only available providers
  certifiedOnly?: boolean; // Show only certified providers
  minCompletedJobs?: number; // Minimum jobs completed
  responseTimeMax?: number; // Max response time in minutes
}

// Apply filters to provider list (client-side after API fetch)
function applyFilters(
  providers: Provider[],
  filters: ProviderFilters,
): Provider[] {
  return providers.filter((provider) => {
    if (filters.category && provider.category !== filters.category)
      return false;
    if (filters.minRating && provider.avgRating < filters.minRating)
      return false;
    if (
      filters.maxPrice &&
      provider.hourlyRate &&
      provider.hourlyRate > filters.maxPrice
    )
      return false;
    if (
      filters.maxDistance &&
      provider.distance &&
      provider.distance > filters.maxDistance
    )
      return false;
    if (filters.availabilityOnly && provider.availabilityStatus !== "available")
      return false;
    if (filters.certifiedOnly && provider.certifications?.length === 0)
      return false;
    if (
      filters.minCompletedJobs &&
      provider.completedJobs < filters.minCompletedJobs
    )
      return false;
    if (
      filters.responseTimeMax &&
      provider.avgResponseTimeMinutes > filters.responseTimeMax
    )
      return false;

    return true;
  });
}
```

**Filter Application Flow:**

1. **Initial Search** — User enters provider name or category (api call)
2. **Client-Side Filtering** — Apply minRating, maxDistance, availability filters (instant)
3. **Skill Filtering** — Users can tap skill tags to filter by specific skills
4. **Reset Filters** — Show all results again or modify search query

---

## Provider Cards & Display

### Provider Card Layout (Search Results)

Each provider card displays key information in a structured grid:

```
┌─────────────────────────────────┐
│  [Avatar]  Name        [Status] │  Header: Avatar, name, city, availability
│           City                   │
├─────────────────────────────────┤
│  Professional bio text...        │  Bio: 2-line clamp
├─────────────────────────────────┤
│  [Skill1] [Skill2] [Skill3] +2   │  Skills: 3 displayed + count
├─────────────────────────────────┤
│  5yrs exp    ₱500/hr  View →    │  Footer: experience, rate, action
└─────────────────────────────────┘
```

### Card Header (Avatar + Name + City + Status)

**Elements:**

- **Avatar**: 56px circular image with fallback to business name initial
- **Name**: Provider's business name, bold, truncated if too long
- **City**: Location with map pin icon, truncated with ellipsis
- **Status Indicator**: Green checkmark icon if `availabilityStatus === "available"`

**Styling:**

- White background with subtle gray border
- Rounded corners (16px)
- Hover/press effect: shadow increase, border color change
- Responsive grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)

### Card Body (Bio)

- **Bio Text**: Provider's professional bio, max 2 lines (line-clamp), italicized, muted color
- **Purpose**: Quick introduction to provider's expertise and background
- **Fallback**: If no bio provided, field is hidden

### Card Skills Section

- **Display**: Up to 3 skills shown as gray badges/tags
- **Overflow**: If provider has more than 3 skills, show "+N more" badge
- **Format**: `[Skill1] [Skill2] [Skill3] +2`
- **Styling**: Light gray background (f3f4f6), small font (11px), rounded pill shape
- **Interactivity**: Tapping a skill filters to similar providers

### Card Footer (Experience + Rate + CTA)

**Three-column layout:**

1. **Experience**: "5yrs exp" if `yearsExperience > 0`, muted text, left-aligned
2. **Hourly Rate**: "₱500/hr" if rate available, bold, primary blue, center
3. **View Profile CTA**: "View Profile →" link, bold blue, arrow icon with hover animation, right-aligned

### Display Variations

**Search Results Card** (shown above):

- Compact, scannable format
- 3-column grid layout on web, single column on mobile
- Quick visual hierarchy: avatar → name → skills → rate
- Touch-friendly sizing (minimum 44px tap targets)
- Cards have shadow on hover

**Detail View Card** (full provider profile page):

- Avatar + larger header image/banner
- Complete bio (full text, not clamped)
- All skills + certifications with badges
- Portfolio items section with images
- Full ratings/reviews section with individual review cards
- Service areas displayed on interactive map
- Response time metrics + acceptance rate percentage

---

## Geolocation & Distance

### Distance Calculation

Use Haversine formula for accurate distance:

```typescript
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

---

## Ratings & Reviews

### Display Ratings

Show aggregate statistics:

```typescript
interface RatingStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number; // count of 5-star reviews
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// Example: 4.7 out of 5 (256 reviews)
// ★★★★★ 80% (204)
// ★★★★☆ 15% (38)
// ★★★☆☆ 3% (8)
// ★★☆☆☆ 1% (3)
// ★☆☆☆☆ 1% (3)
```

### Review Tags

Common tags for filtering/analysis:

- Reliability: "reliable", "punctual", "professional"
- Quality: "quality_work", "thorough", "detailed"
- Communication: "responsive", "communicative", "clear_explanations"
- Value: "good_value", "fair_price", "worth_it"

---

## Real-Time Provider Status

### Availability Status Updates

Implement polling or WebSocket for real-time updates:

```typescript
// Poll every 30 seconds (adjust as needed)
const pollInterval = setInterval(async () => {
  const response = await fetch(`/api/providers/${providerId}/status`);
  const { availabilityStatus, lastActiveAt } = await response.json();
  updateProviderStatus(providerId, availabilityStatus, lastActiveAt);
}, 30000);
```

**Status Indicators:**

- **Available** (Green): Ready to accept new jobs
- **Busy** (Orange): Currently working, may accept
- **Unavailable** (Gray): Not accepting work

---

## Caching & Performance

### Client-Side Caching

Use Zustand for state management with caching:

```typescript
import { create } from "zustand";

interface ProviderStore {
  providers: Map<string, Provider>;
  cachedAt: Date | null;

  addProviders: (providers: Provider[]) => void;
  getProvider: (id: string) => Provider | undefined;
  clearCache: () => void;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: new Map(),
  cachedAt: null,

  addProviders: (providers) => {
    set((state) => {
      const newMap = new Map(state.providers);
      providers.forEach((p) => newMap.set(p.id, p));
      return { providers: newMap, cachedAt: new Date() };
    });
  },

  getProvider: (id) => {
    const provider = get().providers.get(id);

    // Cache for 5 minutes
    if (provider && get().cachedAt) {
      const ageMs = Date.now() - get().cachedAt!.getTime();
      if (ageMs < 5 * 60 * 1000) {
        return provider;
      }
    }

    return undefined;
  },

  clearCache: () => {
    set({ providers: new Map(), cachedAt: null });
  },
}));
```

### Server-Side Caching

Cache search results in Redis with 1-hour TTL:

```typescript
// Key format: "provider:search:{query}:{category}:{city}"
const cacheKey = `provider:search:${query}:${category || "all"}:${city || "all"}`;

const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// Fetch from database...
await redis.setex(cacheKey, 3600, JSON.stringify(results)); // 1 hour TTL
```

---

## Best Practices

### Mobile UX Patterns

1. **Search First** — Show search UI on load, let users input query or tap "Nearby"
2. **Progressive Loading** — Show partial results immediately, load more in background
3. **Distance Display** — Show distance only when location available
4. **Pagination** — Use pagination for large result sets (50+ providers)
5. **Saved Providers** — Quick access from profile tab
6. **Provider Comparisons** — Allow users to compare 2-3 providers side-by-side

### Performance Optimization

1. **Lazy Load Reviews** — Load full reviews only on detail screen
2. **Image Optimization** — Compress/resize provider avatars
3. **Request Debouncing** — Debounce search input (300-500ms)
4. **Batch Requests** — Request multiple provider details in single API call when possible
5. **Skeleton Loaders** — Show content placeholders while loading

### Error Handling

```typescript
// Handle network errors gracefully
if (!navigator.onLine) {
  showError("No internet connection. Showing cached results.");
  return useCachedResults();
}

// Fallback for location permission denied
if (locationPermissionDenied) {
  showWarning("Enable location to see nearby providers");
  return showAllProviders(); // Show without distance sorting
}

// Handle API failures
if (response.status === 500) {
  showError("Server error. Please try again later.");
  return [];
}
```

---

## Troubleshooting

### Common Issues

| Issue                         | Cause                    | Solution                                 |
| ----------------------------- | ------------------------ | ---------------------------------------- |
| "No providers found"          | Search too specific      | Broaden query, remove filters            |
| "Location not available"      | Permissions denied       | Request location permission in settings  |
| "Providers not updating"      | Stale cache              | Clear app cache or wait 1 hour           |
| "Slow search"                 | Large result set         | Filter by category or distance           |
| "Distance shows as undefined" | Location not initialized | Request location permission on app start |

### Debug Logs

Enable detailed logging:

```typescript
// Enable verbose logging for provider discovery
localStorage.setItem("debug:provider-discovery", "true");

if (localStorage.getItem("debug:provider-discovery")) {
  console.log("[PROVIDER] Search query:", query);
  console.log("[PROVIDER] Applied filters:", filters);
  console.log("[PROVIDER] API request:", requestUrl);
  console.log("[PROVIDER] Response received:", response);
  console.log("[PROVIDER] Render count:", filteredProviders.length);
}
```

### Performance Metrics

Track key metrics for monitoring:

```typescript
// Measure API response time
const startTime = performance.now();
const response = await fetch("/api/providers/search", { params });
const duration = performance.now() - startTime;
console.log(`Provider search took ${duration}ms`);

// Target: < 500ms for search
// Target: < 200ms for nearby
// Target: < 100ms for provider details
```

---

## Display Fields Reference

When rendering provider cards in search results, display these fields in this priority order:

| Field                | Component       | Required | Notes                                                  |
| -------------------- | --------------- | -------- | ------------------------------------------------------ |
| `avatar`             | Header          | No       | 56px circular image, fallback to business name initial |
| `businessName`       | Header Title    | Yes      | Provider's business/company name, bold, truncated      |
| `city`               | Header Subtitle | Yes      | Location with map pin icon                             |
| `availabilityStatus` | Header Icon     | No       | Green checkmark if "available", else hidden            |
| `bio`                | Body            | No       | Max 2 lines, italic, muted color                       |
| `skills`             | Body            | No       | Max 3 skills shown, +N badge if more                   |
| `yearsExperience`    | Footer          | No       | Format: "5yrs exp" if > 0                              |
| `hourlyRate`         | Footer          | No       | Format: "₱500/hr", bold, blue color                    |
| Link                 | Footer CTA      | Yes      | "View Profile →" navigation link                       |

**Card Sizing:**

- Width: Full available (100%)
- Height: Auto (content-dependent, ~160-200px typical)
- Spacing: 12px padding, 12px margin between cards
- Grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)

**What to Include in API Response:**
For search and nearby endpoints, return at minimum:

```typescript
{
  id: string;
  businessName: string;
  avatar?: string;
  bio?: string;
  skills?: { skill: string; yearsExperience?: number }[];
  yearsExperience: number;
  hourlyRate?: number;
  availabilityStatus: "available" | "busy" | "unavailable";
  city: string;
  distance?: number; // For nearby searches
  avgRating?: number; // Optional for detail card
  totalReviews?: number; // Optional for detail card
}
```

---

- [Mobile Auth Implementation](./MOBILE_AUTH_COMPREHENSIVE_GUIDE.md)
- [Mobile Notifications](./MOBILE_NOTIFICATIONS_IMPLEMENTATION_GUIDE.md)
- [Mobile Provider Profile](./mobile-provider-profile-api.md)
- [API Reference](./api-reference.md)

---

**Questions?** Refer to the Architecture section or create a GitHub issue for troubleshooting help.
