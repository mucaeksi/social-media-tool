import { prepareCloudMedia } from "./prepareMedia.ts";
self.onmessage = async (event) => {
  try {
    const { file, platforms, options } = event.data;
    const form = await prepareCloudMedia(file, platforms, {
      ...options,
      worker: false,
      onProgress: (done: number, total: number) =>
        self.postMessage({ type: "progress", done, total }),
    });
    self.postMessage({
      type: "result",
      entries: Array.from(form.entries()).map(([key, blob]) => ({ key, blob })),
    });
  } catch (e) {
    self.postMessage({ type: "error", message: (e as Error).message });
  }
};
