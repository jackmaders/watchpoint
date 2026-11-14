import { vi } from "vite-plus/test";

const mockImagesBucket = {
  delete: vi.fn<() => Promise<void>>(),
  get: vi.fn<() => Promise<R2ObjectBody | null>>().mockResolvedValue(null),
  put: vi.fn<() => Promise<R2Object | null>>().mockResolvedValue(null),
};

function getImagesBucket() {
  return mockImagesBucket;
}
const deleteImage = vi.fn<() => Promise<void>>();
const getImage = vi.fn<() => Promise<R2ObjectBody | null>>().mockResolvedValue(null);
const putImage = vi.fn<() => Promise<void>>();

export { deleteImage, getImage, getImagesBucket, putImage };
