import { analyzeCalldata } from "./engine.js";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: analyzeCalldata(data.calldata, data.options) });
  } catch (e) {
    self.postMessage({
      error: e.message || "The payload could not be inspected.",
    });
  }
};
