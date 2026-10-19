export function decodePayload(calldata, options, signal) {
  return new Promise((resolve, reject) => {
    let worker, timer;
    const stop = () => {
      clearTimeout(timer);
      worker?.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const fail = (message) => {
      stop();
      reject(new Error(message));
    };
    const abort = () => fail("Inspection cancelled.");
    if (signal?.aborted) return abort();
    try {
      worker = new Worker(new URL("./decode.worker.js", import.meta.url), {
        type: "module",
      });
    } catch {
      return fail(
        "The browser could not start the payload decoder. Try a current browser.",
      );
    }
    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(
      () => fail("This payload took too long to decode. Try a smaller input."),
      8000,
    );
    worker.onmessage = ({ data }) => {
      stop();
      data.error ? reject(new Error(data.error)) : resolve(data.result);
    };
    worker.onerror = () =>
      fail("The payload decoder could not complete this inspection.");
    worker.postMessage({ calldata, options });
  });
}
