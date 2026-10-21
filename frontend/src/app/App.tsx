import { ApplicationProviders } from "./providers/ApplicationProviders";
import { AppRoutes } from "./router";
export function App() {
  return (
    <ApplicationProviders>
      <AppRoutes />
    </ApplicationProviders>
  );
}
