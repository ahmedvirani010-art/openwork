import App from "./app";
import { GlobalSDKProvider } from "./context/global-sdk";
import { GlobalSyncProvider } from "./context/global-sync";
import { LocalProvider } from "./context/local";
import { ServerProvider } from "./context/server";
import { PlatformAdapterProvider } from "./lib/platform";
import { UpdateBanner } from "./components/update-banner";

export default function AppEntry() {
  const defaultUrl = "http://127.0.0.1:4096";

  return (
    <PlatformAdapterProvider>
      <ServerProvider defaultUrl={defaultUrl}>
        <GlobalSDKProvider>
          <GlobalSyncProvider>
            <LocalProvider>
              <UpdateBanner />
              <App />
            </LocalProvider>
          </GlobalSyncProvider>
        </GlobalSDKProvider>
      </ServerProvider>
    </PlatformAdapterProvider>
  );
}
