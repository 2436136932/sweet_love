import { useCallback, useEffect, useRef } from 'react';

function readHashParts() {
  const hash = window.location.hash || '#/home';
  const queryStart = hash.indexOf('?');
  const route = queryStart >= 0 ? hash.slice(0, queryStart) : hash;
  const params = new URLSearchParams(queryStart >= 0 ? hash.slice(queryStart + 1) : '');
  return { route: route || '#/home', params };
}

function getModalStack() {
  return readHashParts().params.getAll('modal');
}

function writeModalStack(stack: string[], replace = false) {
  const { route, params } = readHashParts();
  params.delete('modal');
  stack.forEach((modalId) => params.append('modal', modalId));

  const query = params.toString();
  const nextHash = query ? `${route}?${query}` : route;
  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;

  if (replace) {
    window.history.replaceState(null, '', nextUrl);
  } else {
    window.location.hash = nextHash;
  }
}

export function useModalHistory(modalId: string, isOpen: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const closingFromHistoryRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const stack = getModalStack();
    if (stack.includes(modalId)) return;

    pushedRef.current = true;
    writeModalStack([...stack, modalId]);
  }, [isOpen, modalId]);

  useEffect(() => {
    if (isOpen) return;
    if (closingFromHistoryRef.current) {
      closingFromHistoryRef.current = false;
      pushedRef.current = false;
      return;
    }

    const stack = getModalStack();
    if (!stack.includes(modalId)) {
      pushedRef.current = false;
      return;
    }

    const isTopModal = stack[stack.length - 1] === modalId;
    if (pushedRef.current && isTopModal) {
      pushedRef.current = false;
      window.history.back();
      return;
    }

    pushedRef.current = false;
    writeModalStack(stack.filter((item) => item !== modalId), true);
  }, [isOpen, modalId]);

  useEffect(() => {
    const handleHistoryChange = () => {
      if (!isOpen) return;
      if (getModalStack().includes(modalId)) return;

      closingFromHistoryRef.current = true;
      onClose();
    };

    window.addEventListener('hashchange', handleHistoryChange);
    window.addEventListener('popstate', handleHistoryChange);
    return () => {
      window.removeEventListener('hashchange', handleHistoryChange);
      window.removeEventListener('popstate', handleHistoryChange);
    };
  }, [isOpen, modalId, onClose]);

  return useCallback(() => {
    const stack = getModalStack();
    if (stack[stack.length - 1] === modalId) {
      window.history.back();
      return;
    }

    onClose();
    if (stack.includes(modalId)) {
      writeModalStack(stack.filter((item) => item !== modalId), true);
    }
  }, [modalId, onClose]);
}
