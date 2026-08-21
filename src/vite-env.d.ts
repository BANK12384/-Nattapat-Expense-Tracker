/// <reference types="vite/client" />

interface Window {
  __firebase_config?: string;
  __app_id?: string;
  __initial_auth_token?: string;
}

declare var __firebase_config: string | undefined;
declare var __app_id: string | undefined;
declare var __initial_auth_token: string | undefined;
