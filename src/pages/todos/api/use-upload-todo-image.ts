import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import imageCompression from "browser-image-compression";

import { compressImage } from "@/shared/lib/compress-image.client";

import { uploadTodoImageFn } from "./todos.functions";

type UseUploadTodoImageOptions = Omit<
  UseMutationOptions<{ tempKey: string }, Error, File>,
  "mutationFn"
>;

function useUploadTodoImage(options: UseUploadTodoImageOptions = {}) {
  const uploadTodoImage = useServerFn(uploadTodoImageFn);

  return useMutation({
    ...options,
    mutationFn: async (rawImage) => {
      const file = await compressImage(rawImage);
      const base64 = await imageCompression.getDataUrlFromFile(file);
      return await uploadTodoImage({ data: { base64, contentType: "image/webp" } });
    },
  });
}

export { useUploadTodoImage, type UseUploadTodoImageOptions };
