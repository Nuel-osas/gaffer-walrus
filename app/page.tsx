import { isProvisioned, accountExplorerUrl } from "@/lib/memwal";
import { hasModelKey } from "@/lib/model";
import { resolveNetwork } from "@/lib/networks";
import Gaffer from "@/components/Gaffer";

export default function Home() {
  return (
    <Gaffer
      provisioned={isProvisioned()}
      hasModel={hasModelKey()}
      accountUrl={accountExplorerUrl()}
      network={resolveNetwork()}
    />
  );
}
