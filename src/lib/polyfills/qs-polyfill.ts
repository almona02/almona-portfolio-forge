// Simple qs implementation using URLSearchParams
// This avoids circular dependency issues with the full qs library

export const parse = (str: string, options?: any) => {
  const result: Record<string, any> = {};

  // Handle query prefix
  const queryString = options?.ignoreQueryPrefix && str.startsWith('?')
    ? str.substring(1)
    : str;

  const params = new URLSearchParams(queryString);

  for (const [key, value] of params.entries()) {
    // Handle arrays
    if (result[key] !== undefined) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
};

export const stringify = (obj: Record<string, any>, _options?: any) => {
  const params = new URLSearchParams();

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  });

  return params.toString();
};

export default { parse, stringify };
