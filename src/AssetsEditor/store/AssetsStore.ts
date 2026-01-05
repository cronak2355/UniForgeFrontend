// src/AssetEditor/store/assetStore.ts
import { create } from 'zustand';

// Asset 인터페이스 정의
export interface Asset {
  id: string;
  name: string;
  imageData: string; // Base64 WebP
  type: 'character' | 'object' | 'tile';
  stats: {
    hp: number;
    speed: number;
    atk: number;
  };
}

// Store 상태 및 액션 타입 정의
interface AssetState {
  assets: Asset[];
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  getAsset: (id: string) => Asset | undefined;
}

// Zustand store 생성
export const useAssetStore = create<AssetState>((set, get) => ({
  // 초기 상태
  assets: [],

  // 에셋 추가
  addAsset: (asset) => {
    set((state) => ({
      assets: [...state.assets, asset],
    }));
  },

  // 에셋 삭제
  removeAsset: (id) => {
    set((state) => ({
      assets: state.assets.filter((asset) => asset.id !== id),
    }));
  },

  // 에셋 업데이트
  updateAsset: (id, updates) => {
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === id ? { ...asset, ...updates } : asset
      ),
    }));
  },

  // 에셋 조회 (get 사용)
  getAsset: (id) => {
    return get().assets.find((asset) => asset.id === id);
  },
}));