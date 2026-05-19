'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function WebViewStateSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.ReactNativeWebView) {
        win.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'APP_STATE',
          isRoot: pathname === '/',
          isAnyModalOpen: false // Managed dynamically by main page when active
        }));
      }
    }
  }, [pathname]);

  return null;
}
