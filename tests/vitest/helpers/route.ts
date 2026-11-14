function getRouteOption(route: { options: unknown }, key: string): unknown {
  const options = route.options as Record<string, unknown>;
  const value = options[key];
  if (value === undefined) {
    throw new TypeError(`Expected ${key} to be defined`);
  }
  return value;
}

export { getRouteOption };
