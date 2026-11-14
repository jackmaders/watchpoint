import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
} from "react";

interface UseControllableStateParams<TValue> {
  defaultProp?: TValue | undefined;
  onChange?: ((state: TValue) => void) | undefined;
  prop?: TValue | undefined;
}

type UseUncontrolledStateParams<TValue> = Omit<UseControllableStateParams<TValue>, "prop">;

function useControllableState<TValue>({
  defaultProp,
  onChange,
  prop,
}: UseControllableStateParams<TValue>): readonly [
  TValue | undefined,
  Dispatch<SetStateAction<TValue | undefined>>,
] {
  const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState({
    defaultProp,
    onChange,
  });
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledProp;
  const handleChange = useCallbackRef(onChange);

  const setValue: Dispatch<SetStateAction<TValue | undefined>> = useCallback(
    (nextValue) => {
      if (isControlled) {
        const next = isFunction<TValue>(nextValue) ? nextValue(prop) : nextValue;
        if (next !== undefined && next !== prop) {
          handleChange(next);
        }
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, setUncontrolledProp, handleChange],
  );

  return [value, setValue] as const;
}

function useUncontrolledState<TValue>({
  defaultProp,
  onChange,
}: UseUncontrolledStateParams<TValue>): readonly [
  TValue | undefined,
  Dispatch<SetStateAction<TValue | undefined>>,
] {
  const [value, setValue] = useState(defaultProp);
  const prevValueRef = useRef(value);
  const handleChange = useCallbackRef(onChange);

  useEffect(() => {
    if (value !== undefined && prevValueRef.current !== value) {
      handleChange(value);
      prevValueRef.current = value;
    }
  }, [value, handleChange]);

  return [value, setValue] as const;
}

function useCallbackRef<TValue>(
  handler: ((state: TValue) => void) | undefined,
): (state: TValue) => void {
  const handlerRef = useRef(handler);

  useInsertionEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((state: TValue): void => {
    handlerRef.current?.(state);
  }, []);
}

function isFunction<TValue>(
  value: unknown,
): value is (prevState: TValue | undefined) => TValue | undefined {
  return typeof value === "function";
}

export { useControllableState };
